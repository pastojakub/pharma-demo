import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { FabricService } from '../fabric.service';
import { TransferDto } from './transfer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transfer')
export class TransferController {
  constructor(private readonly fabricService: FabricService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async transfer(@Body() transferDto: TransferDto, @Request() req) {
    return this.fabricService.transferOwnership(
      req.user.userId,
      transferDto.batchID,
      transferDto.newOwnerOrg,
      transferDto.quantity
    );
  }
}
