import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { diskStorage } from 'multer';
import { extname } from 'path';

/**
 * Módulo de gestión de archivos
 * Maneja la subida, almacenamiento y servicio de archivos
 * Incluye imágenes, documentos y otros recursos del sistema
 */
@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', // Carpeta donde se guardan los archivos
        filename: (req, file, callback) => {
          // Generar nombre único para el archivo
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Filtrar tipos de archivo permitidos
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Tipo de archivo no permitido'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo
      },
    }),
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService], // Exportamos para otros módulos
})
export class FilesModule {}
