import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Prefijo de versión de la API (contrato 2.4: servers = /api/v1).
  app.setGlobalPrefix('api/v1');

  // Validación de entrada: **Zod en el borde** (CLAUDE.md §Estilo / 2.4 / 5.1 §2), no
  // class-validator. Se cablea por endpoint (pipe Zod) al construir los controladores en la
  // Etapa 1; acá no se registra un pipe global de class-validator a propósito.

  // La web comparte sitio con la API vía rewrites de Vercel (ADR-004); la APK usa Bearer.
  // En desarrollo habilitamos el origen local del front.
  app.enableCors({
    origin: process.env.WEB_BASE_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
