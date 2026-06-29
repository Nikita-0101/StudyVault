import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import { registerSchema } from '../schemas/auth.schemas.js';
import { registerUser } from '../services/auth.service.js';

export const register = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = registerSchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        message: 'Некорректные данные регистрации',
        errors: z.flattenError(validationResult.error).fieldErrors,
      });

      return;
    }

    const result = await registerUser(validationResult.data);

    response.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};