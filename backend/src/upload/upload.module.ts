import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [IpfsModule],
  controllers: [UploadController],
})
export class UploadModule {}
