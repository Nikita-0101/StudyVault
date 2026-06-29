import { z } from 'zod';

const titleSchema = z
  .string()
  .trim()
  .min(2, 'Название должно содержать минимум 2 символа')
  .max(150, 'Название не должно быть длиннее 150 символов');

const contentSchema = z
  .string()
  .trim()
  .min(1, 'Текст заметки не должен быть пустым')
  .max(
    20_000,
    'Текст заметки не должен быть длиннее 20000 символов',
  );

const urlSchema = z
  .string()
  .trim()
  .url('Некорректный адрес ссылки')
  .max(2048, 'Ссылка слишком длинная');

/*
 * Создание текстовой заметки.
 */
const createNoteSchema = z
  .object({
    type: z.literal('NOTE'),
    title: titleSchema,
    content: contentSchema,
  })
  .strict();

/*
 * Создание материала-ссылки.
 */
const createLinkSchema = z
  .object({
    type: z.literal('LINK'),
    title: titleSchema,
    url: urlSchema,
  })
  .strict();

/*
 * Обычный JSON-маршрут теперь создаёт
 * только заметки и ссылки.
 *
 * Файлы будут создаваться отдельным
 * маршрутом через multipart/form-data.
 */
export const createPersonalMaterialSchema =
  z.discriminatedUnion('type', [
    createNoteSchema,
    createLinkSchema,
  ]);

/*
 * Данные, которые можно передать
 * вместе с загружаемым файлом.
 *
 * Название необязательное:
 * если оно не передано, возьмём имя файла.
 */
export const uploadPersonalMaterialSchema = z
  .object({
    title: titleSchema.optional(),
  })
  .strict();

/*
 * Изменение существующего материала.
 *
 * Технические данные файла:
 * storagePath, fileName, mimeType и fileSize
 * пользователь изменять вручную не должен.
 */
export const updatePersonalMaterialSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
    url: urlSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'Необходимо передать хотя бы одно поле для изменения',
    },
  );

export const personalMaterialIdSchema = z
  .string()
  .uuid('Некорректный идентификатор материала');

export type CreatePersonalMaterialInput = z.infer<
  typeof createPersonalMaterialSchema
>;

export type UploadPersonalMaterialInput = z.infer<
  typeof uploadPersonalMaterialSchema
>;

export type UpdatePersonalMaterialInput = z.infer<
  typeof updatePersonalMaterialSchema
>;