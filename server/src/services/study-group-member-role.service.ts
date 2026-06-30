import {
  Prisma,
} from '../generated/prisma/client.js';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';

import type {
  UpdateStudyGroupMemberRoleInput,
} from '../schemas/study-group-member-role.schemas.js';

/*
 * Изменяет роль участника:
 *
 * MEMBER <-> EDITOR
 *
 * Выполнить операцию может только OWNER.
 */
export const updateStudyGroupMemberRole =
  async (
    requesterUserId: string,
    groupId: string,
    targetUserId: string,
    input: UpdateStudyGroupMemberRoleInput,
  ) => {
    /*
     * Проверяем, что текущий пользователь
     * состоит в указанной группе.
     *
     * Если пользователь посторонний,
     * не раскрываем существование группы.
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
     * Только владелец назначает
     * и снимает редакторов.
     */
    if (
      group.ownerId !== requesterUserId
    ) {
      throw new AppError(
        403,
        'Только владелец может изменять роли участников учебной группы',
      );
    }

    /*
     * Владелец не может понизить
     * самого себя через этот маршрут.
     */
    if (targetUserId === group.ownerId) {
      throw new AppError(
        409,
        'Роль владельца нельзя изменить через этот маршрут',
      );
    }

    /*
     * Целевой пользователь уже должен
     * состоять в группе.
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
     * несогласованности данных.
     */
    if (
      targetMembership.role === 'OWNER'
    ) {
      throw new AppError(
        409,
        'Роль владельца нельзя изменить через этот маршрут',
      );
    }

    try {
      return await prisma.studyGroupMember.update({
        where: {
          id: targetMembership.id,
        },

        data: {
          role: input.role,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    } catch (error) {
      /*
       * Membership могла быть удалена
       * между проверкой и обновлением.
       */
      const isRecordNotFoundError =
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025';

      if (isRecordNotFoundError) {
        throw new AppError(
          404,
          'Участник учебной группы не найден',
        );
      }

      throw error;
    }
  };