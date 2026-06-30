import { Prisma } from '../generated/prisma/client.js';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import type {
  CreateStudyGroupInput,
  JoinStudyGroupInput,
  UpdateStudyGroupInput
} from '../schemas/study-group.schemas.js';

import {
  generateInviteCode,
} from '../utils/invite-code.js';


const MAX_INVITE_CODE_ATTEMPTS = 5;

/*
 * Создаёт учебную группу.
 *
 * Одновременно создаёт владельца
 * как первого участника с ролью OWNER.
 */
export const createStudyGroup = async (
  ownerId: string,
  input: CreateStudyGroupInput,
) => {
  for (
    let attempt = 1;
    attempt <= MAX_INVITE_CODE_ATTEMPTS;
    attempt += 1
  ) {
    const inviteCode =
      generateInviteCode();

    try {
      return await prisma.studyGroup.create({
        data: {
          ownerId,
          name: input.name,
          description:
            input.description ?? null,
          inviteCode,

          members: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
        },

        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },

          _count: {
            select: {
              members: true,
            },
          },
        },
      });
    } catch (error) {
      const isUniqueConstraintError =
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';

      if (!isUniqueConstraintError) {
        throw error;
      }
    }
  }

  throw new AppError(
    500,
    'Не удалось сгенерировать уникальный код приглашения',
  );
};

/*
 * Возвращает все группы,
 * в которых состоит пользователь.
 */
export const getStudyGroups = async (
  userId: string,
) => {
  const groups =
    await prisma.studyGroup.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },

      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },

        members: {
          where: {
            userId,
          },

          select: {
            role: true,
            joinedAt: true,
          },
        },

        _count: {
          select: {
            members: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

  return groups.map(
    ({
      members,
      ...group
    }) => ({
      ...group,

      currentUserRole:
        members[0]?.role ?? null,

      currentUserJoinedAt:
        members[0]?.joinedAt ?? null,
    }),
  );
};

/*
 * Возвращает одну учебную группу
 * вместе со списком участников.
 *
 * Доступ есть только у пользователя,
 * который состоит в этой группе.
 */
export const getStudyGroupById = async (
  userId: string,
  groupId: string,
) => {
  const group =
    await prisma.studyGroup.findFirst({
      where: {
        id: groupId,

        /*
         * Группа должна содержать запись
         * membership текущего пользователя.
         */
        members: {
          some: {
            userId,
          },
        },
      },

      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },

        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,

            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },

          orderBy: {
            joinedAt: 'asc',
          },
        },

        _count: {
          select: {
            members: true,
          },
        },
      },
    });

  /*
   * Один ответ используется для двух ситуаций:
   *
   * 1. группы действительно не существует;
   * 2. группа существует, но пользователь
   *    не является её участником.
   *
   * Так посторонний пользователь не узнает,
   * существует ли группа с таким UUID.
   */
  if (!group) {
    throw new AppError(
      404,
      'Учебная группа не найдена',
    );
  }

  const currentUserMembership =
    group.members.find(
      (member) =>
        member.userId === userId,
    );

  return {
    ...group,

    currentUserRole:
      currentUserMembership?.role ?? null,

    currentUserJoinedAt:
      currentUserMembership?.joinedAt ?? null,
  };
};

/*
 * Изменяет название или описание учебной группы.
 *
 * Изменять группу может только её владелец.
 */
export const updateStudyGroup = async (
  userId: string,
  groupId: string,
  input: UpdateStudyGroupInput,
) => {
  /*
   * Сначала проверяем:
   *
   * 1. существует ли группа;
   * 2. состоит ли текущий пользователь в группе.
   *
   * Постороннему пользователю возвращаем 404,
   * чтобы не раскрывать существование группы.
   */
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
      },
    });

  if (!group) {
    throw new AppError(
      404,
      'Учебная группа не найдена',
    );
  }

  /*
   * Пользователь состоит в группе,
   * но не является её владельцем.
   */
  if (group.ownerId !== userId) {
    throw new AppError(
      403,
      'Только владелец может изменять учебную группу',
    );
  }

  return prisma.studyGroup.update({
    where: {
      id: groupId,
    },

    data: {
      /*
       * Если поле не передано,
       * оно вообще не попадёт в UPDATE.
       */
      ...(input.name !== undefined
        ? {
            name: input.name,
          }
        : {}),

      /*
       * description может быть:
       *
       * undefined → не изменять;
       * строка     → установить новое описание;
       * null       → удалить описание.
       */
      ...(input.description !== undefined
        ? {
            description:
              input.description,
          }
        : {}),
    },

    include: {
      owner: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },

      _count: {
        select: {
          members: true,
        },
      },
    },
  });
};

/*
 * Добавляет пользователя в группу
 * по коду приглашения.
 */
export const joinStudyGroup = async (
  userId: string,
  input: JoinStudyGroupInput,
) => {
  const group =
    await prisma.studyGroup.findUnique({
      where: {
        inviteCode: input.inviteCode,
      },

      select: {
        id: true,

        members: {
          where: {
            userId,
          },

          select: {
            id: true,
          },
        },
      },
    });

  if (!group) {
    throw new AppError(
      404,
      'Учебная группа с таким кодом приглашения не найдена',
    );
  }

  if (group.members.length > 0) {
    throw new AppError(
      409,
      'Пользователь уже состоит в этой учебной группе',
    );
  }

  try {
    const membership =
      await prisma.studyGroupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: 'MEMBER',
        },

        include: {
          group: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },

              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
      });

    return {
      ...membership.group,

      currentUserRole:
        membership.role,

      currentUserJoinedAt:
        membership.joinedAt,
    };
  } catch (error) {
    const isUniqueConstraintError =
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002';

    if (isUniqueConstraintError) {
      throw new AppError(
        409,
        'Пользователь уже состоит в этой учебной группе',
      );
    }

    throw error;
  }
};


