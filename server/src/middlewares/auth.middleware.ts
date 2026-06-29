import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../errors/app-error.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  const authorization = request.headers.authorization;

  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    next(
      new AppError(
        401,
        'Требуется токен авторизации',
      ),
    );

    return;
  }

  try {
    const payload = verifyAccessToken(token);

    const authenticatedRequest =
      request as AuthenticatedRequest;

    authenticatedRequest.auth = {
      userId: payload.userId,
    };

    next();
  } catch {
    next(
      new AppError(
        401,
        'Недействительный или просроченный токен',
      ),
    );
  }
};