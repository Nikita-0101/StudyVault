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
  studyGroupMemberUserIdSchema,
  updateStudyGroupMemberRoleSchema,
} from '../schemas/study-group-member-role.schemas.js';

import {
  updateStudyGroupMemberRole,
} from '../services/study-group-member-role.service.js';

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
 * PATCH
 * /api/study-groups/:groupId/members/:userId/role
 */
export const updateGroupMemberRole =
  async (
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

      const targetUserIdValidation =
        studyGroupMemberUserIdSchema.safeParse(
          request.params.userId,
        );

      if (
        !targetUserIdValidation.success
      ) {
        const errors = z.flattenError(
          targetUserIdValidation.error,
        );

        response.status(400).json({
          message:
            'Некорректный идентификатор участника учебной группы',

          errors:
            errors.fieldErrors,

          formErrors:
            errors.formErrors,
        });

        return;
      }

      const bodyValidation =
        updateStudyGroupMemberRoleSchema.safeParse(
          request.body,
        );

      if (!bodyValidation.success) {
        const errors = z.flattenError(
          bodyValidation.error,
        );

        response.status(400).json({
          message:
            'Некорректные данные роли участника',

          errors:
            errors.fieldErrors,

          formErrors:
            errors.formErrors,
        });

        return;
      }

      const membership =
        await updateStudyGroupMemberRole(
          requesterUserId,
          groupIdValidation.data,
          targetUserIdValidation.data,
          bodyValidation.data,
        );

      response.status(200).json({
        message:
          'Роль участника учебной группы обновлена',

        membership,
      });
    } catch (error) {
      next(error);
    }
  };