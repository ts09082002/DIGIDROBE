import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Get,
  Param,
  Res,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
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
    @Body('processedOnDevice') processedOnDevice?: string,
  ) {
    const imageFile = files?.image?.[0];
    if (!imageFile) {
      throw new BadRequestException('No image file provided');
    }

    let mlLabels: string[] | undefined;
    if (mlLabelsJson) {
      try {
        mlLabels = JSON.parse(mlLabelsJson);
      } catch {
        mlLabels = undefined;
      }
    }

    // On-device processed path: mobile already did bg removal + color extraction
    if (processedOnDevice === 'true') {
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

    // Legacy path: backend processes via AI service
    const result = await this.uploadService.processClothingImage(
      imageFile,
      category,
      subCategory,
      mlLabels,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('body-photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(
          __dirname,
          '..',
          '..',
          'uploads',
          'body',
          'originals',
        ),
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
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
      },
    }),
  )
  async uploadBodyPhoto(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const result = await this.uploadService.processBodyPhoto(file);
    return {
      success: true,
      data: result,
    };
  }

  @Get('processed/:filename')
  async getProcessedImage(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    const filePath = join(
      __dirname,
      '..',
      '..',
      'uploads',
      'processed',
      filename,
    );
    res.sendFile(filePath);
  }
}
