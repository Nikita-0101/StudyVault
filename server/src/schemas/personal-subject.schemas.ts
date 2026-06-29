import { z } from 'zod';

const subjectNameSchema = z
  .string()
  .trim()
  .min(2, 'Название должно содержать минимум 2 символа')
  .max(100, 'Название не должно быть длиннее 100 символов');

const descriptionSchema = z
  .string()
  .trim()
  .max(
    500,
    'Описание не должно быть длиннее 500 символов',
  );

const colorSchema = z
  .string()
  .trim()
  .regex(
    /^#[0-9A-Fa-f]{6}$/,
    'Цвет должен быть указан в формате #RRGGBB',
  );

export const createPersonalSubjectSchema = z
  .object({
    name: subjectNameSchema,

    description: descriptionSchema
      .nullable()
      .optional(),

    color: colorSchema
      .nullable()
      .optional(),
  })
  .strict();

export const updatePersonalSubjectSchema = z
  .object({
    name: subjectNameSchema.optional(),

    description: descriptionSchema
      .nullable()
      .optional(),

    color: colorSchema
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'Необходимо передать хотя бы одно поле для изменения',
    },
  );

export const personalSubjectIdSchema = z
  .string()
  .uuid('Некорректный идентификатор предмета');

export type CreatePersonalSubjectInput = z.infer<
  typeof createPersonalSubjectSchema
>;

export type UpdatePersonalSubjectInput = z.infer<
  typeof updatePersonalSubjectSchema
>;