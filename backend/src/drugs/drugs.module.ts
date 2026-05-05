import { Module } from '@nestjs/common';
import { DrugsController } from './drugs.controller';
import { FabricModule } from '../fabric/fabric.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [FabricModule, SyncModule],
  controllers: [DrugsController],
})
export class DrugsModule {}
