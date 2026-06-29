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

const fileNameSchema = z
  .string()
  .trim()
  .min(1, 'Название файла не должно быть пустым')
  .max(255, 'Название файла слишком длинное');

const mimeTypeSchema = z
  .string()
  .trim()
  .min(1, 'Тип файла не должен быть пустым')
  .max(100, 'Тип файла слишком длинный');

const fileSizeSchema = z
  .number()
  .int('Размер файла должен быть целым числом')
  .positive('Размер файла должен быть больше нуля')
  .max(
    50 * 1024 * 1024,
    'Размер файла не должен превышать 50 МБ',
  );

const createNoteSchema = z
  .object({
    type: z.literal('NOTE'),
    title: titleSchema,
    content: contentSchema,
  })
  .strict();

const createLinkSchema = z
  .object({
    type: z.literal('LINK'),
    title: titleSchema,
    url: urlSchema,
  })
  .strict();

const createFileSchema = z
  .object({
    type: z.literal('FILE'),
    title: titleSchema,
    fileName: fileNameSchema,
    fileUrl: urlSchema,
    mimeType: mimeTypeSchema,
    fileSize: fileSizeSchema,
  })
  .strict();

export const createPersonalMaterialSchema =
  z.discriminatedUnion('type', [
    createNoteSchema,
    createLinkSchema,
    createFileSchema,
  ]);

export const updatePersonalMaterialSchema = z
  .object({
    title: titleSchema.optional(),
    content: contentSchema.nullable().optional(),
    url: urlSchema.nullable().optional(),
    fileName: fileNameSchema.nullable().optional(),
    fileUrl: urlSchema.nullable().optional(),
    mimeType: mimeTypeSchema.nullable().optional(),
    fileSize: fileSizeSchema.nullable().optional(),
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

export type UpdatePersonalMaterialInput = z.infer<
  typeof updatePersonalMaterialSchema
>;