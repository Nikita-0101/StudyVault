import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

import {
  studyGroupIdSchema,
} from '../schemas/study-group.schemas.js';

import {
  studyGroupTopicIdSchema,
} from '../schemas/study-group-topic.schemas.js';

import {
  createStudyGroupMaterialSchema,
  studyGroupMaterialIdSchema,
  updateStudyGroupMaterialSchema,
} from '../schemas/study-group-material.schemas.js';

import {
  createStudyGroupMaterial,
  deleteStudyGroupMaterial,
  getStudyGroupMaterialById,
  getStudyGroupMaterials,
  updateStudyGroupMaterial,
} from '../services/study-group-material.service.js';

import type {
  AuthenticatedRequest,
} from '../types/auth-request.js';

/*
 * Получаем userId, который JWT middleware
 * записал в request.auth.
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
 * Формирует единый ответ
 * для ошибок Zod.
 */
const sendValidationError = (
  response: Response,
  message: string,
  error: z.ZodError,
): void => {
  const flattenedError =
    z.flattenError(error);

  response.status(400).json({
    message,

    errors:
      flattenedError.fieldErrors,

    formErrors:
      flattenedError.formErrors,
  });
};

/*
 * Проверка groupId.
 */
const parseGroupId = (
  request: Request,
  response: Response,
): string | null => {
  const validation =
    studyGroupIdSchema.safeParse(
      request.params.groupId,
    );

  if (!validation.success) {
    sendValidationError(
      response,
      'Некорректный идентификатор учебной группы',
      validation.error,
    );

    return null;
  }

  return validation.data;
};

/*
 * Проверка topicId.
 */
const parseTopicId = (
  request: Request,
  response: Response,
): string | null => {
  const validation =
    studyGroupTopicIdSchema.safeParse(
      request.params.topicId,
    );

  if (!validation.success) {
    sendValidationError(
      response,
      'Некорректный идентификатор темы учебной группы',
      validation.error,
    );

    return null;
  }

  return validation.data;
};

/*
 * Проверка materialId.
 */
const parseMaterialId = (
  request: Request,
  response: Response,
): string | null => {
  const validation =
    studyGroupMaterialIdSchema.safeParse(
      request.params.materialId,
    );

  if (!validation.success) {
    sendValidationError(
      response,
      'Некорректный идентификатор материала учебной группы',
      validation.error,
    );

    return null;
  }

  return validation.data;
};

/*
 * POST
 * /api/study-groups/:groupId/topics/:topicId/materials
 */
export const createGroupMaterial =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      const groupId =
        parseGroupId(
          request,
          response,
        );

      if (!groupId) {
        return;
      }

      const topicId =
        parseTopicId(
          request,
          response,
        );

      if (!topicId) {
        return;
      }

      const bodyValidation =
        createStudyGroupMaterialSchema
          .safeParse(request.body);

      if (!bodyValidation.success) {
        sendValidationError(
          response,
          'Некорректные данные материала учебной группы',
          bodyValidation.error,
        );

        return;
      }

      const material =
        await createStudyGroupMaterial(
          userId,
          groupId,
          topicId,
          bodyValidation.data,
        );

      response.status(201).json({
        message:
          'Материал учебной группы создан',

        material,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * GET
 * /api/study-groups/:groupId/topics/:topicId/materials
 */
export const getGroupMaterials =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      const groupId =
        parseGroupId(
          request,
          response,
        );

      if (!groupId) {
        return;
      }

      const topicId =
        parseTopicId(
          request,
          response,
        );

      if (!topicId) {
        return;
      }

      const materials =
        await getStudyGroupMaterials(
          userId,
          groupId,
          topicId,
        );

      response.status(200).json({
        materials,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * GET
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 */
export const getGroupMaterialById =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      const groupId =
        parseGroupId(
          request,
          response,
        );

      if (!groupId) {
        return;
      }

      const topicId =
        parseTopicId(
          request,
          response,
        );

      if (!topicId) {
        return;
      }

      const materialId =
        parseMaterialId(
          request,
          response,
        );

      if (!materialId) {
        return;
      }

      const material =
        await getStudyGroupMaterialById(
          userId,
          groupId,
          topicId,
          materialId,
        );

      response.status(200).json({
        material,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * PATCH
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 */
export const updateGroupMaterial =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      const groupId =
        parseGroupId(
          request,
          response,
        );

      if (!groupId) {
        return;
      }

      const topicId =
        parseTopicId(
          request,
          response,
        );

      if (!topicId) {
        return;
      }

      const materialId =
        parseMaterialId(
          request,
          response,
        );

      if (!materialId) {
        return;
      }

      const bodyValidation =
        updateStudyGroupMaterialSchema
          .safeParse(request.body);

      if (!bodyValidation.success) {
        sendValidationError(
          response,
          'Некорректные данные материала учебной группы',
          bodyValidation.error,
        );

        return;
      }

      const material =
        await updateStudyGroupMaterial(
          userId,
          groupId,
          topicId,
          materialId,
          bodyValidation.data,
        );

      response.status(200).json({
        message:
          'Материал учебной группы обновлён',

        material,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * DELETE
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 */
export const deleteGroupMaterial =
  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId =
        getAuthenticatedUserId(request);

      const groupId =
        parseGroupId(
          request,
          response,
        );

      if (!groupId) {
        return;
      }

      const topicId =
        parseTopicId(
          request,
          response,
        );

      if (!topicId) {
        return;
      }

      const materialId =
        parseMaterialId(
          request,
          response,
        );

      if (!materialId) {
        return;
      }

      await deleteStudyGroupMaterial(
        userId,
        groupId,
        topicId,
        materialId,
      );

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  };