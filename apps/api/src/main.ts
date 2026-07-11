import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  // Render (y la mayoría de PaaS) inyecta el puerto por `PORT`; local usa API_PORT.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
