import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';
import type {
  CreatePersonalMaterialInput,
  UpdatePersonalMaterialInput,
} from '../schemas/personal-material.schemas.js';

const ensureSubjectBelongsToUser = async (
  ownerId: string,
  subjectId: string,
): Promise<void> => {
  const subject = await prisma.personalSubject.findFirst({
    where: {
      id: subjectId,
      ownerId,
    },
    select: {
      id: true,
    },
  });

  if (!subject) {
    throw new AppError(
      404,
      'Личный предмет не найден',
    );
  }
};

export const createPersonalMaterial = async (
  ownerId: string,
  subjectId: string,
  input: CreatePersonalMaterialInput,
) => {
  await ensureSubjectBelongsToUser(
    ownerId,
    subjectId,
  );

  if (input.type === 'NOTE') {
    return prisma.personalMaterial.create({
      data: {
        subjectId,
        type: input.type,
        title: input.title,
        content: input.content,
      },
    });
  }

  if (input.type === 'LINK') {
    return prisma.personalMaterial.create({
      data: {
        subjectId,
        type: input.type,
        title: input.title,
        url: input.url,
      },
    });
  }

  return prisma.personalMaterial.create({
    data: {
      subjectId,
      type: input.type,
      title: input.title,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    },
  });
};

export const getPersonalMaterials = async (
  ownerId: string,
  subjectId: string,
) => {
  await ensureSubjectBelongsToUser(
    ownerId,
    subjectId,
  );

  return prisma.personalMaterial.findMany({
    where: {
      subjectId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getPersonalMaterialById = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
) => {
  await ensureSubjectBelongsToUser(
    ownerId,
    subjectId,
  );

  const material =
    await prisma.personalMaterial.findFirst({
      where: {
        id: materialId,
        subjectId,
      },
    });

  if (!material) {
    throw new AppError(
      404,
      'Материал не найден',
    );
  }

  return material;
};

export const updatePersonalMaterial = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
  input: UpdatePersonalMaterialInput,
) => {
  await getPersonalMaterialById(
    ownerId,
    subjectId,
    materialId,
  );

  return prisma.personalMaterial.update({
    where: {
      id: materialId,
    },
    data: input,
  });
};

export const deletePersonalMaterial = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
): Promise<void> => {
  await getPersonalMaterialById(
    ownerId,
    subjectId,
    materialId,
  );

  await prisma.personalMaterial.delete({
    where: {
      id: materialId,
    },
  });
};