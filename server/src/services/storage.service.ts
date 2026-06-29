import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';

type UploadFileInput = {
  ownerId: string;
  subjectId: string;
  file: {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
  };
};

/*
 * Получает безопасное расширение файла.
 *
 * Например:
 * "лекция.pdf" → ".pdf"
 * "конспект.docx" → ".docx"
 */
const getSafeExtension = (
  originalFileName: string,
): string => {
  const extension = extname(
    originalFileName,
  ).toLowerCase();

  /*
   * Разрешаем только обычное расширение:
   * точка + латинские буквы или цифры.
   */
  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) {
    return '';
  }

  return extension;
};

/*
 * Создаёт уникальный путь внутри bucket.
 *
 * Пример:
 * user-id/subject-id/random-uuid.pdf
 */
const createStoragePath = (
  ownerId: string,
  subjectId: string,
  originalFileName: string,
): string => {
  const extension = getSafeExtension(
    originalFileName,
  );

  const uniqueFileName =
    `${randomUUID()}${extension}`;

  return `${ownerId}/${subjectId}/${uniqueFileName}`;
};

/*
 * Загружает файл в Supabase Storage
 * и возвращает постоянный путь объекта.
 */
export const uploadFileToStorage = async ({
  ownerId,
  subjectId,
  file,
}: UploadFileInput): Promise<string> => {
  const storagePath = createStoragePath(
    ownerId,
    subjectId,
    file.originalname,
  );

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(
      storagePath,
      file.buffer,
      {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      },
    );

  if (error) {
    console.error(
      'Supabase Storage upload error:',
      error,
    );

    throw new AppError(
      502,
      'Не удалось загрузить файл в хранилище',
    );
  }

  return storagePath;
};

/*
 * Создаёт временную ссылку на приватный файл.
 *
 * Ссылка действует 15 минут.
 */
export const createFileSignedUrl = async (
  storagePath: string,
  downloadFileName: string,
): Promise<string> => {
  const expiresInSeconds = 15 * 60;

  const { data, error } =
    await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(
        storagePath,
        expiresInSeconds,
        {
          download: downloadFileName,
        },
      );

  if (error) {
    console.error(
      'Supabase signed URL error:',
      error,
    );

    throw new AppError(
      502,
      'Не удалось получить ссылку на файл',
    );
  }

  return data.signedUrl;
};

/*
 * Удаляет файл из Supabase Storage.
 */
export const deleteFileFromStorage = async (
  storagePath: string,
): Promise<void> => {
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error(
      'Supabase Storage delete error:',
      error,
    );

    throw new AppError(
      502,
      'Не удалось удалить файл из хранилища',
    );
  }
};


/*
 * Удаляет сразу несколько файлов
 * из Supabase Storage.
 */
export const deleteFilesFromStorage = async (
  storagePaths: string[],
): Promise<void> => {
  if (storagePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .remove(storagePaths);

  if (error) {
    console.error(
      'Supabase Storage bulk delete error:',
      error,
    );

    throw new AppError(
      502,
      'Не удалось удалить файлы предмета из хранилища',
    );
  }
};