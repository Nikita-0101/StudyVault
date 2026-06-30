import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

import {
  createStudyGroupSchema,
  joinStudyGroupSchema,
  studyGroupIdSchema,
  updateStudyGroupSchema,
  studyGroupMemberUserIdSchema,
} from '../schemas/study-group.schemas.js';

import {
  createStudyGroup,
  getStudyGroupById,
  getStudyGroups,
  joinStudyGroup,
  updateStudyGroup,
  leaveStudyGroup,
  removeStudyGroupMember,
  deleteStudyGroup,
} from '../services/study-group.service.js';

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
 * POST /api/study-groups
 */
export const createGroup = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const validationResult =
      createStudyGroupSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const group =
      await createStudyGroup(
        userId,
        validationResult.data,
      );

    response.status(201).json({
      message:
        'Учебная группа создана',
      group,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/study-groups
 */
export const getGroups = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const groups =
      await getStudyGroups(userId);

    response.status(200).json({
      groups,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * GET /api/study-groups/:groupId
 */
export const getGroupById = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const validationResult =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
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

    const group =
      await getStudyGroupById(
        userId,
        validationResult.data,
      );

    response.status(200).json({
      group,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /api/study-groups/join
 */
export const joinGroup = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const validationResult =
      joinStudyGroupSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message:
          'Некорректный код приглашения',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const group =
      await joinStudyGroup(
        userId,
        validationResult.data,
      );

    response.status(201).json({
      message:
        'Вы успешно вступили в учебную группу',
      group,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PATCH /api/study-groups/:groupId
 */
export const updateGroup = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    /*
     * Проверяем UUID группы из URL.
     */
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

    /*
     * Проверяем данные из JSON body.
     */
    const bodyValidation =
      updateStudyGroupSchema.safeParse(
        request.body,
      );

    if (!bodyValidation.success) {
      const errors = z.flattenError(
        bodyValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные учебной группы',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    const group =
      await updateStudyGroup(
        userId,
        groupIdValidation.data,
        bodyValidation.data,
      );

    response.status(200).json({
      message:
        'Учебная группа обновлена',
      group,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /api/study-groups/:groupId/leave
 */
export const leaveGroup = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const validationResult =
      studyGroupIdSchema.safeParse(
        request.params.groupId,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
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

    await leaveStudyGroup(
      userId,
      validationResult.data,
    );

    /*
     * 204 означает, что операция выполнена,
     * но тело ответа отсутствует.
     */
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};


/*
 * DELETE /api/study-groups/:groupId/members/:userId
 */
export const removeGroupMember = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterUserId =
      getAuthenticatedUserId(request);

    /*
     * Проверяем UUID группы.
     */
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

    /*
     * Проверяем UUID удаляемого пользователя.
     */
    const memberUserIdValidation =
      studyGroupMemberUserIdSchema.safeParse(
        request.params.userId,
      );

    if (!memberUserIdValidation.success) {
      const errors = z.flattenError(
        memberUserIdValidation.error,
      );

      response.status(400).json({
        message:
          'Некорректный идентификатор участника',

        errors:
          errors.fieldErrors,

        formErrors:
          errors.formErrors,
      });

      return;
    }

    await removeStudyGroupMember(
      requesterUserId,
      groupIdValidation.data,
      memberUserIdValidation.data,
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

/*
 * DELETE /api/study-groups/:groupId
 */
export const deleteGroup = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterUserId =
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

    await deleteStudyGroup(
      requesterUserId,
      groupIdValidation.data,
    );

    /*
     * Группа удалена.
     * Тело ответа не возвращаем.
     */
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};