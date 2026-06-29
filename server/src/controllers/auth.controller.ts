import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import {
  loginSchema,
  registerSchema,
} from '../schemas/auth.schemas.js';
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

export const register = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = registerSchema.safeParse(
      request.body,
    );

    if (!validationResult.success) {
      response.status(400).json({
        message: 'Некорректные данные регистрации',
        errors: z.flattenError(
          validationResult.error,
        ).fieldErrors,
      });

      return;
    }

    const result = await registerUser(
      validationResult.data,
    );

    response.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = loginSchema.safeParse(
      request.body,
    );

    if (!validationResult.success) {
      response.status(400).json({
        message: 'Некорректные данные для входа',
        errors: z.flattenError(
          validationResult.error,
        ).fieldErrors,
      });

      return;
    }

    const result = await loginUser(
      validationResult.data,
    );

    response.status(200).json({
      message: 'Вход выполнен успешно',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authenticatedRequest =
      request as AuthenticatedRequest;

    const userId = authenticatedRequest.auth?.userId;

    if (!userId) {
      throw new AppError(
        401,
        'Пользователь не авторизован',
      );
    }

    const user = await getCurrentUser(userId);

    response.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};