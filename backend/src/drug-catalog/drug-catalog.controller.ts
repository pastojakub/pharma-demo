import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDrugDefinitionDto } from '../dto/create-drug-definition.dto';

@Controller('drug-catalog')
export class DrugCatalogController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll() {
    return this.prisma.drugCatalog.findMany({
      include: { files: true }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: CreateDrugDefinitionDto) {
    const { files, intakeInfo, metadata, ...drugData } = body;
    
    return this.prisma.drugCatalog.create({
      data: {
        ...drugData,
        intakeInfo: intakeInfo || '',
        metadata: metadata || '',
        files: {
          create: (files || []).map((f: any) => ({
            url: f.url,
            name: f.name,
            type: f.type,
            size: f.size,
            category: f.category
          }))
        }
      },
      include: { files: true }
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: CreateDrugDefinitionDto) {
    const { files, intakeInfo, metadata, ...drugData } = body;
    
    if (files) {
      await this.prisma.file.deleteMany({
        where: { drugCatalogId: Number(id) }
      });
    }

    return this.prisma.drugCatalog.update({
      where: { id: Number(id) },
      data: {
        ...drugData,
        intakeInfo,
        metadata,
        files: files ? {
          create: files.map((f: any) => ({
            url: f.url,
            name: f.name,
            type: f.type,
            size: f.size,
            category: f.category
          }))
        } : undefined
      },
      include: { files: true }
    });
  }
}
