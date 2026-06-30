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
  createStudyGroupTopicSchema,
  studyGroupTopicIdSchema,
  updateStudyGroupTopicSchema,
} from '../schemas/study-group-topic.schemas.js';

import {
  createStudyGroupTopic,
  deleteStudyGroupTopic,
  getStudyGroupTopicById,
  getStudyGroupTopics,
  updateStudyGroupTopic,
} from '../services/study-group-topic.service.js';

import type {
  AuthenticatedRequest,
} from '../types/auth-request.js';

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
 * POST /api/study-groups/:groupId/topics
 */
export const createGroupTopic = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groupIdValidation =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!groupIdValidation.success) {
      const errors = z.flattenError(
        groupIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const bodyValidation =
      createStudyGroupTopicSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      const errors = z.flattenError(
        bodyValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные темы учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topic =
      await createStudyGroupTopic(
        userId,
        groupIdValidation.data,
        bodyValidation.data,
      );

    response.status(201).json({
      message:
        'Тема учебной группы создана',
      topic,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/study-groups/:groupId/topics
 */
export const getGroupTopics = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groupIdValidation =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!groupIdValidation.success) {
      const errors = z.flattenError(
        groupIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topics =
      await getStudyGroupTopics(
        userId,
        groupIdValidation.data,
      );

    response.status(200).json({
      topics,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/study-groups/:groupId/topics/:topicId
 */
export const getGroupTopicById = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groupIdValidation =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!groupIdValidation.success) {
      const errors = z.flattenError(
        groupIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topicIdValidation =
      studyGroupTopicIdSchema.safeParse(
        request.params.topicId,
      );

    if (!topicIdValidation.success) {
      const errors = z.flattenError(
        topicIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор темы учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topic =
      await getStudyGroupTopicById(
        userId,
        groupIdValidation.data,
        topicIdValidation.data,
      );

    response.status(200).json({
      topic,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PATCH /api/study-groups/:groupId/topics/:topicId
 */
export const updateGroupTopic = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groupIdValidation =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!groupIdValidation.success) {
      const errors = z.flattenError(
        groupIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topicIdValidation =
      studyGroupTopicIdSchema.safeParse(
        request.params.topicId,
      );

    if (!topicIdValidation.success) {
      const errors = z.flattenError(
        topicIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор темы учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const bodyValidation =
      updateStudyGroupTopicSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      const errors = z.flattenError(
        bodyValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные темы учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topic =
      await updateStudyGroupTopic(
        userId,
        groupIdValidation.data,
        topicIdValidation.data,
        bodyValidation.data,
      );

    response.status(200).json({
      message:
        'Тема учебной группы обновлена',
      topic,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * DELETE /api/study-groups/:groupId/topics/:topicId
 */
export const deleteGroupTopic = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groupIdValidation =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!groupIdValidation.success) {
      const errors = z.flattenError(
        groupIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const topicIdValidation =
      studyGroupTopicIdSchema.safeParse(
        request.params.topicId,
      );

    if (!topicIdValidation.success) {
      const errors = z.flattenError(
        topicIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор темы учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    await deleteStudyGroupTopic(
      userId,
      groupIdValidation.data,
      topicIdValidation.data,
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};