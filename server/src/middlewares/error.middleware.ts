import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

import { AppError } from '../errors/app-error.js';
import { Prisma } from '../generated/prisma/client.js';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  // Ошибки приложения, которые мы создаём сами:
  // 400, 401, 404, 409 и другие.
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
    });

    return;
  }

  // Ошибки загрузки файлов через Multer.
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json({
        message: 'Размер файла не должен превышать 20 МБ',
      });

      return;
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      response.status(400).json({
        message: 'Можно загрузить только один файл',
      });

      return;
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      response.status(400).json({
        message:
          'Файл должен быть передан в поле с названием file',
      });

      return;
    }

    response.status(400).json({
      message: 'Ошибка загрузки файла',
      code: error.code,
    });

    return;
  }

  // Ошибка уникальности Prisma.
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    response.status(409).json({
      message:
        'Запись с такими уникальными данными уже существует',
    });

    return;
  }

  // Все остальные неожиданные ошибки.
  console.error('Unhandled application error:', error);

  response.status(500).json({
    message: 'Внутренняя ошибка сервера',
  });
};