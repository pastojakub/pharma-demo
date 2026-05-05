import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Logger, SetMetadata } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FabricService } from '../fabric/fabric.service';
import { SyncService } from '../sync/sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateDrugDefinitionDto } from '../dto/create-drug-definition.dto';

const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Controller('drug-catalog')
export class DrugCatalogController {
  private readonly logger = new Logger(DrugCatalogController.name);

  constructor(
    private prisma: PrismaService,
    private fabricService: FabricService,
    private syncService: SyncService
  ) {}

  @Get()
  async getAll() {
    return this.prisma.drugCatalog.findMany({
      include: { files: true }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  async syncWithBlockchain(@Request() req) {
    try {
      // Trigger full decentralized mirror sync
      await this.syncService.syncRecentChanges();
      return { success: true, message: 'Synchronizácia s blockchainom bola spustená.' };
    } catch (e) {
      return { error: e.message };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer', 'regulator')
  @Post()
  async create(@Body() body: CreateDrugDefinitionDto, @Request() req) {
    const { files, intakeInfo, metadata, ...drugData } = body;
    
    const drug = await this.prisma.drugCatalog.create({
      data: {
        ...drugData,
        intakeInfo: intakeInfo || '',
        metadata: metadata || '',
        files: {
          create: (files || []).map((f: any) => ({
            url: f.url,
            cid: f.cid,
            name: f.name,
            type: f.type,
            size: f.size,
            category: f.category
          }))
        }
      },
      include: { files: true }
    });

    // NEW: Sync with Blockchain for Decentralization
    try {
      await this.fabricService.addDrugDefinition(req.user.userId, drug);
    } catch (e) {
      this.logger.error(`Drug definition not stored on ledger: ${e.message}`);
    }

    return drug;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manufacturer', 'regulator')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: CreateDrugDefinitionDto, @Request() req) {
    const { files, intakeInfo, metadata, ...drugData } = body;
    
    if (files) {
      await this.prisma.file.deleteMany({
        where: { drugCatalogId: Number(id) }
      });
    }

    const drug = await this.prisma.drugCatalog.update({
      where: { id: Number(id) },
      data: {
        ...drugData,
        intakeInfo,
        metadata,
        files: files ? {
          create: files.map((f: any) => ({
            url: f.url,
            cid: f.cid,
            name: f.name,
            type: f.type,
            size: f.size,
            category: f.category
          }))
        } : undefined
      },
      include: { files: true }
    });

    // NEW: Update on Blockchain
    try {
      await this.fabricService.addDrugDefinition(req.user.userId, drug);
    } catch (e) {
      this.logger.error(`Updated drug definition not stored on ledger: ${e.message}`);
    }

    return drug;
  }
}
