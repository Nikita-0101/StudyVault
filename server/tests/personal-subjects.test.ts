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
 * Mock создаётся до импорта Express-приложения.
 *
 * В настоящем коде сервис вызывает:
 * prisma.personalSubject.findMany(...)
 *
 * В тесте вместо реальной Prisma будет
 * вызвана эта тестовая функция.
 */
const prismaMocks = vi.hoisted(() => ({
  findManySubjects: vi.fn<
    (
      args: unknown,
    ) => Promise<
      Array<Record<string, unknown>>
    >
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      personalSubject: {
        findMany:
          prismaMocks.findManySubjects,
      },
    },
  }),
);

/*
 * Импортируем приложение после объявления mock.
 */
import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

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
  'GET /api/personal-subjects',
  () => {
    beforeEach(() => {
      prismaMocks.findManySubjects
        .mockReset();
    });

    it(
      'с корректным JWT возвращает предметы текущего пользователя',
      async () => {
        const createdAt =
          new Date(
            '2026-06-30T10:00:00.000Z',
          );

        const updatedAt =
          new Date(
            '2026-06-30T10:30:00.000Z',
          );

        prismaMocks.findManySubjects
          .mockResolvedValue([
            {
              id: '22222222-2222-4222-8222-222222222222',
              ownerId: TEST_USER_ID,
              name: 'Математика',
              description:
                'Материалы по математике',
              color: '#4F46E5',
              createdAt,
              updatedAt,
            },
          ]);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              '/api/personal-subjects',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body,
        ).toHaveProperty('subjects');

        expect(
          response.body.subjects,
        ).toHaveLength(1);

        expect(
          response.body.subjects[0],
        ).toMatchObject({
          id: '22222222-2222-4222-8222-222222222222',
          ownerId: TEST_USER_ID,
          name: 'Математика',
          description:
            'Материалы по математике',
          color: '#4F46E5',
          createdAt:
            '2026-06-30T10:00:00.000Z',
          updatedAt:
            '2026-06-30T10:30:00.000Z',
        });

        /*
         * Самая важная проверка:
         * сервис запросил только предметы
         * владельца из JWT.
         */
        expect(
          prismaMocks.findManySubjects,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.findManySubjects,
        ).toHaveBeenCalledWith({
          where: {
            ownerId: TEST_USER_ID,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      },
    );

    it(
      'возвращает пустой массив, когда у пользователя нет предметов',
      async () => {
        prismaMocks.findManySubjects
          .mockResolvedValue([]);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              '/api/personal-subjects',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body,
        ).toEqual({
          subjects: [],
        });

        expect(
          prismaMocks.findManySubjects,
        ).toHaveBeenCalledWith({
          where: {
            ownerId: TEST_USER_ID,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      },
    );
  },
);