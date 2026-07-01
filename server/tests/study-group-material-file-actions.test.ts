import jwt from 'jsonwebtoken';
import request from 'supertest';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppError } from '../src/errors/app-error.js';

const prismaMocks = vi.hoisted(() => ({
  findGroup: vi.fn(),
  findTopic: vi.fn(),
  createMaterial: vi.fn(),
  findMaterial: vi.fn(),
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
        create:
          prismaMocks.createMaterial,

        findFirst:
          prismaMocks.findMaterial,

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

const STORAGE_PATH =
  `study-groups/${GROUP_ID}/${TOPIC_ID}/generated-file.pdf`;

const SIGNED_URL =
  'https://storage.example.com/signed-file-url';

const PDF_FILE_BUFFER =
  Buffer.from(
    '%PDF-1.4\nStudyVault test file',
  );

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
  const type =
    overrides.type ?? 'FILE';

  const createdById =
    overrides.createdById ??
    OWNER_USER_ID;

  return {
    id: MATERIAL_ID,
    topicId: TOPIC_ID,
    createdById,
    type,

    title:
      overrides.title ??
      'Лекция по интегралам',

    content:
      overrides.content !== undefined
        ? overrides.content
        : type === 'NOTE'
          ? 'Текст заметки'
          : null,

    url:
      overrides.url !== undefined
        ? overrides.url
        : type === 'LINK'
          ? 'https://example.com'
          : null,

    fileName:
      overrides.fileName !== undefined
        ? overrides.fileName
        : type === 'FILE'
          ? 'lecture.pdf'
          : null,

    storagePath:
      overrides.storagePath !== undefined
        ? overrides.storagePath
        : type === 'FILE'
          ? STORAGE_PATH
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
          ? PDF_FILE_BUFFER.length
          : null,

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
        EDITOR_USER_ID
          ? 'Редактор'
          : 'Владелец',

      avatarUrl: null,
    },
  };
};

describe(
  'Файлы материалов учебной группы',
  () => {
    beforeEach(() => {
      prismaMocks.findGroup.mockReset();
      prismaMocks.findTopic.mockReset();

      prismaMocks.createMaterial
        .mockReset();

      prismaMocks.findMaterial
        .mockReset();

      prismaMocks.deleteMaterial
        .mockReset();

      storageMocks.uploadGroupFile
        .mockReset();

      storageMocks.createSignedUrl
        .mockReset();

      storageMocks.deleteFile
        .mockReset();

      prismaMocks.findGroup
        .mockResolvedValue(
          createAccessibleGroup(
            'OWNER',
          ),
        );

      prismaMocks.findTopic
        .mockResolvedValue(
          createTopic(),
        );

      prismaMocks.createMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      prismaMocks.findMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      prismaMocks.deleteMaterial
        .mockResolvedValue(
          createMaterial(),
        );

      storageMocks.uploadGroupFile
        .mockResolvedValue(
          STORAGE_PATH,
        );

      storageMocks.createSignedUrl
        .mockResolvedValue(
          SIGNED_URL,
        );

      storageMocks.deleteFile
        .mockResolvedValue(
          undefined,
        );
    });

    it(
      'OWNER загружает PDF с собственным названием',
      async () => {
        prismaMocks.createMaterial
          .mockResolvedValue(
            createMaterial({
              title:
                'Лекция по интегралам',

              fileSize:
                PDF_FILE_BUFFER.length,
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'Лекция по интегралам',
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Файл учебной группы успешно загружен',
        );

        expect(
          response.body.material.type,
        ).toBe('FILE');

        expect(
          response.body.material.title,
        ).toBe(
          'Лекция по интегралам',
        );

        expect(
          storageMocks.uploadGroupFile,
        ).toHaveBeenCalledWith({
          groupId: GROUP_ID,
          topicId: TOPIC_ID,

          file:
            expect.objectContaining({
              originalname:
                'lecture.pdf',

              mimetype:
                'application/pdf',

              size:
                PDF_FILE_BUFFER.length,

              buffer:
                expect.any(Buffer),
            }),
        });

        expect(
          prismaMocks.createMaterial,
        ).toHaveBeenCalledWith({
          data: {
            topicId: TOPIC_ID,

            createdById:
              OWNER_USER_ID,

            type: 'FILE',

            title:
              'Лекция по интегралам',

            content: null,
            url: null,

            fileName:
              'lecture.pdf',

            storagePath:
              STORAGE_PATH,

            mimeType:
              'application/pdf',

            fileSize:
              PDF_FILE_BUFFER.length,
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
      'EDITOR загружает файл без title, название создаётся из имени файла',
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
              createdById:
                EDITOR_USER_ID,

              title: 'lecture',
            }),
          );

        const token =
          createTestAccessToken(
            EDITOR_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(201);

        expect(
          prismaMocks.createMaterial,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            data:
              expect.objectContaining({
                createdById:
                  EDITOR_USER_ID,

                type: 'FILE',
                title: 'lecture',
              }),
          }),
        );
      },
    );

    it(
      'MEMBER не может загружать файл',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(403);

        expect(response.body.message).toBe(
          'Только владелец или редактор может управлять материалами учебной группы',
        );

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'посторонний пользователь получает 404 при загрузке',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Учебная группа не найдена',
        );

        expect(
          prismaMocks.findTopic,
        ).not.toHaveBeenCalled();

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не загружает файл в тему из другой группы',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Тема учебной группы не найдена',
        );

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'загрузка без файла возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'Материал без файла',
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Файл не был передан',
        );

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'запрещённый MIME-тип возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              Buffer.from(
                'not a real executable',
              ),
              {
                filename:
                  'program.exe',

                contentType:
                  'application/x-msdownload',
              },
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Недопустимый тип файла',
        );

        expect(
          prismaMocks.findGroup,
        ).not.toHaveBeenCalled();

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'слишком короткий title возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'A',
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Название материала должно содержать минимум 2 символа',
        );

        expect(
          storageMocks.uploadGroupFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'ошибка Storage при загрузке возвращает 502',
      async () => {
        storageMocks.uploadGroupFile
          .mockRejectedValue(
            new AppError(
              502,
              'Не удалось загрузить файл в хранилище',
            ),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(502);

        expect(response.body.message).toBe(
          'Не удалось загрузить файл в хранилище',
        );

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'при ошибке PostgreSQL загруженный файл удаляется из Storage',
      async () => {
        prismaMocks.createMaterial
          .mockRejectedValue(
            new Error(
              'Database write failed',
            ),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .post(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .attach(
              'file',
              PDF_FILE_BUFFER,
              {
                filename:
                  'lecture.pdf',

                contentType:
                  'application/pdf',
              },
            );

        expect(response.status).toBe(500);

        expect(
          storageMocks.uploadGroupFile,
        ).toHaveBeenCalledTimes(1);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledWith(
          STORAGE_PATH,
        );
      },
    );

    it(
      'MEMBER получает signed URL для скачивания файла',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}/download`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
          materialId:
            MATERIAL_ID,

          fileName:
            'lecture.pdf',

          mimeType:
            'application/pdf',

          fileSize:
            PDF_FILE_BUFFER.length,

          downloadUrl:
            SIGNED_URL,

          expiresInSeconds:
            900,
        });

        expect(
          storageMocks.createSignedUrl,
        ).toHaveBeenCalledWith(
          STORAGE_PATH,
          'lecture.pdf',
        );
      },
    );

    it(
      'для NOTE нельзя получить ссылку скачивания',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(
            createMaterial({
              type: 'NOTE',

              content:
                'Текст заметки',

              fileName: null,
              storagePath: null,
              mimeType: null,
              fileSize: null,
            }),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}/download`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Этот материал не является файлом',
        );

        expect(
          storageMocks.createSignedUrl,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'посторонний пользователь не может скачать файл',
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
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}/download`,
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

        expect(
          storageMocks.createSignedUrl,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'ошибка создания signed URL возвращает 502',
      async () => {
        storageMocks.createSignedUrl
          .mockRejectedValue(
            new AppError(
              502,
              'Не удалось получить ссылку на файл',
            ),
          );

        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/${MATERIAL_ID}/download`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(502);

        expect(response.body.message).toBe(
          'Не удалось получить ссылку на файл',
        );
      },
    );

    it(
      'при ошибке удаления Storage запись PostgreSQL не удаляется',
      async () => {
        storageMocks.deleteFile
          .mockRejectedValue(
            new AppError(
              502,
              'Не удалось удалить файл из хранилища',
            ),
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

        expect(response.status).toBe(502);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledWith(
          STORAGE_PATH,
        );

        expect(
          prismaMocks.deleteMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'некорректный materialId при скачивании возвращает 400',
      async () => {
        const token =
          createTestAccessToken(
            OWNER_USER_ID,
          );

        const response =
          await request(app)
            .get(
              `/api/study-groups/${GROUP_ID}/topics/${TOPIC_ID}/materials/123/download`,
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

        expect(
          storageMocks.createSignedUrl,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
