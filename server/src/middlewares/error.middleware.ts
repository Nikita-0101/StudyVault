import type { ErrorRequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client.js';

import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    response.status(409).json({
      message: 'Запись с такими уникальными данными уже существует',
    });

    return;
  }

  console.error('Unhandled application error:', error);

  response.status(500).json({
    message: 'Внутренняя ошибка сервера',
  });
};