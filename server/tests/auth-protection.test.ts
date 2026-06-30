import request from 'supertest';
import {
  describe,
  expect,
  it,
} from 'vitest';

import { app } from '../src/app.js';

describe('Защита личных маршрутов', () => {
  it(
    'GET /api/personal-subjects без JWT возвращает 401',
    async () => {
      const response = await request(app)
        .get('/api/personal-subjects');

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        'message',
      );
    },
  );

  it(
    'GET /api/personal-subjects с неправильной схемой авторизации возвращает 401',
    async () => {
      const response = await request(app)
        .get('/api/personal-subjects')
        .set(
          'Authorization',
          'Basic some-token',
        );

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        'message',
      );
    },
  );

  it(
    'GET /api/personal-subjects с повреждённым JWT возвращает 401',
    async () => {
      const response = await request(app)
        .get('/api/personal-subjects')
        .set(
          'Authorization',
          'Bearer invalid.jwt.token',
        );

      expect(response.status).toBe(401);

      expect(response.body).toHaveProperty(
        'message',
      );
    },
  );

  it(
    'POST загрузки файла без JWT возвращает 401',
    async () => {
      const response = await request(app)
        .post(
          '/api/personal-subjects/7e18d5b3-e0c8-41ef-83fd-d81f9012c09c/materials/upload',
        )
        .field(
          'title',
          'Тестовый файл',
        )
        .attach(
          'file',
          Buffer.from('test file content'),
          {
            filename: 'test.txt',
            contentType: 'text/plain',
          },
        );

      expect(response.status).toBe(401);
    },
  );
});