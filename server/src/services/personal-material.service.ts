import {
  basename,
  extname} from 'node:path';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import type {
  CreatePersonalMaterialInput,
  UpdatePersonalMaterialInput,
} from '../schemas/personal-material.schemas.js';

import {
  createFileSignedUrl,
  deleteFileFromStorage,
  uploadFileToStorage,
} from './storage.service.js';

type UploadedMaterialFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/*
 * Проверяет, что предмет существует
 * и принадлежит текущему пользователю.
 */
export const ensureSubjectBelongsToUser = async (
  ownerId: string,
  subjectId: string,
): Promise<void> => {
  const subject =
    await prisma.personalSubject.findFirst({
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

/*
 * Создаёт обычный материал:
 * NOTE или LINK.
 */
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
        type: 'NOTE',
        title: input.title,
        content: input.content,
      },
    });
  }

  return prisma.personalMaterial.create({
    data: {
      subjectId,
      type: 'LINK',
      title: input.title,
      url: input.url,
    },
  });
};

/*
 * Создаёт название материала из имени файла.
 *
 * Например:
 * "Лекция 1.pdf" → "Лекция 1"
 */
const createDefaultFileTitle = (
  fileName: string,
): string => {
  const extension = extname(fileName);

  const nameWithoutExtension = basename(
    fileName,
    extension,
  ).trim();

  if (nameWithoutExtension.length < 2) {
    return 'Учебный файл';
  }

  return nameWithoutExtension.slice(
    0,
    150,
  );
};

/*
 * Загружает настоящий файл в Supabase Storage,
 * а затем сохраняет информацию о нём в PostgreSQL.
 */
export const createPersonalFileMaterial = async (
  ownerId: string,
  subjectId: string,
  file: UploadedMaterialFile,
  title?: string,
) => {
  await ensureSubjectBelongsToUser(
    ownerId,
    subjectId,
  );

  /*
   * Сначала загружаем сам файл в Supabase.
   */
  const storagePath =
    await uploadFileToStorage({
      ownerId,
      subjectId,
      file,
    });

  try {
    /*
     * После успешной загрузки создаём
     * запись о файле в PostgreSQL.
     */
    return await prisma.personalMaterial.create({
      data: {
        subjectId,
        type: 'FILE',

        title:
          title ??
          createDefaultFileTitle(
            file.originalname,
          ),

        fileName: file.originalname,
        storagePath,
        mimeType: file.mimetype,
        fileSize: file.size,
      },
    });
  } catch (error) {
    /*
     * Если Supabase принял файл,
     * но запись в PostgreSQL создать
     * не удалось, удаляем файл обратно.
     *
     * Иначе в Storage остался бы
     * ненужный файл без записи в базе.
     */
    try {
      await deleteFileFromStorage(
        storagePath,
      );
    } catch (cleanupError) {
      console.error(
        'Failed to clean up uploaded file:',
        cleanupError,
      );
    }

    throw error;
  }
};

/*
 * Возвращает все материалы предмета.
 */
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

/*
 * Возвращает один материал.
 */
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

export const getPersonalFileDownloadUrl = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
) => {
  const material =
    await getPersonalMaterialById(
      ownerId,
      subjectId,
      materialId,
    );

  if (
    material.type !== 'FILE' ||
    !material.storagePath
  ) {
    throw new AppError(
      400,
      'Этот материал не является файлом',
    );
  }

  const downloadUrl =
    await createFileSignedUrl(
      material.storagePath,
      material.fileName ??
        `material-${material.id}`,
    );

  return {
    materialId: material.id,
    fileName: material.fileName,
    mimeType: material.mimeType,
    fileSize: material.fileSize,
    downloadUrl,
    expiresInSeconds: 15 * 60,
  };
};
/*
 * Изменяет материал с учётом его типа.
 */
export const updatePersonalMaterial = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
  input: UpdatePersonalMaterialInput,
) => {
  const existingMaterial =
    await getPersonalMaterialById(
      ownerId,
      subjectId,
      materialId,
    );

  const data: {
    title?: string;
    content?: string;
    url?: string;
  } = {};

  if (input.title !== undefined) {
    data.title = input.title;
  }

  if (existingMaterial.type === 'NOTE') {
    if (input.url !== undefined) {
      throw new AppError(
        400,
        'Для текстовой заметки нельзя указать ссылку',
      );
    }

    if (input.content !== undefined) {
      data.content = input.content;
    }
  }

  if (existingMaterial.type === 'LINK') {
    if (input.content !== undefined) {
      throw new AppError(
        400,
        'Для материала-ссылки нельзя указать текст заметки',
      );
    }

    if (input.url !== undefined) {
      data.url = input.url;
    }
  }

  if (existingMaterial.type === 'FILE') {
    if (
      input.content !== undefined ||
      input.url !== undefined
    ) {
      throw new AppError(
        400,
        'У файлового материала можно изменить только название',
      );
    }
  }

  return prisma.personalMaterial.update({
    where: {
      id: materialId,
    },
    data,
  });
};

/*
 * Удаляет материал.
 *
 * Если это FILE, сначала удаляет
 * настоящий файл из Supabase Storage,
 * затем запись из PostgreSQL.
 */
export const deletePersonalMaterial = async (
  ownerId: string,
  subjectId: string,
  materialId: string,
): Promise<void> => {
  const material =
    await getPersonalMaterialById(
      ownerId,
      subjectId,
      materialId,
    );

  if (
    material.type === 'FILE' &&
    material.storagePath
  ) {
    await deleteFileFromStorage(
      material.storagePath,
    );
  }

  await prisma.personalMaterial.delete({
    where: {
      id: materialId,
    },
  });
};