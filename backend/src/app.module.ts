import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FabricService } from './fabric.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { TransferController } from './transfer/transfer.controller';
import { DrugCatalogController } from './drug-catalog/drug-catalog.controller';
import { DrugsController } from './drugs.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { UploadController } from './upload.controller';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule
  ],
  controllers: [
    AppController, 
    TransferController, 
    DrugCatalogController, 
    DrugsController,
    NotificationsController,
    UploadController
  ],
  providers: [
    AppService, 
    FabricService, 
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
