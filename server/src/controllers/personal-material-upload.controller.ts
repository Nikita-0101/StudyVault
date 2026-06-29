import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import { uploadPersonalMaterialSchema } from '../schemas/personal-material.schemas.js';
import { createPersonalFileMaterial } from '../services/personal-material.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

const subjectIdSchema = z
  .string()
  .uuid('Некорректный идентификатор предмета');

export const uploadPersonalMaterialFile: RequestHandler =
  async (
    request,
    response,
    next,
  ): Promise<void> => {
    try {
      const authenticatedRequest =
        request as AuthenticatedRequest;

      const subjectIdResult =
        subjectIdSchema.safeParse(
          request.params.subjectId,
        );

      if (!subjectIdResult.success) {
        throw new AppError(
          400,
          'Некорректный идентификатор предмета',
        );
      }

      if (!request.file) {
        throw new AppError(
          400,
          'Файл не был передан',
        );
      }

      const bodyResult =
        uploadPersonalMaterialSchema.safeParse(
          request.body,
        );

      if (!bodyResult.success) {
        const firstError =
          bodyResult.error.issues[0];

        throw new AppError(
          400,
          firstError?.message ??
            'Некорректные данные файла',
        );
      }

      const material =
        await createPersonalFileMaterial(
          authenticatedRequest.auth.userId,
          subjectIdResult.data,
          request.file,
          bodyResult.data.title,
        );

      response.status(201).json({
        message: 'Файл успешно загружен',
        material,
      });
    } catch (error) {
      next(error);
    }
  };