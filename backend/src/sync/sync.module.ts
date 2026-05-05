import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { FabricModule } from '../fabric/fabric.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [FabricModule, IpfsModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
