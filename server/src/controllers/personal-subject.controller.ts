import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import {
  createPersonalSubjectSchema,
  personalSubjectIdSchema,
  updatePersonalSubjectSchema,
} from '../schemas/personal-subject.schemas.js';
import {
  createPersonalSubject,
  deletePersonalSubject,
  getPersonalSubjectById,
  getPersonalSubjects,
  updatePersonalSubject,
} from '../services/personal-subject.service.js';
import type { AuthenticatedRequest } from '../types/auth-request.js';

const getAuthenticatedUserId = (
  request: Request,
): string => {
  const authenticatedRequest =
    request as AuthenticatedRequest;

  const userId = authenticatedRequest.auth?.userId;

  if (!userId) {
    throw new AppError(
      401,
      'Пользователь не авторизован',
    );
  }

  return userId;
};

const getValidatedSubjectId = (
  request: Request,
): string => {
  const validationResult =
    personalSubjectIdSchema.safeParse(
      request.params.id,
    );

  if (!validationResult.success) {
    throw new AppError(
      400,
      'Некорректный идентификатор предмета',
    );
  }

  return validationResult.data;
};

export const createSubject = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const validationResult =
      createPersonalSubjectSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные личного предмета',
        errors: errors.fieldErrors,
        formErrors: errors.formErrors,
      });

      return;
    }

    const subject =
      await createPersonalSubject(
        userId,
        validationResult.data,
      );

    response.status(201).json({
      message: 'Личный предмет создан',
      subject,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubjects = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const subjects =
      await getPersonalSubjects(userId);

    response.status(200).json({
      subjects,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubjectById = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const subjectId =
      getValidatedSubjectId(request);

    const subject =
      await getPersonalSubjectById(
        userId,
        subjectId,
      );

    response.status(200).json({
      subject,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const subjectId =
      getValidatedSubjectId(request);

    const validationResult =
      updatePersonalSubjectSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные для изменения предмета',
        errors: errors.fieldErrors,
        formErrors: errors.formErrors,
      });

      return;
    }

    const subject =
      await updatePersonalSubject(
        userId,
        subjectId,
        validationResult.data,
      );

    response.status(200).json({
      message: 'Личный предмет изменён',
      subject,
    });
  } catch (error) {
    next(error);
  }
};

export const removeSubject = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId =
      getAuthenticatedUserId(request);

    const subjectId =
      getValidatedSubjectId(request);

    await deletePersonalSubject(
      userId,
      subjectId,
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};