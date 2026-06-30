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
  findGroup: vi.fn(),
  aggregateTopicPosition: vi.fn(),
  createTopic: vi.fn(),
  findTopics: vi.fn(),
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
        aggregate:
          prismaMocks.aggregateTopicPosition,

        create:
          prismaMocks.createTopic,

        findMany:
          prismaMocks.findTopics,
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

const FIRST_TOPIC_ID =
  '66666666-6666-4666-8666-666666666666';

const SECOND_TOPIC_ID =
  '77777777-7777-4777-8777-777777777777';

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
  id = FIRST_TOPIC_ID,
  createdById = OWNER_USER_ID,
  name = 'Интегралы',
  description =
    'Определённые и неопределённые интегралы',
  color = '#4F46E5',
  position = 0,
}: {
  id?: string;
  createdById?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  position?: number;
} = {}) => ({
  id,
  groupId: GROUP_ID,
  createdById,
  name,
  description,
  color,
  position,

  createdAt: new Date(
    '2026-06-30T18:00:00.000Z',
  ),

  updatedAt: new Date(
    '2026-06-30T18:00:00.000Z',
  ),

  createdBy: {
    id: createdById,
    name:
      createdById === OWNER_USER_ID
        ? 'Владелец'
        : 'Редактор',

    avatarUrl: null,
  },
});

describe(
  'Создание и получение тем учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();

      prismaMocks.aggregateTopicPosition
        .mockReset();

      prismaMocks.createTopic.mockReset();
      prismaMocks.findTopics.mockReset();

      /*
       * По умолчанию запрос выполняет OWNER.
       */
      prismaMocks.findGroup
        .mockResolvedValue(
          createAccessibleGroup('OWNER'),
        );

      /*
       * По умолчанию тем в группе ещё нет.
       */
      prismaMocks.aggregateTopicPosition
        .mockResolvedValue({
          _max: {
            position: null,
          },
        });

      prismaMocks.createTopic
        .mockResolvedValue(
          createTopic(),
        );

      prismaMocks.findTopics
        .mockResolvedValue([
          createTopic(),
        ]);
    });

    it(
      'OWNER создаёт первую тему с position 0',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Интегралы',

              description:
                'Определённые и неопределённые интегралы',

              color: '#4f46e5',
            });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Тема учебной группы создана',
        );

        expect(
          response.body.topic.position,
        ).toBe(0);

        expect(
          response.body.topic.color,
        ).toBe('#4F46E5');

        expect(
          response.body.topic.createdById,
        ).toBe(OWNER_USER_ID);

        expect(
          response.body.topic.createdBy.id,
        ).toBe(OWNER_USER_ID);

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

            members: {
              where: {
                userId:
                  OWNER_USER_ID,
              },

              select: {
                role: true,
              },

              take: 1,
            },
          },
        });

        expect(
          prismaMocks.aggregateTopicPosition,
        ).toHaveBeenCalledWith({
          where: {
            groupId: GROUP_ID,
          },

          _max: {
            position: true,
          },
        });

        expect(
          prismaMocks.createTopic,
        ).toHaveBeenCalledWith({
          data: {
            groupId: GROUP_ID,
            createdById:
              OWNER_USER_ID,

            name: 'Интегралы',

            description:
              'Определённые и неопределённые интегралы',

            color: '#4F46E5',
            position: 0,
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
      'EDITOR создаёт следующую тему с максимальной позицией плюс один',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'EDITOR',
            ),
          );

        prismaMocks.aggregateTopicPosition
          .mockResolvedValue({
            _max: {
              position: 4,
            },
          });

        prismaMocks.createTopic
          .mockResolvedValue(
            createTopic({
              id: SECOND_TOPIC_ID,

              createdById:
                EDITOR_USER_ID,

              name: 'Производные',
              color: '#22C55E',
              position: 5,
            }),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Производные',
              color: '#22c55e',
            });

        expect(response.status).toBe(201);

        expect(
          response.body.topic.position,
        ).toBe(5);

        expect(
          response.body.topic.createdById,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.createTopic,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data:
              expect.objectContaining({
                groupId: GROUP_ID,

                createdById:
                  EDITOR_USER_ID,

                name: 'Производные',
                color: '#22C55E',
                position: 5,
              }),
          }),
        );
      },
    );

    it(
      'MEMBER не может создавать темы',
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
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Запрещённая тема',
            });

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец или редактор может управлять темами учебной группы',
        );

        expect(
          prismaMocks.aggregateTopicPosition,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'посторонний пользователь не может создавать темы',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OUTSIDER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Чужая тема',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );

        expect(
          prismaMocks.createTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'MEMBER получает список тем',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'MEMBER',
            ),
          );

        prismaMocks.findTopics
          .mockResolvedValue([
            createTopic({
              position: 0,
            }),

            createTopic({
              id: SECOND_TOPIC_ID,

              createdById:
                EDITOR_USER_ID,

              name: 'Производные',
              color: '#22C55E',
              position: 1,
            }),
          ]);

        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.topics,
        ).toHaveLength(2);

        expect(
          response.body.topics[0]
            .position,
        ).toBe(0);

        expect(
          response.body.topics[1]
            .position,
        ).toBe(1);

        expect(
          response.body.topics[1]
            .createdBy.id,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.findTopics,
        ).toHaveBeenCalledWith({
          where: {
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

          orderBy: [
            {
              position: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        });
      },
    );

    it(
      'посторонний пользователь не получает список тем',
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
              `/api/study-groups/${GROUP_ID}/topics`,
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
          prismaMocks.findTopics,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 401 при запросе списка без JWT',
      async () => {
        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics`,
            );

        expect(response.status).toBe(401);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.findTopics,
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
            .post(
              '/api/study-groups/123/topics',
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Интегралы',
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
      'возвращает 400 для некорректного цвета',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Интегралы',
              color: 'red',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные темы учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 для слишком короткого названия',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'А',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400 для неизвестного поля',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              name: 'Интегралы',
              unknownField: 'test',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.createTopic,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 400, если название отсутствует',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              description:
                'Название не передано',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createTopic,
        ).not.toHaveBeenCalled();
      },
    );
  },
);