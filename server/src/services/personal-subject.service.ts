import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import type {
  CreatePersonalSubjectInput,
  UpdatePersonalSubjectInput,
} from '../schemas/personal-subject.schemas.js';

export const createPersonalSubject = async (
  ownerId: string,
  input: CreatePersonalSubjectInput,
) => {
  return prisma.personalSubject.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
    },
  });
};

export const getPersonalSubjects = async (
  ownerId: string,
) => {
  return prisma.personalSubject.findMany({
    where: {
      ownerId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getPersonalSubjectById = async (
  ownerId: string,
  subjectId: string,
) => {
  const subject = await prisma.personalSubject.findFirst({
    where: {
      id: subjectId,
      ownerId,
    },
  });

  if (!subject) {
    throw new AppError(
      404,
      'Личный предмет не найден',
    );
  }

  return subject;
};

export const updatePersonalSubject = async (
  ownerId: string,
  subjectId: string,
  input: UpdatePersonalSubjectInput,
) => {
  await getPersonalSubjectById(
    ownerId,
    subjectId,
  );

  const data: {
    name?: string;
    description?: string | null;
    color?: string | null;
  } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.description !== undefined) {
    data.description = input.description;
  }

  if (input.color !== undefined) {
    data.color = input.color;
  }

  return prisma.personalSubject.update({
    where: {
      id: subjectId,
    },
    data,
  });
};

export const deletePersonalSubject = async (
  ownerId: string,
  subjectId: string,
): Promise<void> => {
  await getPersonalSubjectById(
    ownerId,
    subjectId,
  );

  await prisma.personalSubject.delete({
    where: {
      id: subjectId,
    },
  });
};