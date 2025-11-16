import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordRecoveryService } from './services/password-recovery.service';
import { 
  RequestPasswordResetDto, 
  ValidateTokenDto, 
  ResetPasswordDto 
} from './dto/password-recovery.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Datos del usuario registrado',
        },
        token: {
          type: 'string',
          description: 'Token JWT para autenticación',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de registro inválidos',
  })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          description: 'Datos del usuario autenticado',
        },
        token: {
          type: 'string',
          description: 'Token JWT para autenticación',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Token no válido o expirado',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @ApiOperation({ summary: 'Verificar validez del token' })
  @ApiResponse({
    status: 200,
    description: 'Token válido',
    schema: {
      type: 'object',
      properties: {
        valid: {
          type: 'boolean',
          example: true,
        },
        user: {
          type: 'object',
          description: 'Datos básicos del usuario',
        },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verifyToken(@Request() req) {
    return {
      valid: true,
      user: req.user,
    };
  }

  // =============================================================================
  // ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA
  // =============================================================================

  @ApiOperation({ 
    summary: 'Solicitar recuperación de contraseña',
    description: 'Envía un email con enlace para recuperar contraseña. Por seguridad, siempre retorna éxito sin revelar si el email existe.'
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada (email enviado si el usuario existe)',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Si el email existe en nuestro sistema, recibirás un enlace de recuperación.',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos de recuperación',
  })
  @HttpCode(HttpStatus.OK)
  @Post('password/request-reset')
  async requestPasswordReset(
    @Body() requestDto: RequestPasswordResetDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.passwordRecoveryService.requestPasswordReset({
      email: requestDto.email,
      clientIp,
      userAgent,
    });
  }

  @ApiOperation({ 
    summary: 'Validar token de recuperación',
    description: 'Valida si un token de recuperación es válido y no ha expirado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Token válido.',
        },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: 'user-uuid-123',
            },
            email: {
              type: 'string',
              example: 'usuario@example.com',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T12:00:00Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Token expirado o ya utilizado',
  })
  @HttpCode(HttpStatus.OK)
  @Post('password/validate-token')
  async validateToken(
    @Body() validateDto: ValidateTokenDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.passwordRecoveryService.validateToken({
      token: validateDto.token,
      clientIp,
      userAgent,
    });
  }

  @ApiOperation({ 
    summary: 'Resetear contraseña',
    description: 'Actualiza la contraseña del usuario usando un token de recuperación válido.'
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Contraseña actualizada exitosamente.',
        },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: 'user-uuid-123',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o contraseñas no coinciden',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.passwordRecoveryService.resetPassword({
      token: resetDto.token,
      newPassword: resetDto.newPassword,
      confirmPassword: resetDto.confirmPassword,
      clientIp,
      userAgent,
    });
  }

  @ApiOperation({ 
    summary: 'Obtener estadísticas de recuperación de contraseña',
    description: 'Obtiene estadísticas de uso del sistema de recuperación (solo para administradores).'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalRequests: {
          type: 'number',
          example: 150,
        },
        pendingTokens: {
          type: 'number',
          example: 5,
        },
        usedTokens: {
          type: 'number',
          example: 120,
        },
        expiredTokens: {
          type: 'number',
          example: 25,
        },
        failedAttempts: {
          type: 'number',
          example: 30,
        },
        successfulResets: {
          type: 'number',
          example: 120,
        },
        averageTimeToReset: {
          type: 'number',
          example: 15.5,
          description: 'Tiempo promedio en minutos',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('password/stats')
  async getPasswordRecoveryStats(@Request() req) {
    // TODO: Agregar guard de admin cuando esté implementado
    return this.passwordRecoveryService.getRecoveryStatistics();
  }
}
