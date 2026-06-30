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
  findGroup: vi.fn(),
  findTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      studyGroup: {
        findFirst:
          prismaMocks.findGroup,
      },

      studyGroupTopic: {
        findFirst:
          prismaMocks.findTopic,

        update:
          prismaMocks.updateTopic,

        delete:
          prismaMocks.deleteTopic,
      },
    },
  }),
);

import { app } from '../src/app.js';

const OWNER_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const EDITOR_USER_ID =
  '22222222-2222-4222-8222-222222222222';

const MEMBER_USER_ID =
  '33333333-3333-4333-8333-333333333333';

const OUTSIDER_USER_ID =
  '44444444-4444-4444-8444-444444444444';

const GROUP_ID =
  '55555555-5555-4555-8555-555555555555';

const TOPIC_ID =
  '66666666-6666-4666-8666-666666666666';

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

const createAccessibleGroup = (
  role:
    | 'OWNER'
    | 'EDITOR'
    | 'MEMBER',
) => ({
  id: GROUP_ID,
  ownerId: OWNER_USER_ID,

  members: [
    {
      role,
    },
  ],
});

const createTopic = ({
  name = 'Интегралы',
  description =
    'Определённые интегралы',
  color = '#4F46E5',
}: {
  name?: string;
  description?: string | null;
  color?: string | null;
} = {}) => ({
  id: TOPIC_ID,
  groupId: GROUP_ID,
  createdById: EDITOR_USER_ID,
  name,
  description,
  color,
  position: 0,

  createdAt: new Date(
    '2026-06-30T18:00:00.000Z',
  ),

  updatedAt: new Date(
    '2026-06-30T18:00:00.000Z',
  ),

  createdBy: {
    id: EDITOR_USER_ID,
    name: 'Редактор',
    avatarUrl: null,
  },
});

/*
 * Создаём объект, который проходит проверку:
 *
 * error instanceof
 * Prisma.PrismaClientKnownRequestError
 *
 * и имеет code = P2025.
 */
const createP2025Error = () =>
  Object.assign(
    Object.create(
      Prisma
        .PrismaClientKnownRequestError
        .prototype,
    ),

    {
      name:
        'PrismaClientKnownRequestError',

      message:
        'Record to update not found',

      code: 'P2025',
      clientVersion: '7.8.0',
    },
  );

describe(
  'Получение, изменение и удаление темы учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();
      prismaMocks.findTopic.mockReset();
      prismaMocks.updateTopic.mockReset();
      prismaMocks.deleteTopic.mockReset();

      prismaMocks.findGroup
        .mockResolvedValue(
          createAccessibleGroup('OWNER'),
        );

      prismaMocks.findTopic
        .mockResolvedValue(
          createTopic(),
        );

      prismaMocks.updateTopic
        .mockResolvedValue(
          createTopic({
            name:
              'Интегралы и первообразные',

            description:
              'Обновлённое описание',

            color: '#EF4444',
          }),
        );

      prismaMocks.deleteTopic
        .mockResolvedValue(
          createTopic(),
        );
    });

    it(
      'MEMBER получает конкретную тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'MEMBER',
            ),
          );

        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.topic.id,
        ).toBe(TOPIC_ID);

        expect(
          response.body.topic.groupId,
        ).toBe(GROUP_ID);

        expect(
          response.body.topic.createdBy.id,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.findTopic,
        ).toHaveBeenCalledWith({
          where: {
            id: TOPIC_ID,
            groupId: GROUP_ID,
          },

          include: {
            createdBy: {
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
      'посторонний пользователь не получает тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OUTSIDER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
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
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если тема не принадлежит указанной группе',
      async () => {
        prismaMocks.findTopic
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );
      },
    );

    it(
      'возвращает 400 для некорректного topicId',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/123`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор темы учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'EDITOR полностью изменяет тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'EDITOR',
            ),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Интегралы и первообразные',

              description:
                'Обновлённое описание',

              color: '#ef4444',
            });

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
          'Тема учебной группы обновлена',
        );

        expect(
          response.body.topic.name,
        ).toBe(
          'Интегралы и первообразные',
        );

        expect(
          response.body.topic.color,
        ).toBe('#EF4444');

        expect(
          response.body.topic.createdById,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.updateTopic,
        ).toHaveBeenCalledWith({
          where: {
            id: TOPIC_ID,
          },

          data: {
            name:
              'Интегралы и первообразные',

            description:
              'Обновлённое описание',

            color: '#EF4444',
          },

          include: {
            createdBy: {
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
      'PATCH изменяет только переданное поле',
      async () => {
        prismaMocks.updateTopic
          .mockResolvedValue(
            createTopic({
              name: 'Новые интегралы',
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Новые интегралы',
            });

        expect(response.status).toBe(200);

        expect(
          prismaMocks.updateTopic,
        ).toHaveBeenCalledWith({
          where: {
            id: TOPIC_ID,
          },

          data: {
            name: 'Новые интегралы',
          },

          include: {
            createdBy: {
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
      'null очищает описание и цвет темы',
      async () => {
        prismaMocks.updateTopic
          .mockResolvedValue(
            createTopic({
              description: null,
              color: null,
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              description: null,
              color: null,
            });

        expect(response.status).toBe(200);

        expect(
          response.body.topic.description,
        ).toBeNull();

        expect(
          response.body.topic.color,
        ).toBeNull();

        expect(
          prismaMocks.updateTopic,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              description: null,
              color: null,
            },
          }),
        );
      },
    );

    it(
      'MEMBER не может изменять тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'MEMBER',
            ),
          );

        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name:
                'Запрещённое изменение',
            });

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец или редактор может управлять темами учебной группы',
        );

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'пустой PATCH возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({});

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные темы учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'OWNER удаляет тему',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);
        expect(response.text).toBe('');

        expect(
          prismaMocks.deleteTopic,
        ).toHaveBeenCalledWith({
          where: {
            id: TOPIC_ID,
          },
        });
      },
    );

    it(
      'EDITOR удаляет тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'EDITOR',
            ),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        expect(
          prismaMocks.deleteTopic,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'MEMBER не может удалить тему',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'MEMBER',
            ),
          );

        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(403);

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 при удалении несуществующей темы',
      async () => {
        prismaMocks.findTopic
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );

        expect(
          prismaMocks.deleteTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'преобразует Prisma P2025 при обновлении в 404',
      async () => {
        prismaMocks.updateTopic
          .mockRejectedValue(
            createP2025Error(),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Новые интегралы',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );
      },
    );

    it(
      'преобразует Prisma P2025 при удалении в 404',
      async () => {
        prismaMocks.deleteTopic
          .mockRejectedValue(
            createP2025Error(),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );
      },
    );
  },
);