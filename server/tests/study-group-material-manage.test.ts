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
  findMaterial: vi.fn(),
  updateMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
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
        findFirst:
          prismaMocks.findMaterial,

        update:
          prismaMocks.updateMaterial,

        delete:
          prismaMocks.deleteMaterial,
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

const MATERIAL_ID =
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

const createTopic = () => ({
  id: TOPIC_ID,
  groupId: GROUP_ID,
});

type MaterialOverrides = {
  type?: 'NOTE' | 'LINK' | 'FILE';
  title?: string;
  content?: string | null;
  url?: string | null;
  storagePath?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

const createMaterial = (
  overrides: MaterialOverrides = {},
) => {
  const type =
    overrides.type ?? 'NOTE';

  return {
    id: MATERIAL_ID,
    topicId: TOPIC_ID,

    createdById:
      EDITOR_USER_ID,

    type,

    title:
      overrides.title ??
      'Основные формулы',

    content:
      overrides.content !== undefined
        ? overrides.content
        : type === 'NOTE'
          ? 'Старый текст заметки'
          : null,

    url:
      overrides.url !== undefined
        ? overrides.url
        : type === 'LINK'
          ? 'https://example.com/old'
          : null,

    fileName:
      overrides.fileName !== undefined
        ? overrides.fileName
        : type === 'FILE'
          ? 'lecture.pdf'
          : null,

    storagePath:
      overrides.storagePath !==
      undefined
        ? overrides.storagePath
        : type === 'FILE'
          ? `study-groups/${GROUP_ID}/${TOPIC_ID}/lecture.pdf`
          : null,

    mimeType:
      overrides.mimeType !== undefined
        ? overrides.mimeType
        : type === 'FILE'
          ? 'application/pdf'
          : null,

    fileSize:
      overrides.fileSize !== undefined
        ? overrides.fileSize
        : type === 'FILE'
          ? 1024
          : null,

    createdAt: new Date(
      '2026-07-01T12:00:00.000Z',
    ),

    updatedAt: new Date(
      '2026-07-01T12:00:00.000Z',
    ),

    createdBy: {
      id: EDITOR_USER_ID,
      name: 'Редактор',
      avatarUrl: null,
    },
  };
};

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
        'Record not found',

      code: 'P2025',
      clientVersion: '7.8.0',
    },
  );

