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
  uploadStudyGroupMaterialSchema,
} from '../schemas/study-group-material.schemas.js';

import {
  createStudyGroupFileMaterial,
} from '../services/study-group-material.service.js';

import type {
  AuthenticatedRequest,
} from '../types/auth-request.js';

/*
 * Получает userId, который middleware
 * авторизации записал в request.auth.
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
 * POST
 *
 * /api/study-groups/:groupId/topics/:topicId/materials/upload
 *
 * Content-Type:
 * multipart/form-data
 *
 * Поля:
 *
 * file  — обязательный файл;
 * title — необязательное название материала.
 */
export const uploadStudyGroupMaterialFile =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      /*
       * Проверяем groupId из URL.
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
       * Проверяем topicId из URL.
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
       * Multer записывает принятый файл
       * в request.file.
       *
       * Если файла нет, создавать запись
       * FILE в PostgreSQL нельзя.
       */
      if (!request.file) {
        throw new AppError(
          400,
          'Файл не был передан',
        );
      }

      /*
       * В multipart/form-data кроме файла
       * может быть передан title.
       */
      const bodyValidation =
        uploadStudyGroupMaterialSchema
          .safeParse(request.body);

      if (!bodyValidation.success) {
        const firstIssue =
          bodyValidation.error.issues[0];

        throw new AppError(
          400,
          firstIssue?.message ??
            'Некорректные данные файла',
        );
      }

      const material =
        await createStudyGroupFileMaterial(
          userId,
          groupIdValidation.data,
          topicIdValidation.data,
          request.file,
          bodyValidation.data.title,
        );

      response.status(201).json({
        message:
          'Файл учебной группы успешно загружен',

        material,
      });
    } catch (error) {
      next(error);
    }
  };