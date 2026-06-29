import type {
  NextFunction,
  Request,
  Response,
} from 'express';

export const notFoundHandler = (
  request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  response.status(404).json({
    message: 'Маршрут не найден',
    method: request.method,
    path: request.originalUrl,
  });
};