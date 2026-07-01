import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';

/*
 * Минимальные данные файла, которые нужны
 * сервису Supabase Storage.
 */
type StoredFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

/*
 * Параметры загрузки личного файла.
 */
type UploadPersonalFileInput = {
  ownerId: string;
  subjectId: string;
  file: StoredFile;
};

/*
 * Параметры загрузки файла учебной группы.
 */
type UploadStudyGroupFileInput = {
  groupId: string;
  topicId: string;
  file: StoredFile;
};

/*
 * Получает безопасное расширение файла.
 *
 * Например:
 *
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
   * Разрешаем:
   *
   * точку;
   * латинские буквы;
   * цифры;
   * длину расширения до 10 символов.
   */
  if (
    !/^\.[a-z0-9]{1,10}$/.test(
      extension,
    )
  ) {
    return '';
  }

  return extension;
};

/*
 * Создаёт уникальное имя объекта.
 *
 * Исходное имя файла нельзя использовать
 * напрямую в качестве имени в Storage,
 * потому что:
 *
 * оно может содержать пробелы;
 * оно может содержать специальные символы;
 * два файла могут называться одинаково;
 * пользователь может попытаться передать путь.
 */
const createUniqueFileName = (
  originalFileName: string,
): string => {
  const extension = getSafeExtension(
    originalFileName,
  );

  return `${randomUUID()}${extension}`;
};

/*
 * Создаёт путь личного файла.
 *
 * Пример:
 *
 * user-id/subject-id/random-uuid.pdf
 *
 * Этот формат оставляем прежним,
 * чтобы не ломать существующие файлы.
 */
const createPersonalStoragePath = (
  ownerId: string,
  subjectId: string,
  originalFileName: string,
): string => {
  const uniqueFileName =
    createUniqueFileName(
      originalFileName,
    );

  return `${ownerId}/${subjectId}/${uniqueFileName}`;
};

/*
 * Создаёт путь группового файла.
 *
 * Пример:
 *
 * study-groups/group-id/topic-id/random-uuid.pdf
 */
const createStudyGroupStoragePath = (
  groupId: string,
  topicId: string,
  originalFileName: string,
): string => {
  const uniqueFileName =
    createUniqueFileName(
      originalFileName,
    );

  return `study-groups/${groupId}/${topicId}/${uniqueFileName}`;
};

/*
 * Общая внутренняя функция загрузки.
 *
 * Она не знает, личный это материал
 * или групповой. Она просто получает
 * готовый storagePath и отправляет
 * файл в Supabase.
 */
const uploadToStorage = async (
  storagePath: string,
  file: StoredFile,
): Promise<string> => {
  const { error } =
    await supabase.storage
      .from(
        env.SUPABASE_STORAGE_BUCKET,
      )
      .upload(
        storagePath,
        file.buffer,
        {
          contentType:
            file.mimetype,

          cacheControl: '3600',

          /*
           * Не перезаписываем существующий
           * объект при совпадении пути.
           *
           * Хотя UUID почти исключает
           * такое совпадение.
           */
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
 * Загружает файл личного материала.
 *
 * Название функции и параметры оставляем
 * прежними, потому что она уже используется
 * в personal-material.service.ts.
 */
export const uploadFileToStorage =
  async ({
    ownerId,
    subjectId,
    file,
  }: UploadPersonalFileInput): Promise<string> => {
    const storagePath =
      createPersonalStoragePath(
        ownerId,
        subjectId,
        file.originalname,
      );

    return uploadToStorage(
      storagePath,
      file,
    );
  };

/*
 * Загружает файл материала
 * учебной группы.
 */
export const uploadStudyGroupFileToStorage =
  async ({
    groupId,
    topicId,
    file,
  }: UploadStudyGroupFileInput): Promise<string> => {
    const storagePath =
      createStudyGroupStoragePath(
        groupId,
        topicId,
        file.originalname,
      );

    return uploadToStorage(
      storagePath,
      file,
    );
  };

/*
 * Создаёт временную ссылку
 * на приватный файл.
 *
 * Ссылка действует 15 минут.
 */
export const createFileSignedUrl =
  async (
    storagePath: string,
    downloadFileName: string,
  ): Promise<string> => {
    const expiresInSeconds =
      15 * 60;

    const { data, error } =
      await supabase.storage
        .from(
          env.SUPABASE_STORAGE_BUCKET,
        )
        .createSignedUrl(
          storagePath,
          expiresInSeconds,
          {
            download:
              downloadFileName,
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
 * Удаляет один файл
 * из Supabase Storage.
 */
export const deleteFileFromStorage =
  async (
    storagePath: string,
  ): Promise<void> => {
    const { error } =
      await supabase.storage
        .from(
          env.SUPABASE_STORAGE_BUCKET,
        )
        .remove([
          storagePath,
        ]);

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
 * Удаляет сразу несколько файлов.
 *
 * Используется при удалении сущности,
 * которая содержит несколько файлов.
 */
export const deleteFilesFromStorage =
  async (
    storagePaths: string[],
  ): Promise<void> => {
    if (
      storagePaths.length === 0
    ) {
      return;
    }

    const { error } =
      await supabase.storage
        .from(
          env.SUPABASE_STORAGE_BUCKET,
        )
        .remove(
          storagePaths,
        );

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