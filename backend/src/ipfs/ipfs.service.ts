import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';
import * as fs from 'fs';

@Injectable()
export class IpfsService implements OnModuleInit {
  private readonly logger = new Logger(IpfsService.name);
  private pinata: PinataSDK | null = null;
  private useIpfs = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const jwt = this.configService.get<string>('PINATA_JWT');
    const gateway = this.configService.get<string>('PINATA_GATEWAY');

    if (jwt) {
      this.pinata = new PinataSDK({
        pinataJwt: jwt,
        pinataGateway: gateway || 'gateway.pinata.cloud',
      });
      this.useIpfs = true;
      this.logger.log('✔ Pinata IPFS Service initialized.');
    } else {
      this.logger.warn(
        '⚠ PINATA_JWT not found in environment. Falling back to local storage only.',
      );
    }
  }

  getGatewayUrl(cid: string): string {
    const gateway =
      this.configService.get<string>('PINATA_GATEWAY') ||
      'gateway.pinata.cloud';
    return `https://${gateway}/ipfs/${cid}`;
  }

  async uploadFile(
    filePath: string,
    originalName: string,
  ): Promise<{ cid: string | null; url: string }> {
    if (this.useIpfs && this.pinata) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        // Correct Pinata v2 SDK file upload with type bypass for problematic SDK definitions
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], originalName, {
          type: 'application/octet-stream',
        });

        const upload = await (this.pinata.upload.public as any).file(file);

        this.logger.log(
          `✔ File ${originalName} pinned to IPFS: ${upload.cid}`,
        );

        return {
          cid: upload.cid,
          url: this.getGatewayUrl(upload.cid),
        };
      } catch (error) {
        this.logger.error(`Failed to upload to IPFS: ${error.message}`);
        return { cid: null, url: `/uploads/${filePath.split('/').pop()}` };
      }
    }

    return { cid: null, url: `/uploads/${filePath.split('/').pop()}` };
  }

  isIpfsEnabled(): boolean {
    return this.useIpfs;
  }
}
