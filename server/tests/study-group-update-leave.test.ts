import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findGroup: vi.fn<
    (
      args: unknown,
    ) => Promise<
      {
        id: string;
        ownerId: string;
      } | null
    >
  >(),

  updateGroup: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),

  findMembership: vi.fn<
    (
      args: unknown,
    ) => Promise<
      {
        id: string;
        role: 'OWNER' | 'MEMBER';
      } | null
    >
  >(),

  deleteMembership: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      studyGroup: {
        findFirst:
          prismaMocks.findGroup,

        update:
          prismaMocks.updateGroup,
      },

      studyGroupMember: {
        findUnique:
          prismaMocks.findMembership,

        delete:
          prismaMocks.deleteMembership,
      },
    },
  }),
);

import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_OTHER_OWNER_ID =
  '22222222-2222-4222-8222-222222222222';

const TEST_GROUP_ID =
  '33333333-3333-4333-8333-333333333333';

const TEST_MEMBERSHIP_ID =
  '44444444-4444-4444-8444-444444444444';

const TEST_INVITE_CODE =
  'KUHUX7BC';

const TEST_CREATED_AT =
  new Date(
    '2026-06-30T14:56:11.827Z',
  );

const TEST_UPDATED_AT =
  new Date(
    '2026-06-30T16:00:00.000Z',
  );

const createTestAccessToken = (): string => {
  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET отсутствует в тестовом окружении',
    );
  }

  return jwt.sign(
    {
      userId: TEST_USER_ID,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
  );
};

const createUpdatedGroup = (
  description:
    string | null =
      'Совместная подготовка и разбор билетов',
) => ({
  id: TEST_GROUP_ID,
  ownerId: TEST_USER_ID,

  name:
    'Математический анализ — экзамен',

  description,

  inviteCode:
    TEST_INVITE_CODE,

  createdAt:
    TEST_CREATED_AT,

  updatedAt:
    TEST_UPDATED_AT,

  owner: {
    id: TEST_USER_ID,
    name: 'Никита',
    avatarUrl: null,
  },

  _count: {
    members: 2,
  },
});

describe(
  'Изменение группы и выход участника',
  () => {
    beforeEach(() => {
      prismaMocks
        .findGroup
        .mockReset();

      prismaMocks
        .updateGroup
        .mockReset();

      prismaMocks
        .findMembership
        .mockReset();

      prismaMocks
        .deleteMembership
        .mockReset();

      /*
       * По умолчанию текущий пользователь
       * является владельцем группы.
       */
      prismaMocks
        .findGroup
        .mockResolvedValue({
          id: TEST_GROUP_ID,
          ownerId: TEST_USER_ID,
        });

      prismaMocks
        .updateGroup
        .mockResolvedValue(
          createUpdatedGroup(),
        );

      /*
       * Для тестов выхода по умолчанию
       * текущий пользователь — MEMBER.
       */
      prismaMocks
        .findMembership
        .mockResolvedValue({
          id:
            TEST_MEMBERSHIP_ID,

          role: 'MEMBER',
        });

      prismaMocks
        .deleteMembership
        .mockResolvedValue({
          id:
            TEST_MEMBERSHIP_ID,
        });
    });

    it(
      'позволяет владельцу изменить название и описание группы',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Математический анализ — экзамен',

              description:
                'Совместная подготовка и разбор билетов',
            });

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
          'Учебная группа обновлена',
        );

        expect(
          response.body.group,
        ).toEqual({
          id: TEST_GROUP_ID,
          ownerId: TEST_USER_ID,

          name:
            'Математический анализ — экзамен',

          description:
            'Совместная подготовка и разбор билетов',

          inviteCode:
            TEST_INVITE_CODE,

          createdAt:
            '2026-06-30T14:56:11.827Z',

          updatedAt:
            '2026-06-30T16:00:00.000Z',

          owner: {
            id: TEST_USER_ID,
            name: 'Никита',
            avatarUrl: null,
          },

          _count: {
            members: 2,
          },
        });

        /*
         * Проверяем одновременно:
         *
         * - UUID группы;
         * - membership пользователя;
         * - ownerId из JWT.
         */
        expect(
          prismaMocks.findGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_GROUP_ID,

            members: {
              some: {
                userId:
                  TEST_USER_ID,
              },
            },
          },

          select: {
            id: true,
            ownerId: true,
          },
        });

        expect(
          prismaMocks.updateGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_GROUP_ID,
          },

          data: {
            name:
              'Математический анализ — экзамен',

            description:
              'Совместная подготовка и разбор билетов',
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
      },
    );

    it(
      'позволяет владельцу удалить описание через null',
      async () => {
        prismaMocks
          .updateGroup
          .mockResolvedValue(
            createUpdatedGroup(null),
          );

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              description: null,
            });

        expect(response.status).toBe(200);

        expect(
          response.body.group.description,
        ).toBeNull();

        /*
         * Название не передано,
         * поэтому в data его быть не должно.
         */
        expect(
          prismaMocks.updateGroup,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              id: TEST_GROUP_ID,
            },

            data: {
              description: null,
            },
          }),
        );
      },
    );

    it(
      'возвращает 403, если MEMBER пытается изменить группу',
      async () => {
        prismaMocks
          .findGroup
          .mockResolvedValue({
            id: TEST_GROUP_ID,

            ownerId:
              TEST_OTHER_OWNER_ID,
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Попытка изменить группу',
            });

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец может изменять учебную группу',
        );

        expect(
          prismaMocks.updateGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 постороннему пользователю при изменении группы',
      async () => {
        prismaMocks
          .findGroup
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Новое название',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );

        expect(
          prismaMocks.updateGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 при пустом body обновления',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({});

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные учебной группы',
        );

        /*
         * Пустой запрос останавливается
         * на Zod-валидации.
         */
        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'позволяет обычному участнику выйти из группы',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/study-groups/${TEST_GROUP_ID}/leave`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        /*
         * Ищем membership по составному
         * уникальному ключу:
         *
         * groupId + userId.
         */
        expect(
          prismaMocks.findMembership,
        ).toHaveBeenCalledWith({
          where: {
            groupId_userId: {
              groupId:
                TEST_GROUP_ID,

              userId:
                TEST_USER_ID,
            },
          },

          select: {
            id: true,
            role: true,
          },
        });

        expect(
          prismaMocks.deleteMembership,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.deleteMembership,
        ).toHaveBeenCalledWith({
          where: {
            id:
              TEST_MEMBERSHIP_ID,
          },
        });
      },
    );

    it(
      'не позволяет владельцу выйти из собственной группы',
      async () => {
        prismaMocks
          .findMembership
          .mockResolvedValue({
            id:
              TEST_MEMBERSHIP_ID,

            role: 'OWNER',
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/study-groups/${TEST_GROUP_ID}/leave`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(409);

        expect(response.body.message).toBe(
          'Владелец не может выйти из собственной учебной группы',
        );

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если пользователь не состоит в группе',
      async () => {
        prismaMocks
          .findMembership
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/study-groups/${TEST_GROUP_ID}/leave`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена или пользователь в ней не состоит',
        );

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );
  },
);