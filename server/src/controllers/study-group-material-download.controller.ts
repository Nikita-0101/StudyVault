import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../errors/app-error.js';

import {
  studyGroupIdSchema,
} from '../schemas/study-group.schemas.js';

import {
  studyGroupTopicIdSchema,
} from '../schemas/study-group-topic.schemas.js';

import {
  studyGroupMaterialIdSchema,
} from '../schemas/study-group-material.schemas.js';

import {
  getStudyGroupFileDownloadUrl,
} from '../services/study-group-material.service.js';

import type {
  AuthenticatedRequest,
} from '../types/auth-request.js';

/*
 * Получает идентификатор пользователя
 * из данных, добавленных JWT middleware.
 */
const getAuthenticatedUserId = (
  request: Request,
): string => {
  const authenticatedRequest =
    request as AuthenticatedRequest;

  const userId =
    authenticatedRequest.auth?.userId;

  if (!userId) {
    throw new AppError(
      401,
      'Пользователь не авторизован',
    );
  }

  return userId;
};

/*
 * GET
 *
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId/download
 *
 * Контроллер не передаёт файл напрямую.
 *
 * Он возвращает временную signed URL
 * на приватный объект в Supabase Storage.
 */
export const downloadStudyGroupMaterialFile =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      /*
       * Проверяем groupId.
       */
      const groupIdValidation =
        studyGroupIdSchema.safeParse(
          request.params.groupId,
        );

      if (!groupIdValidation.success) {
        throw new AppError(
          400,
          'Некорректный идентификатор учебной группы',
        );
      }

      /*
       * Проверяем topicId.
       */
      const topicIdValidation =
        studyGroupTopicIdSchema.safeParse(
          request.params.topicId,
        );

      if (!topicIdValidation.success) {
        throw new AppError(
          400,
          'Некорректный идентификатор темы учебной группы',
        );
      }

      /*
       * Проверяем materialId.
       */
      const materialIdValidation =
        studyGroupMaterialIdSchema
          .safeParse(
            request.params.materialId,
          );

      if (!materialIdValidation.success) {
        throw new AppError(
          400,
          'Некорректный идентификатор материала учебной группы',
        );
      }

      const downloadData =
        await getStudyGroupFileDownloadUrl(
          userId,
          groupIdValidation.data,
          topicIdValidation.data,
          materialIdValidation.data,
        );

      response.status(200).json(
        downloadData,
      );
    } catch (error) {
      next(error);
    }
  };