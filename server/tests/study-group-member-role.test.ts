import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/*
 * Mock-функции Prisma.
 *
 * Настоящая PostgreSQL в этих тестах
 * не используется.
 */
const prismaMocks = vi.hoisted(() => ({
  findGroup: vi.fn<
    (
      args: unknown,
    ) => Promise<unknown>
  >(),

  findMembership: vi.fn<
    (
      args: unknown,
    ) => Promise<unknown>
  >(),

  updateMembership: vi.fn<
    (
      args: unknown,
    ) => Promise<unknown>
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      studyGroup: {
        findFirst:
          prismaMocks.findGroup,
      },

      studyGroupMember: {
        findUnique:
          prismaMocks.findMembership,

        update:
          prismaMocks.updateMembership,
      },
    },
  }),
);

import { app } from '../src/app.js';

const OWNER_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const MEMBER_USER_ID =
  '22222222-2222-4222-8222-222222222222';

const OUTSIDER_USER_ID =
  '33333333-3333-4333-8333-333333333333';

const GROUP_ID =
  '44444444-4444-4444-8444-444444444444';

const MEMBERSHIP_ID =
  '55555555-5555-4555-8555-555555555555';

const createTestAccessToken = (
  userId: string,
): string => {
  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET отсутствует в тестовом окружении',
    );
  }

  return jwt.sign(
    {
      userId,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
  );
};

const createMembership = (
  role: 'EDITOR' | 'MEMBER',
) => ({
  id: MEMBERSHIP_ID,
  groupId: GROUP_ID,
  userId: MEMBER_USER_ID,
  role,
  joinedAt: new Date(
    '2026-06-30T18:00:00.000Z',
  ),

  user: {
    id: MEMBER_USER_ID,
    name: 'Тестовый студент',
    avatarUrl: null,
  },
});

describe(
  'Изменение роли участника учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();
      prismaMocks.findMembership.mockReset();
      prismaMocks.updateMembership.mockReset();

      /*
       * По умолчанию запрос выполняет OWNER.
       */
      prismaMocks.findGroup
        .mockResolvedValue({
          id: GROUP_ID,
          ownerId: OWNER_USER_ID,
        });

      /*
       * Целевой пользователь по умолчанию
       * является обычным MEMBER.
       */
      prismaMocks.findMembership
        .mockResolvedValue({
          id: MEMBERSHIP_ID,
          role: 'MEMBER',
        });

      prismaMocks.updateMembership
        .mockResolvedValue(
          createMembership('EDITOR'),
        );
    });

    it(
      'OWNER назначает MEMBER роль EDITOR',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${MEMBER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
          'Роль участника учебной группы обновлена',
        );

        expect(
          response.body.membership.role,
        ).toBe('EDITOR');

        /*
         * Проверяем, что группа искалась
         * с userId владельца из JWT.
         */
        expect(
          prismaMocks.findGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: GROUP_ID,

            members: {
              some: {
                userId:
                  OWNER_USER_ID,
              },
            },
          },

          select: {
            id: true,
            ownerId: true,
          },
        });

        /*
         * Проверяем поиск конкретного
         * участника внутри конкретной группы.
         */
        expect(
          prismaMocks.findMembership,
        ).toHaveBeenCalledWith({
          where: {
            groupId_userId: {
              groupId: GROUP_ID,
              userId:
                MEMBER_USER_ID,
            },
          },

          select: {
            id: true,
            role: true,
          },
        });

        expect(
          prismaMocks.updateMembership,
        ).toHaveBeenCalledWith({
          where: {
            id: MEMBERSHIP_ID,
          },

          data: {
            role: 'EDITOR',
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
      },
    );

    it(
      'OWNER понижает EDITOR до MEMBER',
      async () => {
        prismaMocks.findMembership
          .mockResolvedValue({
            id: MEMBERSHIP_ID,
            role: 'EDITOR',
          });

        prismaMocks.updateMembership
          .mockResolvedValue(
            createMembership('MEMBER'),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${MEMBER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'MEMBER',
            });

        expect(response.status).toBe(200);

        expect(
          response.body.membership.role,
        ).toBe('MEMBER');

        expect(
          prismaMocks.updateMembership,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              role: 'MEMBER',
            },
          }),
        );
      },
    );

    it(
      'EDITOR не может изменять роли участников',
      async () => {
        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        /*
         * Пользователь состоит в группе,
         * но ownerId принадлежит другому человеку.
         */
        prismaMocks.findGroup
          .mockResolvedValue({
            id: GROUP_ID,
            ownerId: OWNER_USER_ID,
          });

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${OUTSIDER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец может изменять роли участников учебной группы',
        );

        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'посторонний пользователь получает 404',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OUTSIDER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${MEMBER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );

        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не разрешает назначить роль OWNER',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${MEMBER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'OWNER',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные роли участника',
        );

        /*
         * Запрос отклонён Zod до обращения
         * к сервису и Prisma.
         */
        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не позволяет владельцу изменить собственную роль',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${OWNER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'MEMBER',
            });

        expect(response.status).toBe(409);

        expect(response.body.message).toBe(
          'Роль владельца нельзя изменить через этот маршрут',
        );

        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если целевой пользователь не состоит в группе',
      async () => {
        prismaMocks.findMembership
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${OUTSIDER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Участник учебной группы не найден',
        );

        expect(
          prismaMocks.updateMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 для некорректного groupId',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/123/members/${MEMBER_USER_ID}/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 для некорректного userId',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/123/role`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор участника учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 401 без JWT',
      async () => {
        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/members/${MEMBER_USER_ID}/role`,
            )
            .send({
              role: 'EDITOR',
            });

        expect(response.status).toBe(401);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMembership,
        ).not.toHaveBeenCalled();
      },
    );
  },
);