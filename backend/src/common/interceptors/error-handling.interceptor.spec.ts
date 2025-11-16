import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { ErrorHandlingInterceptor } from './error-handling.interceptor';
import { ResourceNotFoundException } from '../exceptions/business.exception';

const createExecutionContext = (requestOverrides: Record<string, any> = {}) => {
  const request = {
    method: 'GET',
    url: '/test',
    headers: { 'user-agent': 'jest' },
    body: {},
    query: {},
    params: {},
    ...requestOverrides,
  } as any;
  const response = { statusCode: HttpStatus.OK } as any;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
};

describe('ErrorHandlingInterceptor', () => {
  let interceptor: ErrorHandlingInterceptor;

  beforeEach(() => {
    interceptor = new ErrorHandlingInterceptor();
  });

  it('debería agregar correlationId y permitir respuestas exitosas', async () => {
    const context = createExecutionContext();
    const next = { handle: () => of({ ok: true }) };

    const result = await lastValueFrom(interceptor.intercept(context, next as any));

    expect(result).toEqual({ ok: true });
    const request = context.switchToHttp().getRequest();
    expect(request.correlationId).toBeDefined();
  });

  it('debería transformar BusinessException en HttpException con mismo código', async () => {
    const context = createExecutionContext();
    const businessError = new ResourceNotFoundException('Actividad', '123');
    const next = { handle: () => throwError(() => businessError) };

    await lastValueFrom(interceptor.intercept(context, next as any)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(businessError.getStatus());
    });
  });

  it('debería envolver errores genéricos en HttpException 500', async () => {
    const context = createExecutionContext();
    const next = { handle: () => throwError(() => new Error('Fallo inesperado')) };

    await lastValueFrom(interceptor.intercept(context, next as any)).catch((error) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
