import { Module } from '@nestjs/common';
import { DrugCatalogController } from './drug-catalog.controller';
import { FabricModule } from '../fabric/fabric.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [FabricModule, SyncModule],
  controllers: [DrugCatalogController],
})
export class DrugCatalogModule {}
