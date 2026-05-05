import { Module } from '@nestjs/common';
import { TransferController } from './transfer.controller';
import { FabricModule } from '../fabric/fabric.module';

@Module({
  imports: [FabricModule],
  controllers: [TransferController],
})
export class TransferModule {}
