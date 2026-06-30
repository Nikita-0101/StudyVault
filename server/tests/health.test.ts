import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/*
 * vi.hoisted создаёт mock-функцию до того,
 * как приложение импортирует Prisma.
 */
const prismaMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

/*
 * Вместо настоящего модуля prisma.ts
 * Vitest подставит тестовый объект.
 *
 * Никакого подключения к PostgreSQL
 * в этом файле теперь не произойдёт.
 */
vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      $queryRaw: prismaMocks.queryRaw,
    },
  }),
);

/*
 * Импорт приложения находится после описания mock.
 *
 * vi.mock поднимается Vitest автоматически,
 * но такой порядок проще читать.
 */
import { app } from '../src/app.js';

describe('Базовые маршруты приложения', () => {
  beforeEach(() => {
    /*
     * Перед каждым тестом очищаем результаты
     * предыдущих вызовов.
     */
    prismaMocks.queryRaw.mockReset();

    /*
     * Имитируем успешный ответ PostgreSQL
     * на SELECT 1.
     */
    prismaMocks.queryRaw.mockResolvedValue([
      {
        result: 1,
      },
    ]);
  });

  it(
    'GET /api/health возвращает 200 и JSON',
    async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);

      expect(
        response.headers['content-type'],
      ).toContain('application/json');

      expect(typeof response.body).toBe(
        'object',
      );

      /*
       * Дополнительно проверяем,
       * что health-маршрут действительно
       * попытался проверить базу данных.
       */
      expect(
        prismaMocks.queryRaw,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it(
    'неизвестный маршрут возвращает 404',
    async () => {
      const response = await request(app)
        .get('/api/unknown-route');

      expect(response.status).toBe(404);

      expect(response.body).toHaveProperty(
        'message',
      );
    },
  );
});