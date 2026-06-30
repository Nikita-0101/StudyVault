import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

type GroupDetailsRecord = {
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
    id: string;
    userId: string;
    role: 'OWNER' | 'MEMBER';
    joinedAt: Date;

    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }>;

  _count: {
    members: number;
  };
};

const prismaMocks = vi.hoisted(() => ({
  findGroupByInviteCode: vi.fn<
    (
      args: unknown,
    ) => Promise<
      {
        id: string;

        members: Array<{
          id: string;
        }>;
      } | null
    >
  >(),

  createMembership: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),

  findGroupDetails: vi.fn<
    (
      args: unknown,
    ) => Promise<GroupDetailsRecord | null>
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      studyGroup: {
        findUnique:
          prismaMocks.findGroupByInviteCode,

        findFirst:
          prismaMocks.findGroupDetails,
      },

      studyGroupMember: {
        create:
          prismaMocks.createMembership,
      },
    },
  }),
);

import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_OWNER_ID =
  '22222222-2222-4222-8222-222222222222';

const TEST_GROUP_ID =
  '33333333-3333-4333-8333-333333333333';

const TEST_MEMBERSHIP_ID =
  '44444444-4444-4444-8444-444444444444';

const TEST_OWNER_MEMBERSHIP_ID =
  '55555555-5555-4555-8555-555555555555';

const TEST_INVITE_CODE =
  'KUHUX7BC';

const TEST_CREATED_AT =
  new Date(
    '2026-06-30T14:56:11.827Z',
  );

