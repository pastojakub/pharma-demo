import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainService } from './blockchain.service';
import { DrugsController } from './drugs.controller';

@Module({
  imports: [],
  controllers: [AppController, DrugsController],
  providers: [AppService, BlockchainService],
})
export class AppModule {}
