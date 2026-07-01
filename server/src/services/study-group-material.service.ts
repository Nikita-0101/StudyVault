import {
  basename,
  extname,
} from 'node:path';

import {
  Prisma,
} from '../generated/prisma/client.js';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import {
  createFileSignedUrl,
  deleteFileFromStorage,
  uploadStudyGroupFileToStorage,
} from './storage.service.js';

import type {
  CreateStudyGroupMaterialInput,
  UpdateStudyGroupMaterialInput,
} from '../schemas/study-group-material.schemas.js';

type StudyGroupAccessContext = {
  id: string;
  ownerId: string;

  currentUserRole:
    | 'OWNER'
    | 'EDITOR'
    | 'MEMBER';
};

type UploadedMaterialFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/*
 * Возвращаем только публичные поля автора.
 */
const materialCreatorSelection = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

/*
 * Ищет группу только тогда, когда
 * пользователь является её участником.
 */
const findAccessibleGroup = async (
  userId: string,
  groupId: string,
): Promise<
  StudyGroupAccessContext | null
> => {
  const group =
    await prisma.studyGroup.findFirst({
      where: {
        id: groupId,

        members: {
          some: {
            userId,
          },
        },
      },

      select: {
        id: true,
        ownerId: true,

        members: {
          where: {
            userId,
          },

          select: {
            role: true,
          },

          take: 1,
        },
      },
    });

  const membership =
    group?.members[0];

  if (!group || !membership) {
    return null;
  }

  return {
    id: group.id,
    ownerId: group.ownerId,
    currentUserRole: membership.role,
  };
};

/*
 * Читать материалы могут все участники.
 */
const requireGroupMember = async (
  userId: string,
  groupId: string,
): Promise<StudyGroupAccessContext> => {
  const group =
    await findAccessibleGroup(
      userId,
      groupId,
    );

  if (!group) {
    throw new AppError(
      404,
      'Учебная группа не найдена',
    );
  }

  return group;
};

/*
 * Управлять материалами могут:
 *
 * OWNER
 * EDITOR
 */
const requireMaterialManager = async (
  userId: string,
  groupId: string,
): Promise<StudyGroupAccessContext> => {
  const group =
    await requireGroupMember(
      userId,
      groupId,
    );

  const canManageMaterials =
    group.ownerId === userId ||
    group.currentUserRole === 'OWNER' ||
    group.currentUserRole === 'EDITOR';

  if (!canManageMaterials) {
    throw new AppError(
      403,
      'Только владелец или редактор может управлять материалами учебной группы',
    );
  }

  return group;
};

/*
 * Проверяет, что тема существует
 * именно в указанной группе.
 */
const requireTopicInGroup = async (
  groupId: string,
  topicId: string,
) => {
  const topic =
    await prisma.studyGroupTopic.findFirst({
      where: {
        id: topicId,
        groupId,
      },

      select: {
        id: true,
        groupId: true,
      },
    });

  if (!topic) {
    throw new AppError(
      404,
      'Тема учебной группы не найдена',
    );
  }

  return topic;
};

/*
 * Ищет материал именно внутри
 * указанной темы.
 */
const findMaterialInTopic = async (
  topicId: string,
  materialId: string,
) => {
  return prisma.studyGroupMaterial
    .findFirst({
      where: {
        id: materialId,
        topicId,
      },

      include: {
        createdBy: {
          select:
            materialCreatorSelection,
        },
      },
    });
};

/*
 * Создание NOTE или LINK.
 */
