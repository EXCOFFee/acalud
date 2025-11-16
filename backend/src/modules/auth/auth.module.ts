import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { Institution } from '../institution/entities/institution.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordRecovery } from './entities/password-recovery.entity';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { EmailService } from './services/email.service';
import { InstitutionCredentialService } from './services/institution-credential.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordRecovery, Institution]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('app.jwtSecret'),
        signOptions: {
          expiresIn: configService.get('app.jwtExpiresIn'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    LocalStrategy,
    PasswordRecoveryService,
    EmailService,
    InstitutionCredentialService,
  ],
  exports: [AuthService, PasswordRecoveryService, EmailService],
})
export class AuthModule {}
