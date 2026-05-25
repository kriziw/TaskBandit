import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

const STATUS_TO_EXCEPTION: Partial<Record<HttpStatus, new (body: object) => HttpException>> = {
  [HttpStatus.BAD_REQUEST]: BadRequestException,
  [HttpStatus.UNAUTHORIZED]: UnauthorizedException,
  [HttpStatus.FORBIDDEN]: ForbiddenException,
  [HttpStatus.NOT_FOUND]: NotFoundException,
  [HttpStatus.CONFLICT]: ConflictException,
  [HttpStatus.SERVICE_UNAVAILABLE]: ServiceUnavailableException,
};

/**
 * Creates a typed HttpException that always carries { code, message }.
 * Use this instead of `new NotFoundException(...)` etc. when you want an
 * explicit machine-readable code alongside the human message.
 */
export function appError(code: string, message: string, status: HttpStatus): HttpException {
  const ExceptionClass = STATUS_TO_EXCEPTION[status];
  if (ExceptionClass) {
    return new ExceptionClass({ code, message });
  }
  return new HttpException({ code, message }, status);
}
