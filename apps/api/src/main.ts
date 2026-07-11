import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
