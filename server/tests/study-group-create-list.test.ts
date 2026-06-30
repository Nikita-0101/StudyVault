import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

type StudyGroupListRecord = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;

  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };

  members: Array<{
    role: 'OWNER' | 'MEMBER';
    joinedAt: Date;
  }>;

  _count: {
    members: number;
  };
};

const prismaMocks = vi.hoisted(() => ({
  createGroup: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),

  findGroups: vi.fn<
    (
      args: unknown,
    ) => Promise<StudyGroupListRecord[]>
  >(),
}));

const inviteCodeMocks = vi.hoisted(() => ({
  generateInviteCode: vi.fn<
    () => string
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      studyGroup: {
        create:
          prismaMocks.createGroup,

        findMany:
          prismaMocks.findGroups,
      },
    },
  }),
);

vi.mock(
  '../src/utils/invite-code.js',
  () => ({
    generateInviteCode:
      inviteCodeMocks.generateInviteCode,
  }),
);

import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_GROUP_ID =
  '22222222-2222-4222-8222-222222222222';

const TEST_MEMBER_GROUP_ID =
  '33333333-3333-4333-8333-333333333333';

const TEST_OTHER_OWNER_ID =
  '44444444-4444-4444-8444-444444444444';

const TEST_INVITE_CODE =
  'KUHUX7BC';

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