const TEST_MEMBER_JOINED_AT =
  new Date(
    '2026-06-30T15:03:12.344Z',
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

const createGroupDetails =
  (): GroupDetailsRecord => ({
    id: TEST_GROUP_ID,
    ownerId: TEST_OWNER_ID,

    name:
      'Математический анализ',

    description:
      'Подготовка к экзамену',

    inviteCode:
      TEST_INVITE_CODE,

    createdAt:
      TEST_CREATED_AT,

    updatedAt:
      TEST_CREATED_AT,

    owner: {
      id: TEST_OWNER_ID,
      name: 'Никита',
      avatarUrl: null,
    },

    members: [
      {
        id:
          TEST_OWNER_MEMBERSHIP_ID,

        userId:
          TEST_OWNER_ID,

        role: 'OWNER',

        joinedAt:
          TEST_CREATED_AT,

        user: {
          id: TEST_OWNER_ID,
          name: 'Никита',
          avatarUrl: null,
        },
      },

      {
        id:
          TEST_MEMBERSHIP_ID,

        userId:
          TEST_USER_ID,

        role: 'MEMBER',

        joinedAt:
          TEST_MEMBER_JOINED_AT,

        user: {
          id: TEST_USER_ID,
          name:
            'Тестовый студент',
          avatarUrl: null,
        },
      },
    ],

    _count: {
      members: 2,
    },
  });

describe(
  'Вступление и получение учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks
        .findGroupByInviteCode
        .mockReset();

      prismaMocks
        .createMembership
        .mockReset();

      prismaMocks
        .findGroupDetails
        .mockReset();

      prismaMocks
        .findGroupByInviteCode
        .mockResolvedValue({
          id: TEST_GROUP_ID,
          members: [],
        });

      prismaMocks
        .createMembership
        .mockResolvedValue({
          id:
            TEST_MEMBERSHIP_ID,

          groupId:
            TEST_GROUP_ID,

          userId:
            TEST_USER_ID,

          role: 'MEMBER',

          joinedAt:
            TEST_MEMBER_JOINED_AT,

          group: {
            id:
              TEST_GROUP_ID,

            ownerId:
              TEST_OWNER_ID,

            name:
              'Математический анализ',

            description:
              'Подготовка к экзамену',

            inviteCode:
              TEST_INVITE_CODE,

            createdAt:
              TEST_CREATED_AT,

            updatedAt:
              TEST_CREATED_AT,

            owner: {
              id:
                TEST_OWNER_ID,

              name: 'Никита',
              avatarUrl: null,
            },

            _count: {
              members: 2,
            },
          },
        });

      prismaMocks
        .findGroupDetails
        .mockResolvedValue(
          createGroupDetails(),
        );
    });

    it(
      'добавляет пользователя в группу с ролью MEMBER',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups/join',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            /*
             * Передаём код маленькими буквами,
             * чтобы проверить преобразование
             * Zod-схемой в верхний регистр.
             */
            .send({
              inviteCode:
                'kuhux7bc',
            });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Вы успешно вступили в учебную группу',
        );

        expect(
          response.body.group,
        ).toEqual({
          id: TEST_GROUP_ID,
          ownerId: TEST_OWNER_ID,

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
            id: TEST_OWNER_ID,
            name: 'Никита',
            avatarUrl: null,
          },

          _count: {
            members: 2,
          },

          currentUserRole:
            'MEMBER',

          currentUserJoinedAt:
            '2026-06-30T15:03:12.344Z',
        });

        /*
         * Проверяем, что код был переведён
         * в верхний регистр до запроса к Prisma.
         */
        expect(
          prismaMocks
            .findGroupByInviteCode,
        ).toHaveBeenCalledWith({
          where: {
            inviteCode:
              TEST_INVITE_CODE,
          },

          select: {
            id: true,

            members: {
              where: {
                userId:
                  TEST_USER_ID,
              },

              select: {
                id: true,
              },
            },
          },
        });

        /*
         * Проверяем создание связи
         * User ↔ StudyGroup.
         */
        expect(
          prismaMocks
            .createMembership,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks
            .createMembership,
        ).toHaveBeenCalledWith({
          data: {
            groupId:
              TEST_GROUP_ID,

            userId:
              TEST_USER_ID,

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
      },
    );

    it(
      'возвращает 400 при некорректном формате кода',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups/join',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              inviteCode: '123',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный код приглашения',
        );

        /*
         * Некорректный запрос должен
         * остановиться на Zod-валидации.
         */
        expect(
          prismaMocks
            .findGroupByInviteCode,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks
            .createMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если группы с таким кодом нет',
      async () => {
        prismaMocks
          .findGroupByInviteCode
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups/join',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              inviteCode:
                TEST_INVITE_CODE,
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа с таким кодом приглашения не найдена',
        );

        expect(
          prismaMocks
            .createMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 409, если пользователь уже состоит в группе',
      async () => {
        prismaMocks
          .findGroupByInviteCode
          .mockResolvedValue({
            id: TEST_GROUP_ID,

            members: [
              {
                id:
                  TEST_MEMBERSHIP_ID,
              },
            ],
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/study-groups/join',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              inviteCode:
                TEST_INVITE_CODE,
            });

        expect(response.status).toBe(409);

        expect(response.body.message).toBe(
          'Пользователь уже состоит в этой учебной группе',
        );

        expect(
          prismaMocks
            .createMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает конкретную группу участнику',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.group,
        ).toMatchObject({
          id: TEST_GROUP_ID,
          ownerId: TEST_OWNER_ID,

          name:
            'Математический анализ',

          inviteCode:
            TEST_INVITE_CODE,

          currentUserRole:
            'MEMBER',

          currentUserJoinedAt:
            '2026-06-30T15:03:12.344Z',

          _count: {
            members: 2,
          },
        });

        expect(
          response.body.group.members,
        ).toHaveLength(2);

        expect(
          response.body.group.members,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              userId:
                TEST_OWNER_ID,

              role: 'OWNER',

              user:
                expect.objectContaining({
                  id:
                    TEST_OWNER_ID,

                  name: 'Никита',
                }),
            }),

            expect.objectContaining({
              userId:
                TEST_USER_ID,

              role: 'MEMBER',

              user:
                expect.objectContaining({
                  id:
                    TEST_USER_ID,

                  name:
                    'Тестовый студент',
                }),
            }),
          ]),
        );

        /*
         * Группа ищется только среди тех,
         * где пользователь из JWT является
         * участником.
         */
        expect(
          prismaMocks
            .findGroupDetails,
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
      },
    );

    it(
      'возвращает 400 при некорректном UUID группы',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              '/api/study-groups/123',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор учебной группы',
        );

        expect(
          prismaMocks
            .findGroupDetails,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 постороннему пользователю',
      async () => {
        /*
         * findFirst возвращает null и когда:
         *
         * 1. группы нет;
         * 2. пользователь не состоит в группе.
         */
        prismaMocks
          .findGroupDetails
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );
      },
    );
  },
);