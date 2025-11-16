import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
}

export async function createTestApplication(): Promise<TestAppContext> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.TEACHER_ALLOWED_DOMAINS = 'test.com';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.synchronize(true);

  return { app, dataSource };
}
