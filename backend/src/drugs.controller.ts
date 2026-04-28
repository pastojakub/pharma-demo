import { Controller, Get, Post, Body, Param, UseGuards, Request, SetMetadata, UnauthorizedException, Patch, BadRequestException } from '@nestjs/common';
import { FabricService } from './fabric.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PrismaService } from './prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

// DTOs
import { CreateDrugDto } from './dto/create-drug.dto';
import { RequestDrugDto } from './dto/request-drug.dto';
import { PriceOfferDto } from './dto/price-offer.dto';
import { FulfillOrderDto } from './dto/fulfill-order.dto';
import { SellDrugDto } from './dto/sell-drug.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('drugs')
export class DrugsController {
  constructor(
    private readonly fabricService: FabricService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAll(@Request() req) {
    return await this.fabricService.getAllDrugs(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(@Request() req) {
    return this.prisma.orderRequest.findMany({
      where: {
        OR: [
          { manufacturerOrg: req.user.org },
          { pharmacyOrg: req.user.org }
        ]
      },
      include: { files: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post()
  async createDrug(@Request() req, @Body() body: CreateDrugDto) {
    const result = await this.fabricService.initBatch(
      req.user.userId,
      body.id,
      body.drugID,
      body.name,
      body.manufacturer,
      body.expiryDate,
      body.quantity,
      body.unit,
      body.price,
      body.metadata
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('request')
  async requestDrug(@Request() req, @Body() body: RequestDrugDto) {
    const bcResult = await this.fabricService.requestDrug(
      req.user.userId,
      body.requestID,
      body.drugID,
      body.name,
      body.manufacturerOrg,
      body.quantity,
      body.unit,
      body.fileCIDs || []
    );
    return bcResult;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post('offer')
  async providePriceOffer(@Request() req, @Body() body: PriceOfferDto) {
    const bcResult = await this.fabricService.providePriceOffer(
      req.user.userId,
      body.requestID,
      body.price,
      body.pharmacyOrg
    );
    return bcResult;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('approve-offer')
  async approveOffer(@Request() req, @Body() body: { requestID: string; offerID: number }) {
    const offer = await this.prisma.priceOffer.findUnique({ where: { id: body.offerID } });
    if (!offer || offer.pharmacyOrg !== req.user.org) {
      throw new UnauthorizedException('Ponuka neexistuje alebo nie je určená pre vás.');
    }

    return await this.fabricService.finalizeAgreement(
      req.user.userId,
      body.requestID,
      offer.price
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer', 'pharmacy')
  @Post('reject-request')
  async rejectRequest(@Request() req, @Body() body: RejectRequestDto) {
    return await this.fabricService.rejectRequest(
      req.user.userId,
      body.requestID,
      body.pharmacyOrg,
      body.reason
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('regulator')
  @Post('recall')
  async recallBatch(@Request() req, @Body() body: { id: string }) {
    return await this.fabricService.emergencyRecall(req.user.userId, body.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('sell')
  async sellDrug(@Request() req, @Body() body: SellDrugDto) {
    const result = await this.fabricService.sellToConsumer(req.user.userId, body.id, body.quantity);
    // Force immediate sync of this batch
    await this.fabricService.syncDrugWithDB(body.id, req.user.org);
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('return')
  async returnDrug(@Request() req, @Body() body: { id: string; manufacturerOrg: string }) {
    return await this.fabricService.returnToManufacturer(req.user.userId, body.id, body.manufacturerOrg);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Post('fulfill-order')
  async fulfillOrder(@Request() req, @Body() body: FulfillOrderDto) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { requestId: body.requestId }
    });

    if (!order || order.manufacturerOrg !== req.user.org) {
      throw new UnauthorizedException('Objednávka neexistuje alebo k nej nemáte prístup.');
    }

    if (order.status !== 'APPROVED') {
      throw new BadRequestException('Objednávka musí byť v stave SCHVÁLENÁ.');
    }

    await this.prisma.orderRequest.update({
      where: { requestId: body.requestId },
      data: { status: 'PROCESSING_FULFILLMENT' }
    });

    try {
      const agreedPriceOffer = await this.prisma.priceOffer.findFirst({
        where: { batchID: body.requestId, status: 'APPROVED' }
      });
      const agreedPrice = agreedPriceOffer?.price;

      for (const b of body.batches) {
        const resultingBatchID = await this.fabricService.transferOwnership(
          req.user.userId,
          b.batchID,
          order.pharmacyOrg,
          b.quantity,
          agreedPrice
        );

        await this.prisma.fulfillment.create({
          data: {
            orderRequestId: order.id,
            batchID: resultingBatchID,
            quantity: b.quantity
          }
        });

        if (resultingBatchID !== b.batchID) {
          await this.fabricService.syncDrugWithDB(b.batchID, req.user.org);
        }
      }

      await this.prisma.orderRequest.update({
        where: { requestId: body.requestId },
        data: { status: 'ORDERED' }
      });

      return { success: true, message: 'Objednávka bola úspešne odoslaná.' };

    } catch (err) {
      await this.prisma.orderRequest.update({
        where: { requestId: body.requestId },
        data: { status: 'APPROVED' }
      });
      throw new BadRequestException(`Fulfillment zlyhal: ${err.message}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:requestId/fulfillments')
  async getFulfillments(@Param('requestId') requestId: string) {
    const order = await this.prisma.orderRequest.findUnique({
      where: { requestId },
      include: { fulfillments: true }
    });
    return order?.fulfillments || [];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer')
  @Get('catalog/:id/pricing-summary')
  async getPricingSummary(@Param('id') id: string, @Request() req) {
    const orders = await this.prisma.orderRequest.findMany({
      where: {
        drugId: id,
        manufacturerOrg: req.user.org,
        status: { in: ['APPROVED', 'ORDERED', 'FULFILLED'] }
      },
      include: { fulfillments: true }
    });

    const requestIds = orders.map(o => o.requestId);
    const offers = await this.prisma.priceOffer.findMany({
      where: {
        batchID: { in: requestIds },
        manufacturerOrg: req.user.org,
        status: 'APPROVED'
      }
    });

    const pharmacyMap = new Map();
    orders.forEach(order => {
      const offer = offers.find(off => off.batchID === order.requestId);
      if (offer) {
        pharmacyMap.set(order.pharmacyOrg, {
          pharmacy: order.pharmacyOrg,
          price: offer.price,
          lastOrder: order.createdAt,
          totalQuantity: (pharmacyMap.get(order.pharmacyOrg)?.totalQuantity || 0) + order.quantity
        });
      }
    });

    return Array.from(pharmacyMap.values());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy')
  @Post('receive')
  async receiveDrug(@Request() req, @Body() body: { id: string }) {
    return await this.fabricService.confirmDelivery(req.user.userId, body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('offers/:batchID')
  async getOffers(@Param('batchID') batchID: string, @Request() req) {
    return this.prisma.priceOffer.findMany({
      where: {
        batchID,
        OR: [ { manufacturerOrg: req.user.org }, { pharmacyOrg: req.user.org } ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy', 'manufacturer')
  @Post('sync-batch')
  async syncBatch(@Request() req, @Body() body: { id: string }) {
    await this.fabricService.syncDrugWithDB(body.id, req.user.org);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/verify-integrity')
  async verifyOrderIntegrity(@Param('id') id: string, @Request() req) {
    return await this.fabricService.verifyOrderIntegrity(id, req.user.org, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/sync')
  async syncOrder(@Param('id') id: string, @Request() req) {
    return await this.fabricService.syncOrderWithDB(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id/private')
  async getPrivateOrder(@Param('id') id: string, @Request() req) {
    let targetPharmacyMsp = req.user.org;
    if (req.user.role === 'manufacturer') {
      const order = await this.prisma.orderRequest.findUnique({ where: { requestId: id } });
      if (order) targetPharmacyMsp = order.pharmacyOrg;
    }
    return await this.fabricService.readPrivateOrder(id, req.user.userId, targetPharmacyMsp);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacy', 'manufacturer', 'regulator')
  @Get(':id/price')
  async getPrice(@Param('id') id: string, @Request() req) {
    return await this.fabricService.getBatchPrice(id, req.user.org);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':id/verify-integrity')
  async verifyIntegrity(@Param('id') id: string, @Request() req) {
    const authHeader = req.headers.authorization;
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = this.configService.get<string>('JWT_SECRET');
        const payload = this.jwtService.verify(token, { secret });
        user = { userId: payload.sub, email: payload.email, role: payload.role, org: payload.org };
      } catch (e) {
        user = null;
      }
    }

    const integrity = await this.fabricService.verifyIntegrity(id, 'PublicMSP');
    
    const isAuthorized = user && integrity.bc && (
      user.role === 'regulator' || 
      user.org === integrity.bc.manufacturer || 
      user.org === integrity.bc.ownerOrg
    );

    if (!isAuthorized) {
      const mismatches = (integrity.mismatches || []) as string[];
      const criticalMismatches = mismatches.filter(m => 
        !m.startsWith('Množstvo:') && !m.startsWith('Jednotka:')
      );
      
      return {
        isValid: criticalMismatches.length === 0,
        mismatches: [],
        message: criticalMismatches.length === 0 ? 'Dáta sú zhodné s blockchainom.' : 'Nesúlad kritických údajov zistený.'
      };
    }

    return integrity;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':id/verify')
  async verifyDrug(@Param('id') id: string) {
    return await this.fabricService.verifyBatch(id, 'PublicMSP');
  }

  @Get(':id/history')
  async getDrugHistory(@Param('id') id: string, @Request() req) {
    const authHeader = req.headers.authorization;
    let user: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const secret = this.configService.get<string>('JWT_SECRET');
        const payload = this.jwtService.verify(token, { secret });
        user = { userId: payload.sub, email: payload.email, role: payload.role, org: payload.org };
      } catch (e) {
        user = null;
      }
    }

    try {
      const currentBatch = await this.fabricService.readBatchWithMsp(id, 'PublicMSP');
      
      const isAuthorized = user && currentBatch && (
        user.role === 'regulator' || 
        user.org === currentBatch.manufacturer || 
        user.org === currentBatch.ownerOrg
      );

      if (!isAuthorized) {
        return [];
      }

      // FIX: Use user's org to access PDCs for history
      return await this.fabricService.queryHistory(id, 'PublicMSP');
    } catch (error) {
      return [];
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/sub-batches')
  async getSubBatches(@Param('id') id: string) {
    return await this.fabricService.querySubBatches(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get(':id')
  async getDrug(@Param('id') id: string) {
    try {
      return await this.fabricService.readBatchWithMsp(id, 'PublicMSP');
    } catch (error) {
      throw new UnauthorizedException('Šarža nebola nájdená na blockchaine.');
    }
  }
}
