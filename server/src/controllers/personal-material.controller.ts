import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import {
  createPersonalMaterialSchema,
  personalMaterialIdSchema,
  updatePersonalMaterialSchema,
} from '../schemas/personal-material.schemas.js';
import { personalSubjectIdSchema } from '../schemas/personal-subject.schemas.js';
import {
  createPersonalMaterial,
  deletePersonalMaterial,
  getPersonalMaterialById,
  getPersonalMaterials,
  updatePersonalMaterial,
} from '../services/personal-material.service.js';
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
  const result = personalSubjectIdSchema.safeParse(
    request.params.subjectId,
  );

  if (!result.success) {
    throw new AppError(
      400,
      'Некорректный идентификатор предмета',
    );
  }

  return result.data;
};

const getValidatedMaterialId = (
  request: Request,
): string => {
  const result = personalMaterialIdSchema.safeParse(
    request.params.materialId,
  );

  if (!result.success) {
    throw new AppError(
      400,
      'Некорректный идентификатор материала',
    );
  }

  return result.data;
};

export const createMaterial = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(request);
    const subjectId = getValidatedSubjectId(request);

    const validationResult =
      createPersonalMaterialSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message: 'Некорректные данные материала',
        errors: errors.fieldErrors,
        formErrors: errors.formErrors,
      });

      return;
    }

    const material = await createPersonalMaterial(
      userId,
      subjectId,
      validationResult.data,
    );

    response.status(201).json({
      message: 'Материал создан',
      material,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterials = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(request);
    const subjectId = getValidatedSubjectId(request);

    const materials = await getPersonalMaterials(
      userId,
      subjectId,
    );

    response.status(200).json({
      materials,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialById = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(request);
    const subjectId = getValidatedSubjectId(request);
    const materialId = getValidatedMaterialId(request);

    const material = await getPersonalMaterialById(
      userId,
      subjectId,
      materialId,
    );

    response.status(200).json({
      material,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMaterial = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(request);
    const subjectId = getValidatedSubjectId(request);
    const materialId = getValidatedMaterialId(request);

    const validationResult =
      updatePersonalMaterialSchema.safeParse(
        request.body,
      );

    if (!validationResult.success) {
      const errors = z.flattenError(
        validationResult.error,
      );

      response.status(400).json({
        message:
          'Некорректные данные для изменения материала',
        errors: errors.fieldErrors,
        formErrors: errors.formErrors,
      });

      return;
    }

    const material = await updatePersonalMaterial(
      userId,
      subjectId,
      materialId,
      validationResult.data,
    );

    response.status(200).json({
      message: 'Материал изменён',
      material,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMaterial = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = getAuthenticatedUserId(request);
    const subjectId = getValidatedSubjectId(request);
    const materialId = getValidatedMaterialId(request);

    await deletePersonalMaterial(
      userId,
      subjectId,
      materialId,
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
};