describe(
  'Получение, изменение и удаление материала учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();
      prismaMocks.findTopic.mockReset();

      prismaMocks.findMaterial
        .mockReset();

      prismaMocks.updateMaterial
        .mockReset();

      prismaMocks.deleteMaterial
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

      prismaMocks.findMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      prismaMocks.updateMaterial
        .mockResolvedValue(
          createMaterial({
            title:
              'Обновлённые формулы',

            content:
              'Новый текст заметки',
          }),
        );

      prismaMocks.deleteMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      storageMocks.deleteFile
        .mockResolvedValue(undefined);
    });

    it(
      'MEMBER получает конкретный материал',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(
          response.body.material.id,
        ).toBe(MATERIAL_ID);

        expect(
          response.body.material.type,
        ).toBe('NOTE');

        expect(
          response.body.material.createdBy.id,
        ).toBe(EDITOR_USER_ID);

        expect(
          prismaMocks.findMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: MATERIAL_ID,
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
        });
      },
    );

    it(
      'посторонний пользователь получает 404',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
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
          prismaMocks.findMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404, если тема не принадлежит группе',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
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
          prismaMocks.findMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 для материала из другой темы',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(null);

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Материал учебной группы не найден',
        );
      },
    );

    it(
      'EDITOR изменяет NOTE',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              title:
                'Обновлённые формулы',

              content:
                'Новый текст заметки',
            });

        expect(response.status).toBe(200);

        expect(response.body.message).toBe(
          'Материал учебной группы обновлён',
        );

        expect(
          response.body.material.title,
        ).toBe(
          'Обновлённые формулы',
        );

        expect(
          prismaMocks.updateMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: MATERIAL_ID,
          },

          data: {
            title:
              'Обновлённые формулы',

            content:
              'Новый текст заметки',
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
      'OWNER изменяет ссылку LINK',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'LINK',

              title: 'Старая ссылка',

              content: null,

              url:
                'https://example.com/old',
            }),
          );

        prismaMocks.updateMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'LINK',

              title: 'Новая ссылка',

              content: null,

              url:
                'https://example.com/new',
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              title: 'Новая ссылка',

              url:
                'https://example.com/new',
            });

        expect(response.status).toBe(200);

        expect(
          response.body.material.url,
        ).toBe(
          'https://example.com/new',
        );

        expect(
          prismaMocks.updateMaterial,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              title: 'Новая ссылка',

              url:
                'https://example.com/new',
            },
          }),
        );
      },
    );

    it(
      'NOTE не принимает поле url',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              url:
                'https://example.com',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Для текстовой заметки нельзя передать поле url',
        );

        expect(
          prismaMocks.updateMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'LINK не принимает поле content',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'LINK',

              content: null,

              url:
                'https://example.com',
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              content:
                'Текст нельзя добавить к LINK',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Для материала-ссылки нельзя передать поле content',
        );

        expect(
          prismaMocks.updateMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'FILE нельзя изменить через обычный PATCH',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'FILE',
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .patch(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              title:
                'Новое название',
            });

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Файловый материал нельзя изменить через этот маршрут',
        );

        expect(
          prismaMocks.updateMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'MEMBER не может изменять материал',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              title:
                'Запрещённое изменение',
            });

        expect(response.status).toBe(403);

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.findMaterial,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMaterial,
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({});

        expect(response.status).toBe(400);

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.updateMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'OWNER удаляет NOTE без обращения к Storage',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);
        expect(response.text).toBe('');

        expect(
          storageMocks.deleteFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: MATERIAL_ID,
          },
        });
      },
    );

    it(
      'EDITOR удаляет FILE сначала из Storage, затем из PostgreSQL',
      async () => {
        prismaMocks.findGroup
          .mockResolvedValue(
            createAccessibleGroup(
              'EDITOR',
            ),
          );

        const storagePath =
          `study-groups/${GROUP_ID}/${TOPIC_ID}/lecture.pdf`;

        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'FILE',
              storagePath,
            }),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledWith(
          storagePath,
        );

        expect(
          prismaMocks.deleteMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: MATERIAL_ID,
          },
        });

        const storageCallOrder =
            storageMocks.deleteFile
                .mock.invocationCallOrder[0];

        const databaseCallOrder =
        prismaMocks.deleteMaterial
            .mock.invocationCallOrder[0];

        /*
        * TypeScript считает, что элемент
        * массива может отсутствовать.
        *
        * Явно проверяем это перед сравнением.
        */
        if (
        storageCallOrder === undefined ||
        databaseCallOrder === undefined
        ) {
        throw new Error(
            'Не удалось определить порядок вызовов Storage и PostgreSQL',
        );
        }

        expect(
        storageCallOrder,
        ).toBeLessThan(
        databaseCallOrder,
        );

      },
    );

    it(
      'FILE без storagePath возвращает 500',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'FILE',
              storagePath: null,
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .delete(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(500);

        expect(response.body.message).toBe(
          'У файлового материала отсутствует путь в хранилище',
        );

        expect(
          storageMocks.deleteFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'MEMBER не может удалить материал',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(403);

        expect(
          prismaMocks.findMaterial,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'Prisma P2025 при обновлении преобразуется в 404',
      async () => {
        prismaMocks.updateMaterial
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .send({
              title:
                'Новое название',
            });

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Материал учебной группы не найден',
        );
      },
    );

    it(
      'Prisma P2025 при удалении преобразуется в 404',
      async () => {
        prismaMocks.deleteMaterial
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Материал учебной группы не найден',
        );
      },
    );

    it(
      'некорректный materialId возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/123`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Некорректный идентификатор материала учебной группы',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();
      },
    );
  },
);