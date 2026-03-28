import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import * as fileType from 'file-type';
import * as fs from 'fs';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const clothingStorage = diskStorage({
  destination: join(__dirname, '..', '..', 'uploads', 'originals'),
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const clothingFileFilter = (_req: any, file: any, cb: any) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    cb(
      new BadRequestException(
        'Only JPEG, PNG, WebP, and HEIC images are allowed',
      ),
      false,
    );
    return;
  }
  cb(null, true);
};

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('clothing')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'original', maxCount: 1 },
      ],
      {
        storage: clothingStorage,
        limits: { fileSize: MAX_SIZE },
        fileFilter: clothingFileFilter,
      },
    ),
  )
  async uploadClothing(
    @UploadedFiles() files: { image?: any[]; original?: any[] },
    @Body('category') category?: string,
    @Body('subCategory') subCategory?: string,
    @Body('mlLabels') mlLabelsJson?: string,
    @Body('colorPalette') colorPaletteJson?: string,
  ) {
    const imageFile = files?.image?.[0];
    if (!imageFile) {
      throw new BadRequestException('No image file provided');
    }

    // VULN-06 Fix: Validate actual file magic bytes
    const buffer = fs.readFileSync(imageFile.path);
    const { fileTypeFromBuffer } = await (eval('import("file-type")') as Promise<typeof import('file-type')>);
    const type = await fileTypeFromBuffer(buffer);
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    
    if (!type || !ALLOWED_MIME.includes(type.mime)) {
      // Clean up the invalid file
      if (fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
      if (files?.original?.[0]?.path && fs.existsSync(files.original[0].path)) {
        fs.unlinkSync(files.original[0].path);
      }
      throw new BadRequestException('Invalid image file content (magic byte mismatch)');
    }

    let mlLabels: string[] | undefined;
    if (mlLabelsJson) {
      try {
        mlLabels = JSON.parse(mlLabelsJson);
      } catch {
        mlLabels = undefined;
      }
    }

    // All uploads are now processed on-device (bg removal + color extraction)
    const result = await this.uploadService.storeProcessedClothingImage(
      imageFile,
      files?.original?.[0],
      category,
      subCategory,
      mlLabels,
      colorPaletteJson,
    );
    return { success: true, data: result };
  }
}
