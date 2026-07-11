import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { ProblemDetails } from '../../shared/errors/problem-details';

/**
 * Filtro global que traduce cualquier excepción a **RFC 9457 Problem Details** con `trace_id`
 * (convención 2.4 §4). Los controladores mapean los errores de dominio a `HttpException` con el
 * status correcto (401/422/423/…); acá se les da forma uniforme y se ocultan los internals.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const traceId = randomUUID();

    let status = 500;
    let title = 'Error interno';
    let detail: string | undefined;

    if (!(exception instanceof HttpException)) {
      // Error no controlado (500): se registra en el servidor (NFR-O1), nunca al cliente.
      console.error('[500]', exception);
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const cuerpo = exception.getResponse();
      if (typeof cuerpo === 'string') {
        title = cuerpo;
      } else if (cuerpo && typeof cuerpo === 'object') {
        const r = cuerpo as { message?: unknown; error?: unknown; title?: unknown; detail?: unknown };
        title = String(r.title ?? r.error ?? 'Error');
        const mensaje = Array.isArray(r.message) ? r.message.join('; ') : r.message ?? r.detail;
        if (mensaje !== undefined && mensaje !== null) detail = String(mensaje);
      }
    }

    const problema: ProblemDetails = {
      type: 'about:blank',
      title,
      status,
      instance: req.originalUrl,
      trace_id: traceId,
      ...(detail !== undefined ? { detail } : {}),
    };

    res
      .status(status)
      .setHeader('content-type', 'application/problem+json')
      .send(JSON.stringify(problema));
  }
}
