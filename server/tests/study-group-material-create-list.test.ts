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
  findTopic: vi.fn(),
  createMaterial: vi.fn(),
  findMaterials: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  uploadGroupFile: vi.fn(),
  createSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
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
      },

      studyGroupMaterial: {
        create:
          prismaMocks.createMaterial,

        findMany:
          prismaMocks.findMaterials,
      },
    },
  }),
);

vi.mock(
  '../src/services/storage.service.js',
  () => ({
    uploadStudyGroupFileToStorage:
      storageMocks.uploadGroupFile,

    createFileSignedUrl:
      storageMocks.createSignedUrl,

    deleteFileFromStorage:
      storageMocks.deleteFile,
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

const NOTE_ID =
  '77777777-7777-4777-8777-777777777777';

const LINK_ID =
  '88888888-8888-4888-8888-888888888888';

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

const createTopic = () => ({
  id: TOPIC_ID,
  groupId: GROUP_ID,
});

type MaterialOverrides = {
  id?: string;
  createdById?: string;
  type?: 'NOTE' | 'LINK' | 'FILE';
  title?: string;
  content?: string | null;
  url?: string | null;
  fileName?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

const createMaterial = (
  overrides: MaterialOverrides = {},
) => {
  const createdById =
    overrides.createdById ??
    OWNER_USER_ID;

  const type =
    overrides.type ?? 'NOTE';

  return {
    id:
      overrides.id ??
      NOTE_ID,

    topicId: TOPIC_ID,
    createdById,
    type,

    title:
      overrides.title ??
      'Основные формулы',

    content:
      overrides.content !== undefined
        ? overrides.content
        : type === 'NOTE'
          ? 'Интеграл суммы равен сумме интегралов'
          : null,

    url:
      overrides.url !== undefined
        ? overrides.url
        : type === 'LINK'
          ? 'https://example.com/integrals'
          : null,

    fileName:
      overrides.fileName ?? null,

    storagePath:
      overrides.storagePath ?? null,

    mimeType:
      overrides.mimeType ?? null,

    fileSize:
      overrides.fileSize ?? null,

    createdAt: new Date(
      '2026-07-01T12:00:00.000Z',
    ),

    updatedAt: new Date(
      '2026-07-01T12:00:00.000Z',
    ),

    createdBy: {
      id: createdById,

      name:
        createdById ===
        OWNER_USER_ID
          ? 'Владелец'
          : 'Редактор',

      avatarUrl: null,
    },
  };
};

describe(
  'Создание и список материалов учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();
      prismaMocks.findTopic.mockReset();

      prismaMocks.createMaterial
        .mockReset();

      prismaMocks.findMaterials
        .mockReset();

      storageMocks.uploadGroupFile.mockReset();
      storageMocks.createSignedUrl.mockReset();
      storageMocks.deleteFile.mockReset();

      prismaMocks.findGroup
        .mockResolvedValue(
          createAccessibleGroup('OWNER'),
        );

      prismaMocks.findTopic
        .mockResolvedValue(
          createTopic(),
        );

      prismaMocks.createMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      prismaMocks.findMaterials
        .mockResolvedValue([
          createMaterial(),
        ]);
    });

    it(
      'OWNER создаёт текстовую заметку NOTE',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title:
                'Основные формулы',

              content:
                'Интеграл суммы равен сумме интегралов',
            });

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Материал учебной группы создан',
        );

        expect(
          response.body.material.type,
        ).toBe('NOTE');

        expect(
          response.body.material.createdById,
        ).toBe(OWNER_USER_ID);

        expect(
          response.body.material.content,
        ).toBe(
          'Интеграл суммы равен сумме интегралов',
        );

        expect(
          response.body.material.url,
        ).toBeNull();

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
          prismaMocks.findTopic,
        ).toHaveBeenCalledWith({
          where: {
            id: TOPIC_ID,
            groupId: GROUP_ID,
          },

          select: {
            id: true,
            groupId: true,
          },
        });

        expect(
          prismaMocks.createMaterial,
        ).toHaveBeenCalledWith({
          data: {
            topicId: TOPIC_ID,

            createdById:
              OWNER_USER_ID,

            type: 'NOTE',

            title:
              'Основные формулы',

            content:
              'Интеграл суммы равен сумме интегралов',

            url: null,
            fileName: null,
            storagePath: null,
            mimeType: null,
            fileSize: null,
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
      'EDITOR создаёт материал-ссылку LINK',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'EDITOR',
            ),
          );

        prismaMocks.createMaterial
          .mockResolvedValue(
            createMaterial({
              id: LINK_ID,

              createdById:
                EDITOR_USER_ID,

              type: 'LINK',

              title:
                'Видео по интегралам',

              content: null,

              url:
                'https://example.com/integrals',
            }),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'LINK',

              title:
                'Видео по интегралам',

              url:
                'https://example.com/integrals',
            });

        expect(response.status).toBe(201);

        expect(
          response.body.material.type,
        ).toBe('LINK');

        expect(
          response.body.material.createdById,
        ).toBe(EDITOR_USER_ID);

        expect(
          response.body.material.content,
        ).toBeNull();

        expect(
          response.body.material.url,
        ).toBe(
          'https://example.com/integrals',
        );

        expect(
          prismaMocks.createMaterial,
        ).toHaveBeenCalledWith({
          data: {
            topicId: TOPIC_ID,

            createdById:
              EDITOR_USER_ID,

            type: 'LINK',

            title:
              'Видео по интегралам',

            content: null,

            url:
              'https://example.com/integrals',

            fileName: null,
            storagePath: null,
            mimeType: null,
            fileSize: null,
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
      'MEMBER не может создавать материал',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title:
                'Запрещённая заметка',

              content:
                'Этот материал не должен быть создан',
            });

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец или редактор может управлять материалами учебной группы',
        );

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'посторонний пользователь получает 404 при создании',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title: 'Чужая заметка',
              content: 'Чужой текст',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не создаёт материал в теме из другой группы',
      async () => {
        prismaMocks.findTopic
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title: 'Формулы',
              content: 'Текст',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'MEMBER получает список материалов темы',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'MEMBER',
            ),
          );

        prismaMocks.findMaterials
          .mockResolvedValue([
            createMaterial({
              id: NOTE_ID,
              type: 'NOTE',
            }),

            createMaterial({
              id: LINK_ID,

              createdById:
                EDITOR_USER_ID,

              type: 'LINK',

              title: 'Видео',

              content: null,

              url:
                'https://example.com/video',
            }),
          ]);

        const token =
          createTestAccessToken(
            MEMBER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.materials,
        ).toHaveLength(2);

        expect(
          response.body.materials[0]
            .type,
        ).toBe('NOTE');

        expect(
          response.body.materials[1]
            .type,
        ).toBe('LINK');

        expect(
          response.body.materials[1]
            .createdBy.id,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.findMaterials,
        ).toHaveBeenCalledWith({
          where: {
            topicId: TOPIC_ID,
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
              createdAt: 'desc',
            },
            {
              id: 'asc',
            },
          ],
        });
      },
    );

    it(
      'посторонний пользователь не получает список материалов',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.findMaterials,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'JSON-маршрут не принимает тип FILE',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'FILE',
              title: 'Лекция.pdf',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректные данные материала учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'NOTE без content возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title: 'Формулы',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'LINK с некорректной ссылкой возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'LINK',
              title: 'Видео',
              url: 'не-ссылка',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'LINK с протоколом javascript возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'LINK',
              title: 'Опасная ссылка',

              url:
                'javascript:alert(1)',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'некорректный groupId возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/123/topics/${TOPIC_ID}/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title: 'Формулы',
              content: 'Текст',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'некорректный topicId возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/123/materials`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              type: 'NOTE',
              title: 'Формулы',
              content: 'Текст',
            });

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'запрос без JWT возвращает 401',
      async () => {
        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials`,
            );

        expect(response.status).toBe(401);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );
  },
);