import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { UserRole } from '../../../src/modules/users/user.entity';

interface RegisterOptions {
  role?: UserRole;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthCredentials {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export async function registerUser(
  app: INestApplication,
  options: RegisterOptions = {},
): Promise<AuthCredentials> {
  const role = options.role ?? UserRole.TEACHER;
  const timestamp = Date.now();
  const domain = role === UserRole.TEACHER ? 'test.com' : 'example.com';
  const email = options.email ?? `${role}.${timestamp}@${domain}`;
  const password = options.password ?? 'Passw0rd!';
  const firstName = options.firstName ?? 'Test';
  const lastName = options.lastName ?? role.charAt(0).toUpperCase() + role.slice(1);

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      firstName,
      lastName,
      role,
    });

  if (response.status !== 201) {
    const errorMessage = JSON.stringify(response.body, null, 2);
    throw new Error(`Fallo al registrar usuario (${response.status}): ${errorMessage}`);
  }

  const { data } = response.body ?? {};

  if (!data?.token || !data?.user) {
    throw new Error('Register endpoint did not return auth data');
  }

  return {
    token: data.token,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
    },
  };
}