export const createStudyGroupMaterial =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    input: CreateStudyGroupMaterialInput,
  ) => {
    await requireMaterialManager(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    return prisma.studyGroupMaterial
      .create({
        data: {
          topicId,
          createdById: userId,

          type: input.type,
          title: input.title,

          content:
            input.type === 'NOTE'
              ? input.content
              : null,

          url:
            input.type === 'LINK'
              ? input.url
              : null,

          fileName: null,
          storagePath: null,
          mimeType: null,
          fileSize: null,
        },

        include: {
          createdBy: {
            select:
              materialCreatorSelection,
          },
        },
      });
  };

/*
 * Создаёт название материала
 * из исходного имени файла.
 *
 * "Лекция 1.pdf" → "Лекция 1"
 */
const createDefaultFileTitle = (
  fileName: string,
): string => {
  const extension =
    extname(fileName);

  const nameWithoutExtension =
    basename(
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
 * Загружает групповой файл.
 *
 * Порядок:
 *
 * 1. проверка прав;
 * 2. проверка темы;
 * 3. загрузка в Storage;
 * 4. запись метаданных в PostgreSQL.
 *
 * Если PostgreSQL выдаст ошибку после
 * успешной загрузки, файл удаляется обратно.
 */
export const createStudyGroupFileMaterial =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    file: UploadedMaterialFile,
    title?: string,
  ) => {
    await requireMaterialManager(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    const storagePath =
      await uploadStudyGroupFileToStorage({
        groupId,
        topicId,
        file,
      });

    try {
      return await prisma
        .studyGroupMaterial
        .create({
          data: {
            topicId,
            createdById: userId,

            type: 'FILE',

            title:
              title ??
              createDefaultFileTitle(
                file.originalname,
              ),

            content: null,
            url: null,

            fileName:
              file.originalname,

            storagePath,

            mimeType:
              file.mimetype,

            fileSize:
              file.size,
          },

          include: {
            createdBy: {
              select:
                materialCreatorSelection,
            },
          },
        });
    } catch (error) {
      /*
       * Не оставляем в Storage
       * файл без записи в базе.
       */
      try {
        await deleteFileFromStorage(
          storagePath,
        );
      } catch (cleanupError) {
        console.error(
          'Failed to clean up uploaded study group file:',
          cleanupError,
        );
      }

      throw error;
    }
  };

/*
 * Список материалов темы.
 */
export const getStudyGroupMaterials =
  async (
    userId: string,
    groupId: string,
    topicId: string,
  ) => {
    await requireGroupMember(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    return prisma.studyGroupMaterial
      .findMany({
        where: {
          topicId,
        },

        include: {
          createdBy: {
            select:
              materialCreatorSelection,
          },
        },

        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
      });
  };

/*
 * Получение одного материала.
 */
export const getStudyGroupMaterialById =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    materialId: string,
  ) => {
    await requireGroupMember(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    const material =
      await findMaterialInTopic(
        topicId,
        materialId,
      );

    if (!material) {
      throw new AppError(
        404,
        'Материал учебной группы не найден',
      );
    }

    return material;
  };

/*
 * Создаёт временную signed URL
 * для скачивания приватного файла.
 *
 * Скачивать могут все участники группы.
 */
export const getStudyGroupFileDownloadUrl =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    materialId: string,
  ) => {
    const material =
      await getStudyGroupMaterialById(
        userId,
        groupId,
        topicId,
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
          `group-material-${material.id}`,
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
 * Изменение NOTE или LINK.
 */
export const updateStudyGroupMaterial =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    materialId: string,
    input: UpdateStudyGroupMaterialInput,
  ) => {
    await requireMaterialManager(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    const material =
      await findMaterialInTopic(
        topicId,
        materialId,
      );

    if (!material) {
      throw new AppError(
        404,
        'Материал учебной группы не найден',
      );
    }

    if (material.type === 'FILE') {
      throw new AppError(
        400,
        'Файловый материал нельзя изменить через этот маршрут',
      );
    }

    if (
      material.type === 'NOTE' &&
      input.url !== undefined
    ) {
      throw new AppError(
        400,
        'Для текстовой заметки нельзя передать поле url',
      );
    }

    if (
      material.type === 'LINK' &&
      input.content !== undefined
    ) {
      throw new AppError(
        400,
        'Для материала-ссылки нельзя передать поле content',
      );
    }

    try {
      return await prisma
        .studyGroupMaterial
        .update({
          where: {
            id: materialId,
          },

          data: {
            ...(input.title !== undefined
              ? {
                  title: input.title,
                }
              : {}),

            ...(input.content !== undefined
              ? {
                  content:
                    input.content,
                }
              : {}),

            ...(input.url !== undefined
              ? {
                  url: input.url,
                }
              : {}),
          },

          include: {
            createdBy: {
              select:
                materialCreatorSelection,
            },
          },
        });
    } catch (error) {
      const isRecordNotFoundError =
        error instanceof
          Prisma
            .PrismaClientKnownRequestError &&
        error.code === 'P2025';

      if (isRecordNotFoundError) {
        throw new AppError(
          404,
          'Материал учебной группы не найден',
        );
      }

      throw error;
    }
  };

/*
 * Удаление материала.
 *
 * Для FILE сначала удаляется объект
 * из Supabase Storage.
 *
 * Только после этого удаляется
 * запись из PostgreSQL.
 */
export const deleteStudyGroupMaterial =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    materialId: string,
  ): Promise<void> => {
    await requireMaterialManager(
      userId,
      groupId,
    );

    await requireTopicInGroup(
      groupId,
      topicId,
    );

    const material =
      await findMaterialInTopic(
        topicId,
        materialId,
      );

    if (!material) {
      throw new AppError(
        404,
        'Материал учебной группы не найден',
      );
    }

    if (material.type === 'FILE') {
      if (!material.storagePath) {
        throw new AppError(
          500,
          'У файлового материала отсутствует путь в хранилище',
        );
      }

      await deleteFileFromStorage(
        material.storagePath,
      );
    }

    try {
      await prisma.studyGroupMaterial
        .delete({
          where: {
            id: materialId,
          },
        });
    } catch (error) {
      const isRecordNotFoundError =
        error instanceof
          Prisma
            .PrismaClientKnownRequestError &&
        error.code === 'P2025';

      if (isRecordNotFoundError) {
        throw new AppError(
          404,
          'Материал учебной группы не найден',
        );
      }

      throw error;
    }
  };