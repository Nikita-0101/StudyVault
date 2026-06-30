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
 * Подменяем обращения к Prisma.
 */
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

  createMaterial: vi.fn<
    (
      args: unknown,
    ) => Promise<Record<string, unknown>>
  >(),
}));

/*
 * Подменяем обращения к Supabase Storage.
 *
 * В тестах настоящие файлы в облако
 * отправляться не будут.
 */
const storageMocks = vi.hoisted(() => ({
  uploadFile: vi.fn<
    (
      input: unknown,
    ) => Promise<string>
  >(),

  deleteFile: vi.fn<
    (
      storagePath: string,
    ) => Promise<void>
  >(),

  createSignedUrl: vi.fn<
    (
      storagePath: string,
      downloadFileName: string,
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
        create:
          prismaMocks.createMaterial,
      },
    },
  }),
);

vi.mock(
  '../src/services/storage.service.js',
  () => ({
    uploadFileToStorage:
      storageMocks.uploadFile,

    deleteFileFromStorage:
      storageMocks.deleteFile,

    createFileSignedUrl:
      storageMocks.createSignedUrl,

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
  `${TEST_USER_ID}/${TEST_SUBJECT_ID}/test-file.txt`;

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
  'POST /api/personal-subjects/:subjectId/materials/upload',
  () => {
    beforeEach(() => {
      prismaMocks.findSubject.mockReset();
      prismaMocks.createMaterial.mockReset();

      storageMocks.uploadFile.mockReset();
      storageMocks.deleteFile.mockReset();
      storageMocks.createSignedUrl.mockReset();
      storageMocks.deleteFiles.mockReset();

      /*
       * По умолчанию предмет существует
       * и принадлежит тестовому пользователю.
       */
      prismaMocks.findSubject
        .mockResolvedValue({
          id: TEST_SUBJECT_ID,
        });

      /*
       * Имитируем успешную загрузку
       * файла в Supabase Storage.
       */
      storageMocks.uploadFile
        .mockResolvedValue(
          TEST_STORAGE_PATH,
        );

      storageMocks.deleteFile
        .mockResolvedValue(undefined);

      storageMocks.createSignedUrl
        .mockResolvedValue(
          'https://example.com/signed-file',
        );

      storageMocks.deleteFiles
        .mockResolvedValue(undefined);

      /*
       * Имитируем создание строки
       * файлового материала в PostgreSQL.
       */
      prismaMocks.createMaterial
        .mockResolvedValue({
          id: TEST_MATERIAL_ID,
          subjectId: TEST_SUBJECT_ID,
          type: 'FILE',
          title: 'Тестовый файл',
          content: null,
          url: null,
          fileName: 'lecture.txt',
          storagePath: TEST_STORAGE_PATH,
          mimeType: 'text/plain',
          fileSize: 17,
          createdAt: new Date(
            '2026-06-30T12:00:00.000Z',
          ),
          updatedAt: new Date(
            '2026-06-30T12:00:00.000Z',
          ),
        });
    });

    it(
      'загружает разрешённый файл и создаёт материал',
      async () => {
        const token =
          createTestAccessToken();

        const fileContent =
          Buffer.from(
            'test file content',
          );

        const response =
          await request(app)
            .post(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'Тестовый файл',
            )
            .attach(
              'file',
              fileContent,
              {
                filename: 'lecture.txt',
                contentType: 'text/plain',
              },
            );

        expect(response.status).toBe(201);

        expect(response.body.message).toBe(
          'Файл успешно загружен',
        );

        expect(
          response.body.material,
        ).toMatchObject({
          id: TEST_MATERIAL_ID,
          subjectId: TEST_SUBJECT_ID,
          type: 'FILE',
          title: 'Тестовый файл',
          fileName: 'lecture.txt',
          storagePath:
            TEST_STORAGE_PATH,
          mimeType: 'text/plain',
        });

        /*
         * Проверяем ownership:
         * предмет ищется одновременно
         * по subjectId и ownerId из JWT.
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
         * Проверяем, что сервис получил
         * настоящий Buffer от Multer.
         */
        expect(
          storageMocks.uploadFile,
        ).toHaveBeenCalledWith({
          ownerId: TEST_USER_ID,
          subjectId: TEST_SUBJECT_ID,

          file: expect.objectContaining({
            originalname: 'lecture.txt',
            mimetype: 'text/plain',
            size: fileContent.length,
            buffer: expect.any(Buffer),
          }),
        });

        /*
         * Проверяем сведения,
         * записываемые в PostgreSQL.
         */
        expect(
          prismaMocks.createMaterial,
        ).toHaveBeenCalledWith({
          data: {
            subjectId: TEST_SUBJECT_ID,
            type: 'FILE',
            title: 'Тестовый файл',
            fileName: 'lecture.txt',
            storagePath:
              TEST_STORAGE_PATH,
            mimeType: 'text/plain',
            fileSize: fileContent.length,
          },
        });
      },
    );

    it(
      'возвращает 400, если файл не передан',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/upload`,
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

        /*
         * Без файла сервис и база
         * вообще не должны вызываться.
         */
        expect(
          prismaMocks.findSubject,
        ).not.toHaveBeenCalled();

        expect(
          storageMocks.uploadFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'не загружает файл в чужой или отсутствующий предмет',
      async () => {
        prismaMocks.findSubject
          .mockResolvedValue(null);

        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'Чужой материал',
            )
            .attach(
              'file',
              Buffer.from('content'),
              {
                filename: 'foreign.txt',
                contentType: 'text/plain',
              },
            );

        expect(response.status).toBe(404);

        expect(response.body.message).toBe(
          'Личный предмет не найден',
        );

        expect(
          storageMocks.uploadFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'отклоняет запрещённый тип файла',
      async () => {
        const token =
          createTestAccessToken();

        const response =
          await request(app)
            .post(
              `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/upload`,
            )
            .set(
              'Authorization',
              `Bearer ${token}`,
            )
            .field(
              'title',
              'Запрещённый файл',
            )
            .attach(
              'file',
              Buffer.from(
                'not a real executable',
              ),
              {
                filename: 'program.exe',
                contentType:
                  'application/x-msdownload',
              },
            );

        expect(response.status).toBe(400);

        expect(response.body.message).toBe(
          'Недопустимый тип файла',
        );

        /*
         * Multer остановил запрос
         * до бизнес-сервиса.
         */
        expect(
          prismaMocks.findSubject,
        ).not.toHaveBeenCalled();

        expect(
          storageMocks.uploadFile,
        ).not.toHaveBeenCalled();

        expect(
          prismaMocks.createMaterial,
        ).not.toHaveBeenCalled();
      },
    );

    it(
        'удаляет файл из Storage, если запись в PostgreSQL создать не удалось',
        async () => {
            /*
            * Убираем ожидаемую ошибку из консоли,
            * чтобы вывод тестов не засорялся.
            */
            vi.spyOn(
            console,
            'error',
            ).mockImplementation(() => undefined);

            /*
            * Storage успешно принял файл,
            * но Prisma не смогла создать запись.
            */
            prismaMocks.createMaterial
            .mockRejectedValue(
                new Error(
                'Тестовая ошибка PostgreSQL',
                ),
            );

            const token =
            createTestAccessToken();

            const response =
            await request(app)
                .post(
                `/api/personal-subjects/${TEST_SUBJECT_ID}/materials/upload`,
                )
                .set(
                'Authorization',
                `Bearer ${token}`,
                )
                .field(
                'title',
                'Файл с ошибкой базы',
                )
                .attach(
                'file',
                Buffer.from(
                    'temporary file content',
                ),
                {
                    filename: 'temporary.txt',
                    contentType: 'text/plain',
                },
                );

            /*
            * Неожиданная ошибка Prisma
            * превращается error middleware в 500.
            */
            expect(response.status).toBe(500);

            expect(response.body.message).toBe(
            'Внутренняя ошибка сервера',
            );

            /*
            * Файл сначала действительно
            * был отправлен в Storage.
            */
            expect(
            storageMocks.uploadFile,
            ).toHaveBeenCalledTimes(1);

            /*
            * После ошибки Prisma backend
            * выполнил компенсирующее удаление.
            */
            expect(
            storageMocks.deleteFile,
            ).toHaveBeenCalledTimes(1);

            expect(
            storageMocks.deleteFile,
            ).toHaveBeenCalledWith(
            TEST_STORAGE_PATH,
            );
        },
        );

  },
);