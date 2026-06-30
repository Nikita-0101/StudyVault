import { z } from 'zod';

const studyGroupTopicNameSchema = z
  .string()
  .trim()
  .min(
    2,
    'Название темы должно содержать минимум 2 символа',
  )
  .max(
    100,
    'Название темы не должно быть длиннее 100 символов',
  );

const studyGroupTopicDescriptionSchema = z
  .string()
  .trim()
  .min(
    1,
    'Описание темы не должно быть пустым',
  )
  .max(
    1000,
    'Описание темы не должно быть длиннее 1000 символов',
  );

const studyGroupTopicColorSchema = z
  .string()
  .trim()
  .regex(
    /^#[0-9A-Fa-f]{6}$/,
    'Цвет должен быть указан в формате #RRGGBB',
  )
  .transform((value) =>
    value.toUpperCase(),
  );

export const createStudyGroupTopicSchema = z
  .object({
    name:
      studyGroupTopicNameSchema,

    description:
      studyGroupTopicDescriptionSchema
        .nullable()
        .optional(),

    color:
      studyGroupTopicColorSchema
        .nullable()
        .optional(),
  })
  .strict();

export const updateStudyGroupTopicSchema = z
  .object({
    name:
      studyGroupTopicNameSchema
        .optional(),

    /*
     * null полностью удаляет описание.
     */
    description:
      studyGroupTopicDescriptionSchema
        .nullable()
        .optional(),

    /*
     * null полностью удаляет цвет.
     */
    color:
      studyGroupTopicColorSchema
        .nullable()
        .optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        'Необходимо передать хотя бы одно поле для изменения',
    },
  );

export const studyGroupTopicIdSchema = z
  .string()
  .uuid(
    'Некорректный идентификатор темы учебной группы',
  );

export type CreateStudyGroupTopicInput =
  z.infer<
    typeof createStudyGroupTopicSchema
  >;

export type UpdateStudyGroupTopicInput =
  z.infer<
    typeof updateStudyGroupTopicSchema
  >;