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
  findSubject: vi.fn<
    (
      args: unknown,
    ) => Promise<
      {
        id: string;
      } | null
    >
  >(),

  findMaterial: vi.fn<
    (
      args: unknown,
    ) => Promise<
      Record<string, unknown> | null
    >
  >(),

  deleteMaterial: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),
}));

const storageMocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn<
    (
      storagePath: string,
      downloadFileName: string,
    ) => Promise<string>
  >(),

  deleteFile: vi.fn<
    (
      storagePath: string,
    ) => Promise<void>
  >(),

  uploadFile: vi.fn<
    (
      input: unknown,
    ) => Promise<string>
  >(),

  deleteFiles: vi.fn<
    (
      storagePaths: string[],
    ) => Promise<void>
  >(),
}));

vi.mock(
  '../src/config/prisma.js',
  () => ({
    prisma: {
      personalSubject: {
        findFirst:
          prismaMocks.findSubject,
      },

      personalMaterial: {
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
    createFileSignedUrl:
      storageMocks.createSignedUrl,

    deleteFileFromStorage:
      storageMocks.deleteFile,

    uploadFileToStorage:
      storageMocks.uploadFile,

    deleteFilesFromStorage:
      storageMocks.deleteFiles,
  }),
);

import { app } from '../src/app.js';

const TEST_USER_ID =
  '11111111-1111-4111-8111-111111111111';

const TEST_SUBJECT_ID =
  '22222222-2222-4222-8222-222222222222';

const TEST_MATERIAL_ID =
  '33333333-3333-4333-8333-333333333333';

const TEST_STORAGE_PATH =
  `${TEST_USER_ID}/${TEST_SUBJECT_ID}/lecture.pdf`;

const TEST_DOWNLOAD_URL =
  'https://example.com/private-signed-file';

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

const createFileMaterial = () => ({
  id: TEST_MATERIAL_ID,
  subjectId: TEST_SUBJECT_ID,
  type: 'FILE',
  title: 'Лекция',
  content: null,
  url: null,
  fileName: 'Лекция 1.pdf',
  storagePath: TEST_STORAGE_PATH,
  mimeType: 'application/pdf',
  fileSize: 12_345,
  createdAt: new Date(
    '2026-06-30T12:00:00.000Z',
  ),
  updatedAt: new Date(
    '2026-06-30T12:00:00.000Z',
  ),
});

describe(
  'Скачивание и удаление файлового материала',
  () => {
    beforeEach(() => {
      prismaMocks.findSubject.mockReset();
      prismaMocks.findMaterial.mockReset();
      prismaMocks.deleteMaterial.mockReset();

      storageMocks.createSignedUrl.mockReset();
      storageMocks.deleteFile.mockReset();
      storageMocks.uploadFile.mockReset();
      storageMocks.deleteFiles.mockReset();

      prismaMocks.findSubject
        .mockResolvedValue({
          id: TEST_SUBJECT_ID,
        });

      prismaMocks.findMaterial
        .mockResolvedValue(
          createFileMaterial(),
        );

      prismaMocks.deleteMaterial
        .mockResolvedValue(
          createFileMaterial(),
        );

      storageMocks.createSignedUrl
        .mockResolvedValue(
          TEST_DOWNLOAD_URL,
        );

      storageMocks.deleteFile
        .mockResolvedValue(undefined);

      storageMocks.uploadFile
        .mockResolvedValue(
          TEST_STORAGE_PATH,
        );

      storageMocks.deleteFiles
        .mockResolvedValue(undefined);
    });

    it(
      'создаёт временную ссылку для скачивания FILE',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/${TEST_MATERIAL_ID}/download`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
          materialId:
            TEST_MATERIAL_ID,

          fileName:
            'Лекция 1.pdf',

          mimeType:
            'application/pdf',

          fileSize:
            12_345,

          downloadUrl:
            TEST_DOWNLOAD_URL,

          expiresInSeconds:
            15 * 60,
        });

        /*
         * Проверяем, что предмет искался
         * с ownerId из JWT.
         */
        expect(
          prismaMocks.findSubject,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_SUBJECT_ID,
            ownerId: TEST_USER_ID,
          },
          select: {
            id: true,
          },
        });

        /*
         * Материал должен одновременно
         * принадлежать указанному предмету.
         */
        expect(
          prismaMocks.findMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_MATERIAL_ID,
            subjectId: TEST_SUBJECT_ID,
          },
        });

        /*
         * В Storage передаётся постоянный путь
         * и исходное имя скачиваемого файла.
         */
        expect(
          storageMocks.createSignedUrl,
        ).toHaveBeenCalledWith(
          TEST_STORAGE_PATH,
          'Лекция 1.pdf',
        );
      },
    );

    it(
      'не создаёт ссылку для NOTE',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue({
            id: TEST_MATERIAL_ID,
            subjectId: TEST_SUBJECT_ID,
            type: 'NOTE',
            title: 'Конспект',
            content: 'Текст заметки',
            url: null,
            fileName: null,
            storagePath: null,
            mimeType: null,
            fileSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .get(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/${TEST_MATERIAL_ID}/download`,
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
      'удаляет FILE из Storage и PostgreSQL',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/${TEST_MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(204);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledTimes(1);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledWith(
          TEST_STORAGE_PATH,
        );

        expect(
          prismaMocks.deleteMaterial,
        ).toHaveBeenCalledTimes(1);

        expect(
          prismaMocks.deleteMaterial,
        ).toHaveBeenCalledWith({
          where: {
            id: TEST_MATERIAL_ID,
          },
        });

        /*
         * Проверяем порядок:
         * сначала Storage, потом PostgreSQL.
         */
        const storageDeleteOrder =
          storageMocks.deleteFile
            .mock.invocationCallOrder[0];

        const databaseDeleteOrder =
          prismaMocks.deleteMaterial
            .mock.invocationCallOrder[0];

        expect(
          storageDeleteOrder,
        ).toBeDefined();

        expect(
          databaseDeleteOrder,
        ).toBeDefined();

        expect(
          storageDeleteOrder!,
        ).toBeLessThan(
          databaseDeleteOrder!,
        );
      },
    );

    it(
      'при ошибке Storage не удаляет запись из PostgreSQL',
      async () => {
        vi.spyOn(
          console,
          'error',
        ).mockImplementation(
          () => undefined,
        );

        storageMocks.deleteFile
          .mockRejectedValue(
            new Error(
              'Тестовая ошибка Storage',
            ),
          );

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/${TEST_MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(500);

        expect(
          storageMocks.deleteFile,
        ).toHaveBeenCalledWith(
          TEST_STORAGE_PATH,
        );

        /*
         * Запись остаётся, чтобы не потерять
         * путь к неудалённому объекту.
         */
        expect(
          prismaMocks.deleteMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'возвращает 404 для отсутствующего или чужого материала',
      async () => {
        prismaMocks.findMaterial
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .delete(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/${TEST_MATERIAL_ID}`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Материал не найден',
        );

        expect(
          storageMocks.deleteFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.deleteMaterial,
        ).not.toHaveBeenCalled();
      },
    );
  },
);