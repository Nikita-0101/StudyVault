import {
  Prisma,
} from '../generated/prisma/client.js';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import type {
  CreateStudyGroupTopicInput,
  UpdateStudyGroupTopicInput,
} from '../schemas/study-group-topic.schemas.js';

type GroupAccessContext = {
  id: string;
  ownerId: string;

  currentUserRole:
    | 'OWNER'
    | 'EDITOR'
    | 'MEMBER';
};

/*
 * Поля автора темы, которые возвращаем клиенту.
 */
const topicCreatorSelection = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

/*
 * Ищет группу только среди групп,
 * в которых состоит текущий пользователь.
 *
 * Одновременно получает роль пользователя
 * в этой конкретной группе.
 */
const findAccessibleGroup = async (
  userId: string,
  groupId: string,
): Promise<GroupAccessContext | null> => {
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

  /*
   * Группа либо не существует,
   * либо пользователь в ней не состоит.
   */
  if (!group || !membership) {
    return null;
  }

  return {
    id: group.id,
    ownerId: group.ownerId,

    currentUserRole:
      membership.role,
  };
};

/*
 * Проверяет, что пользователь
 * является участником группы.
 *
 * Читать темы могут:
 *
 * OWNER
 * EDITOR
 * MEMBER
 */
const requireGroupMember = async (
  userId: string,
  groupId: string,
): Promise<GroupAccessContext> => {
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
 * Проверяет право управлять темами.
 *
 * Управлять темами могут:
 *
 * OWNER
 * EDITOR
 */
const requireTopicManager = async (
  userId: string,
  groupId: string,
): Promise<GroupAccessContext> => {
  const group =
    await requireGroupMember(
      userId,
      groupId,
    );

  const canManageTopics =
    group.ownerId === userId ||
    group.currentUserRole === 'OWNER' ||
    group.currentUserRole === 'EDITOR';

  if (!canManageTopics) {
    throw new AppError(
      403,
      'Только владелец или редактор может управлять темами учебной группы',
    );
  }

  return group;
};

/*
 * Создаёт тему учебной группы.
 *
 * Доступ:
 *
 * OWNER
 * EDITOR
 */
export const createStudyGroupTopic =
  async (
    userId: string,
    groupId: string,
    input: CreateStudyGroupTopicInput,
  ) => {
    await requireTopicManager(
      userId,
      groupId,
    );

    /*
     * Получаем максимальную позицию
     * существующих тем группы.
     */
    const positionResult =
      await prisma.studyGroupTopic.aggregate({
        where: {
          groupId,
        },

        _max: {
          position: true,
        },
      });

    /*
     * Если тем ещё нет:
     *
     * null ?? -1 = -1
     * -1 + 1 = 0
     *
     * Если максимальная позиция 4:
     *
     * 4 + 1 = 5
     */
    const nextPosition =
      (
        positionResult._max.position ??
        -1
      ) + 1;

    return prisma.studyGroupTopic.create({
      data: {
        groupId,

        /*
         * Автор определяется по JWT,
         * а не принимается из body.
         */
        createdById: userId,

        name: input.name,

        description:
          input.description ?? null,

        color:
          input.color ?? null,

        position:
          nextPosition,
      },

      include: {
        createdBy: {
          select:
            topicCreatorSelection,
        },
      },
    });
  };

/*
 * Возвращает список тем группы.
 *
 * Читать могут все участники:
 *
 * OWNER
 * EDITOR
 * MEMBER
 */
export const getStudyGroupTopics =
  async (
    userId: string,
    groupId: string,
  ) => {
    await requireGroupMember(
      userId,
      groupId,
    );

    return prisma.studyGroupTopic.findMany({
      where: {
        groupId,
      },

      include: {
        createdBy: {
          select:
            topicCreatorSelection,
        },
      },

      orderBy: [
        {
          position: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  };

/*
 * Возвращает одну тему.
 *
 * Проверяется одновременно:
 *
 * id темы;
 * groupId темы.
 *
 * Поэтому тему нельзя получить
 * через URL другой учебной группы.
 */
export const getStudyGroupTopicById =
  async (
    userId: string,
    groupId: string,
    topicId: string,
  ) => {
    await requireGroupMember(
      userId,
      groupId,
    );

    const topic =
      await prisma.studyGroupTopic.findFirst({
        where: {
          id: topicId,
          groupId,
        },

        include: {
          createdBy: {
            select:
              topicCreatorSelection,
          },
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
 * Изменяет тему.
 *
 * Доступ:
 *
 * OWNER
 * EDITOR
 */
export const updateStudyGroupTopic =
  async (
    userId: string,
    groupId: string,
    topicId: string,
    input: UpdateStudyGroupTopicInput,
  ) => {
    await requireTopicManager(
      userId,
      groupId,
    );

    /*
     * Проверяем, что тема:
     *
     * существует;
     * принадлежит указанной группе.
     */
    const topic =
      await prisma.studyGroupTopic.findFirst({
        where: {
          id: topicId,
          groupId,
        },

        select: {
          id: true,
        },
      });

    if (!topic) {
      throw new AppError(
        404,
        'Тема учебной группы не найдена',
      );
    }

    try {
      return await prisma.studyGroupTopic.update({
        where: {
          id: topicId,
        },

        data: {
          /*
           * Поле отсутствует:
           * не добавляем его в UPDATE.
           */
          ...(input.name !== undefined
            ? {
                name: input.name,
              }
            : {}),

          /*
           * undefined → не изменять;
           * строка     → обновить;
           * null       → очистить.
           */
          ...(input.description !==
          undefined
            ? {
                description:
                  input.description,
              }
            : {}),

          /*
           * undefined → не изменять;
           * строка     → обновить;
           * null       → очистить.
           */
          ...(input.color !== undefined
            ? {
                color: input.color,
              }
            : {}),
        },

        include: {
          createdBy: {
            select:
              topicCreatorSelection,
          },
        },
      });
    } catch (error) {
      /*
       * Тема могла быть удалена
       * между findFirst и update.
       */
      const isRecordNotFoundError =
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025';

      if (isRecordNotFoundError) {
        throw new AppError(
          404,
          'Тема учебной группы не найдена',
        );
      }

      throw error;
    }
  };

/*
 * Удаляет тему.
 *
 * Доступ:
 *
 * OWNER
 * EDITOR
 */
export const deleteStudyGroupTopic =
  async (
    userId: string,
    groupId: string,
    topicId: string,
  ): Promise<void> => {
    await requireTopicManager(
      userId,
      groupId,
    );

    /*
     * Проверяем существование темы
     * именно внутри указанной группы.
     */
    const topic =
      await prisma.studyGroupTopic.findFirst({
        where: {
          id: topicId,
          groupId,
        },

        select: {
          id: true,
        },
      });

    if (!topic) {
      throw new AppError(
        404,
        'Тема учебной группы не найдена',
      );
    }

    try {
      await prisma.studyGroupTopic.delete({
        where: {
          id: topicId,
        },
      });
    } catch (error) {
      /*
       * Тема могла быть удалена
       * параллельным запросом.
       */
      const isRecordNotFoundError =
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025';

      if (isRecordNotFoundError) {
        throw new AppError(
          404,
          'Тема учебной группы не найдена',
        );
      }

      throw error;
    }
  };