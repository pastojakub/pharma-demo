import { Controller, Get, Post, Body, Param, UseGuards, Request, SetMetadata, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { FabricService } from '../fabric/fabric.service';
import { SyncService } from '../sync/sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Throttle } from '@nestjs/throttler';
import { PUBLIC_MSP_ID } from '../constants/msp.constants';

import { CreateDrugDto } from '../dto/create-drug.dto';
import { RequestDrugDto } from '../dto/request-drug.dto';
import { PriceOfferDto } from '../dto/price-offer.dto';
import { ApproveOfferDto } from '../dto/approve-offer.dto';
import { FulfillOrderDto } from '../dto/fulfill-order.dto';
import { SellDrugDto } from '../dto/sell-drug.dto';
import { RejectRequestDto } from '../dto/reject-request.dto';
import { ReturnDrugDto } from '../dto/return-drug.dto';
import { BatchIdDto } from '../dto/batch-id.dto';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('drugs')
export class DrugsController {
  constructor(
    private readonly fabricService: FabricService,
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAll(@Request() req) {
    const { role, org } = req.user;
    if (role === 'regulator') return this.prisma.drug.findMany({ orderBy: { createdAt: 'desc' } });
    return this.prisma.drug.findMany({
      where: { ownerOrg: org, NOT: [{ status: 'SOLD' }, { quantity: 0 }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(@Request() req) {
    return this.prisma.orderRequest.findMany({
      where: { OR: [{ manufacturerOrg: req.user.org }, { pharmacyOrg: req.user.org }] },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post()
  async createDrug(@Request() req, @Body() body: CreateDrugDto) {
    return this.fabricService.initBatch(
      req.user.userId, body.id, body.drugID, body.name,
      body.manufacturer, body.expiryDate, body.quantity, body.unit, body.price, body.metadata,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('request')
  async requestDrug(@Request() req, @Body() body: RequestDrugDto) {
    return this.fabricService.requestDrug(
      req.user.userId, body.requestID, body.drugID, body.name,
      body.manufacturerOrg, body.quantity, body.unit, body.fileCIDs || [],
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post('offer')
  async providePriceOffer(@Request() req, @Body() body: PriceOfferDto) {
    return this.fabricService.providePriceOffer(req.user.userId, body.requestID, body.price, body.pharmacyOrg);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('approve-offer')
  async approveOffer(@Request() req, @Body() body: ApproveOfferDto) {
    const offer = await this.prisma.priceOffer.findUnique({ where: { id: body.offerID } });
    if (!offer || offer.pharmacyOrg !== req.user.org) {
      throw new UnauthorizedException('Ponuka neexistuje alebo nie je určená pre vás.');
    }
    return this.fabricService.finalizeAgreement(req.user.userId, body.requestID);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer', 'pharmacy')
  @Post('reject-request')
  async rejectRequest(@Request() req, @Body() body: RejectRequestDto) {
    return this.fabricService.rejectRequest(req.user.userId, body.requestID, body.pharmacyOrg, body.reason);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('regulator')
  @Post('recall')
  async recallBatch(@Request() req, @Body() body: BatchIdDto) {
    return this.fabricService.emergencyRecall(req.user.userId, body.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('sell')
  async sellDrug(@Request() req, @Body() body: SellDrugDto) {
    const result = await this.fabricService.sellToConsumer(req.user.userId, body.id, body.quantity);
    await this.syncService.syncDrugWithDB(body.id);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('return')
  async returnDrug(@Request() req, @Body() body: ReturnDrugDto) {
    return this.fabricService.returnToManufacturer(req.user.userId, body.id, body.manufacturerOrg);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post('fulfill-order')
  async fulfillOrder(@Request() req, @Body() body: FulfillOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({ where: { requestId: body.requestId } });

    if (!order || order.manufacturerOrg !== req.user.org) {
      throw new UnauthorizedException('Objednávka neexistuje alebo k nej nemáte prístup.');
    }
    if (order.status !== 'APPROVED') {
      throw new BadRequestException('Objednávka musí byť v stave SCHVÁLENÁ.');
    }

    await this.prisma.orderRequest.update({
      where: { requestId: body.requestId },
      data: { status: 'PROCESSING_FULFILLMENT' },
    });

    try {
      const agreedPriceOffer = await this.prisma.priceOffer.findFirst({
        where: { batchID: body.requestId, status: 'APPROVED' },
      });

      for (const b of body.batches) {
        const resultingBatchID = await this.fabricService.transferOwnership(
          req.user.userId, b.batchID, order.pharmacyOrg, b.quantity, agreedPriceOffer?.price,
        );

        await this.prisma.fulfillment.create({
          data: { orderRequestId: order.id, batchID: resultingBatchID, quantity: b.quantity },
        });

        if (resultingBatchID !== b.batchID) {
          await this.syncService.syncDrugWithDB(b.batchID);
        }
      }

      await this.prisma.orderRequest.update({
        where: { requestId: body.requestId },
        data: { status: 'ORDERED' },
      });

      return { success: true, message: 'Objednávka bola úspešne odoslaná.' };
    } catch (err) {
      await this.prisma.orderRequest.update({
        where: { requestId: body.requestId },
        data: { status: 'APPROVED' },
      });
      throw new BadRequestException(`Fulfillment zlyhal: ${err.message}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:requestId/fulfillments')
  async getFulfillments(@Param('requestId') requestId: string) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { requestId },
      include: { fulfillments: true },
    });
    return order?.fulfillments || [];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Get('catalog/:id/pricing-summary')
  async getPricingSummary(@Param('id') id: string, @Request() req) {
    const orders = await this.prisma.orderRequest.findMany({
      where: { drugId: id, manufacturerOrg: req.user.org, status: { in: ['APPROVED', 'ORDERED', 'FULFILLED'] } },
      include: { fulfillments: true },
    });

    const requestIds = orders.map(o => o.requestId);
    const offers = await this.prisma.priceOffer.findMany({
      where: { batchID: { in: requestIds }, manufacturerOrg: req.user.org, status: 'APPROVED' },
    });

    const pharmacyMap = new Map();
    for (const order of orders) {
      const offer = offers.find(off => off.batchID === order.requestId);
      if (offer) {
        pharmacyMap.set(order.pharmacyOrg, {
          pharmacy: order.pharmacyOrg,
          price: offer.price,
          lastOrder: order.createdAt,
          totalQuantity: (pharmacyMap.get(order.pharmacyOrg)?.totalQuantity || 0) + order.quantity,
        });
      }
    }
    return Array.from(pharmacyMap.values());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('receive')
  async receiveDrug(@Request() req, @Body() body: BatchIdDto) {
    return this.fabricService.confirmDelivery(req.user.userId, body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('offers/:batchID')
  async getOffers(@Param('batchID') batchID: string, @Request() req) {
    return this.prisma.priceOffer.findMany({
      where: { batchID, OR: [{ manufacturerOrg: req.user.org }, { pharmacyOrg: req.user.org }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy', 'manufacturer')
  @Post('sync-batch')
  async syncBatch(@Request() req, @Body() body: BatchIdDto) {
    await this.syncService.syncDrugWithDB(body.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/verify-integrity')
  async verifyOrderIntegrity(@Param('id') id: string, @Request() req) {
    return this.syncService.verifyOrderIntegrity(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/sync')
  async syncOrder(@Param('id') id: string, @Request() req) {
    return this.syncService.syncOrderWithDB(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/private')
  async getPrivateOrder(@Param('id') id: string, @Request() req) {
    let targetPharmacyMsp = req.user.org;
    if (req.user.role === 'manufacturer') {
      const order = await this.prisma.orderRequest.findUnique({ where: { requestId: id } });
      if (order) targetPharmacyMsp = order.pharmacyOrg;
    }
    return this.fabricService.readPrivateOrder(id, req.user.userId, targetPharmacyMsp);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy', 'manufacturer', 'regulator')
  @Get(':id/price')
  async getPrice(@Param('id') id: string, @Request() req) {
    return this.fabricService.getBatchPrice(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/verify-integrity')
  async verifyIntegrity(@Param('id') id: string, @Request() req) {
    const user = req.user;
    const integrity = await this.syncService.verifyIntegrity(id);

    const isAuthorized = user && integrity.bc && (
      user.role === 'regulator' ||
      user.org === integrity.bc.manufacturer ||
      user.org === integrity.bc.ownerOrg
    );

    if (!isAuthorized) {
      const mismatches = (integrity.mismatches || []) as string[];
      const criticalMismatches = mismatches.filter(m =>
        !m.startsWith('Množstvo:') && !m.startsWith('Jednotka:'),
      );
      return {
        isValid: criticalMismatches.length === 0,
        mismatches: [],
        message: criticalMismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Nesúlad kritických údajov zistený.',
      };
    }
    return integrity;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':id/verify')
  async verifyDrug(@Param('id') id: string) {
    return this.fabricService.verifyBatch(id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/history')
  async getDrugHistory(@Param('id') id: string, @Request() req) {
    const user = req.user;
    try {
      const currentBatch = await this.fabricService.readBatch(id);
      const isAuthorized = user && currentBatch && (
        user.role === 'regulator' ||
        user.org === currentBatch.manufacturer ||
        user.org === currentBatch.ownerOrg
      );
      if (!isAuthorized) return [];
      return this.fabricService.queryHistory(id, PUBLIC_MSP_ID);
    } catch (error) {
      return [];
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/sub-batches')
  async getSubBatches(@Param('id') id: string) {
    return this.fabricService.querySubBatches(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':id')
  async getDrug(@Param('id') id: string) {
    try {
      return await this.fabricService.readBatch(id);
    } catch (error) {
      throw new UnauthorizedException('Šarža nebola nájdená na blockchaine.');
    }
  }
}
