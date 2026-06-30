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
  createSubject: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      personalSubject: {
        create: prismaMocks.createSubject,
      },
    },
  }),
);

import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_SUBJECT_ID =
  '22222222-2222-4222-8222-222222222222';

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
  'POST /api/personal-subjects',
  () => {
    beforeEach(() => {
      prismaMocks.createSubject.mockReset();
    });

    it(
      'создаёт предмет для пользователя из JWT',
      async () => {
        const createdAt =
          new Date(
            '2026-06-30T12:00:00.000Z',
          );

        const updatedAt =
          new Date(
            '2026-06-30T12:00:00.000Z',
          );

        prismaMocks.createSubject
          .mockResolvedValue({
            id: TEST_SUBJECT_ID,
            ownerId: TEST_USER_ID,
            name: 'Физика',
            description:
              'Лекции и лабораторные работы',
            color: '#4F46E5',
            createdAt,
            updatedAt,
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/personal-subjects',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Физика',
              description:
                'Лекции и лабораторные работы',
              color: '#4F46E5',
            });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Личный предмет создан',
        );

        expect(
          response.body.subject,
        ).toMatchObject({
          id: TEST_SUBJECT_ID,
          ownerId: TEST_USER_ID,
          name: 'Физика',
          description:
            'Лекции и лабораторные работы',
          color: '#4F46E5',
          createdAt:
            '2026-06-30T12:00:00.000Z',
          updatedAt:
            '2026-06-30T12:00:00.000Z',
        });

        /*
         * Проверяем, что ownerId взят
         * именно из JWT, а не из body.
         */
        expect(
          prismaMocks.createSubject,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.createSubject,
        ).toHaveBeenCalledWith({
          data: {
            ownerId: TEST_USER_ID,
            name: 'Физика',
            description:
              'Лекции и лабораторные работы',
            color: '#4F46E5',
          },
        });
      },
    );

    it(
      'возвращает 400 при отсутствии обязательного названия',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              '/api/personal-subjects',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              description:
                'Предмет без названия',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные личного предмета',
        );

        /*
         * При ошибке валидации обращение
         * к базе происходить не должно.
         */
        expect(
          prismaMocks.createSubject,
        ).not.toHaveBeenCalled();
      },
    );
  },
);