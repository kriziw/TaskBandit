import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface RawErrorBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'bad_request';
    case HttpStatus.UNAUTHORIZED:
      return 'unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'forbidden';
    case HttpStatus.NOT_FOUND:
      return 'not_found';
    case HttpStatus.CONFLICT:
      return 'conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'unprocessable_entity';
    case HttpStatus.SERVICE_UNAVAILABLE:
      return 'service_unavailable';
    default:
      return 'error';
  }
}

/**
 * Normalises every HttpException response to { code, message }.
 * Handles:
 *  - bare-string exceptions:         new NotFoundException("msg")
 *  - object with code+message:       new NotFoundException({ code, message })
 *  - object with message only:       new NotFoundException({ message })
 *  - class-validator array messages: { message: ["field must be ..."] }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let code: string;
    let message: string;

    if (typeof body === 'string') {
      code = defaultCodeForStatus(status);
      message = body;
    } else {
      const errorBody = body as RawErrorBody;
      code = errorBody.code ?? defaultCodeForStatus(status);
      if (Array.isArray(errorBody.message)) {
        message = errorBody.message.join('; ');
      } else {
        message = errorBody.message ?? exception.message;
      }
    }

    response.status(status).json({ code, message });
  }
}
