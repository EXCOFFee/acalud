import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { createTestApplication } from './communications/helpers/app.helper';
import { registerUser } from './communications/helpers/auth.helper';
import { User, UserRole } from '../src/modules/users/user.entity';
import { ItemAvailability, ItemRarity, StoreItemType } from '../src/modules/store/entities/store-item.entity';
import { PaymentMethod } from '../src/modules/store/entities/user-purchase.entity';

interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

describe('Store API (e2e)', () => {
  let app: INestApplication | null = null;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let defaultStoreItemId: string;
  const defaultItemPrice = 150;

  beforeAll(async () => {
    const context = await createTestApplication();
    app = context.app;
    dataSource = context.dataSource;
    userRepository = dataSource.getRepository(User);

    const adminAuth = await registerUser(app!, { role: UserRole.ADMIN });
    adminToken = adminAuth.token;

    const studentAuth = await registerUser(app!, { role: UserRole.STUDENT });
    studentToken = studentAuth.token;
    studentId = studentAuth.user.id;

    await userRepository.update(studentId, { coins: 500, level: 5 });

    const defaultItemPayload = {
      name: 'Avatar Guardián',
      description: 'Avatar cosmético creado para validar el flujo de tienda e2e.',
      type: StoreItemType.AVATAR,
      rarity: ItemRarity.RARE,
      price: defaultItemPrice,
      imageUrl: 'https://cdn.acalud.test/assets/store/avatar-guardian.png',
      availability: ItemAvailability.AVAILABLE,
      tags: ['avatar', 'guardian'],
      minLevelRequired: 1,
      isOnSale: false,
      discountPercentage: 0,
    };

    const response = await request(app!.getHttpServer())
      .post('/api/v1/store/admin/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(defaultItemPayload);

    if (response.status !== 201 || !response.body?.data?.id) {
      throw new Error(`No se pudo crear el item base de tienda: ${JSON.stringify(response.body)}`);
    }

    defaultStoreItemId = response.body.data.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('permite a un administrador crear un elemento de tienda', async () => {
    const createItemDto = {
      name: 'Marco Carmesí',
      description: 'Marco legendario para reforzar pruebas E2E de la tienda.',
      type: StoreItemType.FRAME,
      rarity: ItemRarity.LEGENDARY,
      price: 250,
      imageUrl: 'https://cdn.acalud.test/assets/store/frame-crimson.png',
      availability: ItemAvailability.AVAILABLE,
      tags: ['frame', 'legendary'],
      minLevelRequired: 1,
      isOnSale: true,
      discountPercentage: 15,
    };

    const response = await request(app!.getHttpServer())
      .post('/api/v1/store/admin/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createItemDto);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(createItemDto.name);
    expect(response.body.data.id).toBeDefined();
  });

  it('lista elementos disponibles de la tienda para un usuario autenticado', async () => {
    const response = await request(app!.getHttpServer())
      .get('/api/v1/store/items')
      .set('Authorization', `Bearer ${studentToken}`);

    const body = response.body as PaginatedResponse<any[]>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination?.total).toBeGreaterThan(0);

    const targetItem = body.data.find((item: any) => item.id === defaultStoreItemId);
    expect(targetItem).toBeDefined();
    expect(targetItem.price).toBe(defaultItemPrice);
  });

  let purchaseId: string;
  let finalPricePaid: number;

  it('permite comprar un elemento con monedas de gamificación', async () => {
    const startingCoins = 400;
    await userRepository.update(studentId, { coins: startingCoins, level: 5 });

    const response = await request(app!.getHttpServer())
      .post('/api/v1/store/purchase')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        storeItemId: defaultStoreItemId,
        quantity: 1,
        paymentMethod: PaymentMethod.COINS,
      });

    const body = response.body as PaginatedResponse<any>;

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.finalPrice).toBe(defaultItemPrice);
    expect(body.data.item.id).toBe(defaultStoreItemId);
    expect(body.data.remainingCoins).toBe(startingCoins - defaultItemPrice);

    purchaseId = body.data.purchase.id;
    finalPricePaid = body.data.finalPrice;

    const student = await userRepository.findOne({ where: { id: studentId } });
    expect(student?.coins).toBe(startingCoins - finalPricePaid);
  });

  it('rechaza compras cuando el usuario no tiene monedas suficientes', async () => {
    const lowFundsAuth = await registerUser(app!, { role: UserRole.STUDENT });

    const response = await request(app!.getHttpServer())
      .post('/api/v1/store/purchase')
      .set('Authorization', `Bearer ${lowFundsAuth.token}`)
      .send({
        storeItemId: defaultStoreItemId,
        paymentMethod: PaymentMethod.COINS,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Monedas insuficientes');
  });

  it('exhibe las compras en el inventario del usuario', async () => {
    const response = await request(app!.getHttpServer())
      .get('/api/v1/store/inventory')
      .set('Authorization', `Bearer ${studentToken}`);

    const body = response.body as PaginatedResponse<any[]>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination?.total).toBeGreaterThan(0);

    const purchase = body.data.find((entry: any) => entry.id === purchaseId);
    expect(purchase).toBeDefined();
    expect(purchase.storeItemId).toBe(defaultStoreItemId);
    expect(purchase.storeItem.id).toBe(defaultStoreItemId);
    expect(purchase.pricePaid).toBe(finalPricePaid);
  });
});