/*
 * Позволяет обычному участнику выйти
 * из учебной группы.
 *
 * Владелец не может выйти из собственной группы,
 * потому что тогда группа останется без владельца.
 */
export const leaveStudyGroup = async (
  userId: string,
  groupId: string,
): Promise<void> => {
  /*
   * Ищем membership конкретного пользователя
   * в конкретной группе.
   */
  const membership =
    await prisma.studyGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },

      select: {
        id: true,
        role: true,
      },
    });

  /*
   * Пользователь не состоит в группе
   * либо самой группы уже нет.
   */
  if (!membership) {
    throw new AppError(
      404,
      'Учебная группа не найдена или пользователь в ней не состоит',
    );
  }

  /*
   * OWNER не может просто выйти,
   * иначе группа останется без владельца.
   */
  if (membership.role === 'OWNER') {
    throw new AppError(
      409,
      'Владелец не может выйти из собственной учебной группы',
    );
  }

  /*
   * Удаляем только запись участия.
   *
   * Сам пользователь и сама группа
   * остаются в базе данных.
   */
  await prisma.studyGroupMember.delete({
    where: {
      id: membership.id,
    },
  });
};

/*
 * Удаляет обычного участника из учебной группы.
 *
 * Выполнить операцию может только владелец группы.
 * Сам аккаунт пользователя не удаляется —
 * удаляется только его membership в этой группе.
 */
export const removeStudyGroupMember = async (
  requesterUserId: string,
  groupId: string,
  targetUserId: string,
): Promise<void> => {
  /*
   * Ищем группу так, чтобы текущий пользователь
   * обязательно был её участником.
   *
   * Это позволяет не раскрывать постороннему
   * пользователю существование группы.
   */
  const group =
    await prisma.studyGroup.findFirst({
      where: {
        id: groupId,

        members: {
          some: {
            userId: requesterUserId,
          },
        },
      },

      select: {
        id: true,
        ownerId: true,
      },
    });

  if (!group) {
    throw new AppError(
      404,
      'Учебная группа не найдена',
    );
  }

  /*
   * Пользователь состоит в группе,
   * но не является её владельцем.
   */
  if (group.ownerId !== requesterUserId) {
    throw new AppError(
      403,
      'Только владелец может удалять участников учебной группы',
    );
  }

  /*
   * Владельца нельзя удалить через этот endpoint.
   *
   * Иначе группа останется без владельца.
   */
  if (targetUserId === group.ownerId) {
    throw new AppError(
      409,
      'Владельца нельзя удалить из учебной группы',
    );
  }

  /*
   * Проверяем, состоит ли выбранный пользователь
   * именно в этой группе.
   */
  const targetMembership =
    await prisma.studyGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },

      select: {
        id: true,
        role: true,
      },
    });

  if (!targetMembership) {
    throw new AppError(
      404,
      'Участник учебной группы не найден',
    );
  }

  /*
   * Дополнительная защита на случай
   * несогласованных данных в базе.
   */
  if (targetMembership.role === 'OWNER') {
    throw new AppError(
      409,
      'Владельца нельзя удалить из учебной группы',
    );
  }

  await prisma.studyGroupMember.delete({
    where: {
      id: targetMembership.id,
    },
  });
};

/*
 * Полностью удаляет учебную группу.
 *
 * Выполнить операцию может только владелец.
 *
 * Связанные записи StudyGroupMember
 * удаляются PostgreSQL автоматически
 * благодаря onDelete: Cascade.
 */
export const deleteStudyGroup = async (
  requesterUserId: string,
  groupId: string,
): Promise<void> => {
  /*
   * Ищем группу только среди тех,
   * в которых состоит текущий пользователь.
   *
   * Постороннему пользователю не раскрываем,
   * существует ли такая группа.
   */
  const group =
    await prisma.studyGroup.findFirst({
      where: {
        id: groupId,

        members: {
          some: {
            userId: requesterUserId,
          },
        },
      },

      select: {
        id: true,
        ownerId: true,
      },
    });

  if (!group) {
    throw new AppError(
      404,
      'Учебная группа не найдена',
    );
  }

  /*
   * Пользователь состоит в группе,
   * но является обычным участником.
   */
  if (group.ownerId !== requesterUserId) {
    throw new AppError(
      403,
      'Только владелец может удалить учебную группу',
    );
  }

  try {
    await prisma.studyGroup.delete({
      where: {
        id: groupId,
      },
    });
  } catch (error) {
    /*
     * Между проверкой и удалением группа
     * теоретически могла быть удалена
     * другим запросом.
     *
     * P2025 означает, что запись
     * для удаления уже не существует.
     */
    const isRecordNotFoundError =
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025';

    if (isRecordNotFoundError) {
      throw new AppError(
        404,
        'Учебная группа не найдена',
      );
    }

    throw error;
  }
};