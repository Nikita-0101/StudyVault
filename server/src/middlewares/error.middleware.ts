import type {
  ErrorRequestHandler,
  RequestHandler,
} from 'express';

export const notFoundHandler: RequestHandler = (
  request,
  response,
) => {
  response.status(404).json({
    message: 'Маршрут не найден',
    path: request.originalUrl,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error);

  response.status(500).json({
    message: 'Внутренняя ошибка сервера',
  });
};