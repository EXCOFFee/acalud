import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserProfileAudit } from './entities/user-profile-audit.entity';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { ProfileAuditService } from './services/profile-audit.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';

@Module({
  imports: [
  TypeOrmModule.forFeature([User, UserProfile, UserProfileAudit]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadPath = './uploads/avatars';
          // Crear directorio si no existe
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          // Generar nombre único para el archivo
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `avatar-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Solo permitir imágenes
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP',
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB máximo
      },
    }),
  ],
  controllers: [UsersController, ProfileController],
  providers: [UsersService, ProfileService, ProfileAuditService],
  exports: [UsersService, ProfileService, ProfileAuditService, TypeOrmModule],
})
export class UsersModule {}
