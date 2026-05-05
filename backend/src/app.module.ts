import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { FabricModule } from './fabric/fabric.module';
import { IpfsModule } from './ipfs/ipfs.module';
import { SyncModule } from './sync/sync.module';
import { DrugsModule } from './drugs/drugs.module';
import { DrugCatalogModule } from './drug-catalog/drug-catalog.module';
import { UploadModule } from './upload/upload.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TransferModule } from './transfer/transfer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    PrismaModule,
    FabricModule,
    IpfsModule,
    SyncModule,
    DrugsModule,
    DrugCatalogModule,
    UploadModule,
    NotificationsModule,
    TransferModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