describe(
  'Создание и получение учебных групп',
  () => {
    beforeEach(() => {
      prismaMocks.createGroup.mockReset();
      prismaMocks.findGroups.mockReset();

      inviteCodeMocks
        .generateInviteCode
        .mockReset();

      inviteCodeMocks
        .generateInviteCode
        .mockReturnValue(
          TEST_INVITE_CODE,
        );

      prismaMocks.findGroups
        .mockResolvedValue([]);
    });

    it(
      'создаёт группу и добавляет владельца как OWNER',
      async () => {
        const createdAt =
          new Date(
            '2026-06-30T14:56:11.827Z',
          );

        const updatedAt =
          new Date(
            '2026-06-30T14:56:11.827Z',
          );

        prismaMocks.createGroup
          .mockResolvedValue({
            id: TEST_GROUP_ID,
            ownerId: TEST_USER_ID,
            name:
              'Математический анализ',
            description:
              'Подготовка к экзамену',
            inviteCode:
              TEST_INVITE_CODE,
            createdAt,
            updatedAt,

            owner: {
              id: TEST_USER_ID,
              name: 'Никита',
              avatarUrl: null,
            },

            _count: {
              members: 1,
            },
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Математический анализ',

              description:
                'Подготовка к экзамену',
            });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Учебная группа создана',
        );

        expect(
          response.body.group,
        ).toEqual({
          id: TEST_GROUP_ID,
          ownerId: TEST_USER_ID,
          name:
            'Математический анализ',
          description:
            'Подготовка к экзамену',
          inviteCode:
            TEST_INVITE_CODE,

          createdAt:
            '2026-06-30T14:56:11.827Z',

          updatedAt:
            '2026-06-30T14:56:11.827Z',

          owner: {
            id: TEST_USER_ID,
            name: 'Никита',
            avatarUrl: null,
          },

          _count: {
            members: 1,
          },
        });

        expect(
          inviteCodeMocks
            .generateInviteCode,
        ).toHaveBeenCalledTimes(1);

        /*
         * Проверяем главное бизнес-правило:
         *
         * пользователь из JWT становится
         * владельцем группы и первым участником
         * с ролью OWNER.
         */
        expect(
          prismaMocks.createGroup,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.createGroup,
        ).toHaveBeenCalledWith({
          data: {
            ownerId: TEST_USER_ID,

            name:
              'Математический анализ',

            description:
              'Подготовка к экзамену',

            inviteCode:
              TEST_INVITE_CODE,

            members: {
              create: {
                userId: TEST_USER_ID,
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
      },
    );

    it(
      'возвращает 400 при отсутствии названия группы',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              description:
                'Описание без названия',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные учебной группы',
        );

        /*
         * При ошибке Zod-валидации
         * сервис и база не вызываются.
         */
        expect(
          inviteCodeMocks
            .generateInviteCode,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не позволяет создать группу без JWT',
      async () => {
        const response =
          await request(app)
            .post(
              '/api/study-groups',
            )
            .send({
              name:
                'Математический анализ',
            });

        expect(response.status).toBe(401);

        /*
         * Запрос должен остановиться
         * в authenticate middleware.
         */
        expect(
          inviteCodeMocks
            .generateInviteCode,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает группы пользователя с ролями OWNER и MEMBER',
      async () => {
        const ownerJoinedAt =
          new Date(
            '2026-06-30T14:56:11.827Z',
          );

        const memberJoinedAt =
          new Date(
            '2026-06-30T15:03:12.344Z',
          );

        prismaMocks.findGroups
          .mockResolvedValue([
            {
              id: TEST_GROUP_ID,
              ownerId: TEST_USER_ID,
              name:
                'Математический анализ',
              description:
                'Подготовка к экзамену',
              inviteCode:
                TEST_INVITE_CODE,

              createdAt:
                new Date(
                  '2026-06-30T14:56:11.827Z',
                ),

              updatedAt:
                new Date(
                  '2026-06-30T14:56:11.827Z',
                ),

              owner: {
                id: TEST_USER_ID,
                name: 'Никита',
                avatarUrl: null,
              },

              members: [
                {
                  role: 'OWNER',
                  joinedAt:
                    ownerJoinedAt,
                },
              ],

              _count: {
                members: 2,
              },
            },

            {
              id:
                TEST_MEMBER_GROUP_ID,

              ownerId:
                TEST_OTHER_OWNER_ID,

              name: 'Физика',
              description: null,
              inviteCode:
                'ABCDEFGH',

              createdAt:
                new Date(
                  '2026-06-29T10:00:00.000Z',
                ),

              updatedAt:
                new Date(
                  '2026-06-29T10:00:00.000Z',
                ),

              owner: {
                id:
                  TEST_OTHER_OWNER_ID,
                name: 'Артём',
                avatarUrl: null,
              },

              members: [
                {
                  role: 'MEMBER',
                  joinedAt:
                    memberJoinedAt,
                },
              ],

              _count: {
                members: 3,
              },
            },
          ]);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              '/api/study-groups',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.groups,
        ).toEqual([
          {
            id: TEST_GROUP_ID,
            ownerId: TEST_USER_ID,
            name:
              'Математический анализ',
            description:
              'Подготовка к экзамену',
            inviteCode:
              TEST_INVITE_CODE,

            createdAt:
              '2026-06-30T14:56:11.827Z',

            updatedAt:
              '2026-06-30T14:56:11.827Z',

            owner: {
              id: TEST_USER_ID,
              name: 'Никита',
              avatarUrl: null,
            },

            _count: {
              members: 2,
            },

            currentUserRole:
              'OWNER',

            currentUserJoinedAt:
              '2026-06-30T14:56:11.827Z',
          },

          {
            id:
              TEST_MEMBER_GROUP_ID,

            ownerId:
              TEST_OTHER_OWNER_ID,

            name: 'Физика',
            description: null,
            inviteCode:
              'ABCDEFGH',

            createdAt:
              '2026-06-29T10:00:00.000Z',

            updatedAt:
              '2026-06-29T10:00:00.000Z',

            owner: {
              id:
                TEST_OTHER_OWNER_ID,
              name: 'Артём',
              avatarUrl: null,
            },

            _count: {
              members: 3,
            },

            currentUserRole:
              'MEMBER',

            currentUserJoinedAt:
              '2026-06-30T15:03:12.344Z',
          },
        ]);

        /*
         * Проверяем, что Prisma ищет группы,
         * где текущий пользователь состоит
         * хотя бы в одной membership-записи.
         */
        expect(
          prismaMocks.findGroups,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.findGroups,
        ).toHaveBeenCalledWith({
          where: {
            members: {
              some: {
                userId:
                  TEST_USER_ID,
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
                userId:
                  TEST_USER_ID,
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
      },
    );

    it(
      'возвращает пустой список, если пользователь не состоит ни в одной группе',
      async () => {
        prismaMocks.findGroups
          .mockResolvedValue([]);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              '/api/study-groups',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
          groups: [],
        });

        expect(
          prismaMocks.findGroups,
        ).toHaveBeenCalledTimes(1);
      },
    );
  },
);