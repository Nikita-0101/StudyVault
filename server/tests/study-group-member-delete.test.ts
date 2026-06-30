import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  Prisma,
} from '../src/generated/prisma/client.js';

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

  deleteGroup: vi.fn<
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

        delete:
          prismaMocks.deleteGroup,
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

const TEST_OWNER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_MEMBER_ID =
  '22222222-2222-4222-8222-222222222222';

const TEST_GROUP_ID =
  '33333333-3333-4333-8333-333333333333';

const TEST_MEMBERSHIP_ID =
  '44444444-4444-4444-8444-444444444444';

const TEST_OTHER_OWNER_ID =
  '55555555-5555-4555-8555-555555555555';

const createTestAccessToken = (
  userId: string =
    TEST_OWNER_ID,
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

describe(
  'Удаление участника и учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks
        .findGroup
        .mockReset();

      prismaMocks
        .findMembership
        .mockReset();

      prismaMocks
        .deleteMembership
        .mockReset();

      prismaMocks
        .deleteGroup
        .mockReset();

      /*
       * По умолчанию запрос выполняет
       * владелец существующей группы.
       */
      prismaMocks
        .findGroup
        .mockResolvedValue({
          id: TEST_GROUP_ID,
          ownerId: TEST_OWNER_ID,
        });

      /*
       * По умолчанию удаляемый пользователь
       * является обычным участником.
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

      prismaMocks
        .deleteGroup
        .mockResolvedValue({
          id: TEST_GROUP_ID,
        });
    });

    it(
      'позволяет владельцу удалить обычного участника',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/${TEST_MEMBER_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        /*
         * Сначала проверяется группа
         * и право текущего пользователя.
         */
        expect(
          prismaMocks.findGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_GROUP_ID,

            members: {
              some: {
                userId:
                  TEST_OWNER_ID,
              },
            },
          },

          select: {
            id: true,
            ownerId: true,
          },
        });

        /*
         * Затем ищется membership
         * удаляемого пользователя.
         */
        expect(
          prismaMocks.findMembership,
        ).toHaveBeenCalledWith({
          where: {
            groupId_userId: {
              groupId:
                TEST_GROUP_ID,

              userId:
                TEST_MEMBER_ID,
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

        /*
         * Аккаунт пользователя и группа
         * при этом не удаляются.
         */
        expect(
          prismaMocks.deleteGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 403, если MEMBER пытается удалить участника',
      async () => {
        prismaMocks
          .findGroup
          .mockResolvedValue({
            id: TEST_GROUP_ID,

            ownerId:
              TEST_OTHER_OWNER_ID,
          });

        const memberToken =
          createTestAccessToken(
            TEST_MEMBER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/${TEST_OWNER_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${memberToken}`,
            );

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец может удалять участников учебной группы',
        );

        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не позволяет владельцу удалить самого себя',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/${TEST_OWNER_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(409);

        expect(response.body.message).toBe(
          'Владельца нельзя удалить из учебной группы',
        );

        /*
         * Проверка срабатывает до поиска
         * membership владельца.
         */
        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если удаляемый участник не найден',
      async () => {
        prismaMocks
          .findMembership
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/${TEST_MEMBER_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Участник учебной группы не найден',
        );

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не удаляет membership с ролью OWNER',
      async () => {
        /*
         * Дополнительная защита на случай,
         * если данные в базе оказались
         * несогласованными.
         */
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
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/${TEST_MEMBER_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(409);

        expect(response.body.message).toBe(
          'Владельца нельзя удалить из учебной группы',
        );

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 при некорректном UUID участника',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}/members/123`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор участника',
        );

        /*
         * Запрос останавливается
         * на Zod-валидации.
         */
        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.findMembership,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'позволяет владельцу полностью удалить группу',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        expect(
          prismaMocks.findGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_GROUP_ID,

            members: {
              some: {
                userId:
                  TEST_OWNER_ID,
              },
            },
          },

          select: {
            id: true,
            ownerId: true,
          },
        });

        expect(
          prismaMocks.deleteGroup,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.deleteGroup,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_GROUP_ID,
          },
        });

        expect(
          prismaMocks.deleteMembership,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 403, если MEMBER пытается удалить группу',
      async () => {
        prismaMocks
          .findGroup
          .mockResolvedValue({
            id: TEST_GROUP_ID,

            ownerId:
              TEST_OTHER_OWNER_ID,
          });

        const memberToken =
          createTestAccessToken(
            TEST_MEMBER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${TEST_GROUP_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${memberToken}`,
            );

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец может удалить учебную группу',
        );

        expect(
          prismaMocks.deleteGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 постороннему пользователю при удалении группы',
      async () => {
        prismaMocks
          .findGroup
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
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

        expect(
          prismaMocks.deleteGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'преобразует ошибку Prisma P2025 в ответ 404',
      async () => {
        /*
         * Имитируем конкурентную ситуацию:
         *
         * проверка findFirst прошла,
         * но до delete другой запрос
         * уже успел удалить группу.
         */
        const prismaError =
          new Prisma.PrismaClientKnownRequestError(
            'Запись не существует',
            {
              code: 'P2025',
              clientVersion: '7.8.0',
            },
          );

        prismaMocks
          .deleteGroup
          .mockRejectedValue(
            prismaError,
          );

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
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

        expect(
          prismaMocks.deleteGroup,
        ).toHaveBeenCalledTimes(1);
      },
    );
  },
);