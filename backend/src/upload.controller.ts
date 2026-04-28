/// <reference types="multer" />
import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles,
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { IpfsService } from './ipfs.service';
import * as fromBuffer from 'file-type';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('upload')
export class UploadController {
  constructor(private ipfsService: IpfsService) {}
  
  @UseGuards(JwtAuthGuard)
  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException('Nepodporovaný formát súboru. Povolené sú iba PDF a obrázky.'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE
      }
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Súbor nebol nahraný.');
    }

    // Secondary Check: Verify content via magic bytes
    const type = await fromBuffer.fromFile(file.path);
    if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
       throw new BadRequestException('Detegovaný neplatný obsah súboru (MIME mismatch).');
    }

    // NEW: Upload to IPFS
    const ipfsData = await this.ipfsService.uploadFile(file.path, file.originalname);

    return {
      url: ipfsData.url,
      cid: ipfsData.cid,
      localUrl: `/uploads/${file.filename}`,
      name: file.originalname,
      type: file.mimetype,
      size: file.size
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException(`Súbor ${file.originalname} má nepodporovaný formát.`), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: MAX_FILE_SIZE
      }
    }),
  )
  async uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Neboli nahrané žiadne súbory.');
    }

    const results: any[] = [];
    for (const file of files) {
        const type = await fromBuffer.fromFile(file.path);
        if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
            throw new BadRequestException(`Súbor ${file.originalname} má neplatný obsah.`);
        }

        // NEW: Upload to IPFS
        const ipfsData = await this.ipfsService.uploadFile(file.path, file.originalname);
        results.push({
          url: ipfsData.url,
          cid: ipfsData.cid,
          localUrl: `/uploads/${file.filename}`,
          name: file.originalname,
          type: file.mimetype,
          size: file.size
        });
    }

    return results;
  }
}
