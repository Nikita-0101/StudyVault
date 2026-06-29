import type { RequestHandler } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import { getPersonalFileDownloadUrl } from '../services/personal-material.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

const subjectIdSchema = z
  .string()
  .uuid('Некорректный идентификатор предмета');

const materialIdSchema = z
  .string()
  .uuid('Некорректный идентификатор материала');

export const downloadPersonalMaterialFile: RequestHandler =
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

      const materialIdResult =
        materialIdSchema.safeParse(
          request.params.materialId,
        );

      if (!materialIdResult.success) {
        throw new AppError(
          400,
          'Некорректный идентификатор материала',
        );
      }

      const result =
        await getPersonalFileDownloadUrl(
          authenticatedRequest.auth.userId,
          subjectIdResult.data,
          materialIdResult.data,
        );

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };