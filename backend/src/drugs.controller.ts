import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('drugs')
export class DrugsController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get()
  async getAllDrugs() {
    return await this.blockchainService.getAllDrugs();
  }

  @Get(':id')
  async getDrug(@Param('id') id: string) {
    return await this.blockchainService.readDrug(id);
  }

  @Get(':id/history')
  async getDrugHistory(@Param('id') id: string) {
    return await this.blockchainService.getDrugHistory(id);
  }

  @Post()
  async createDrug(
    @Body() body: { id: string; name: string; manufacturer: string; quantity: number; expiration: string },
  ) {
    await this.blockchainService.createDrugBatch(
      body.id,
      body.name,
      body.manufacturer,
      body.quantity,
      body.expiration,
    );
    return { message: 'Drug batch created successfully' };
  }

  @Post('transfer')
  async transferDrug(@Body() body: { id: string; newOwner: string }) {
    await this.blockchainService.transferOwnership(body.id, body.newOwner);
    return { message: 'Ownership transferred successfully' };
  }
}
