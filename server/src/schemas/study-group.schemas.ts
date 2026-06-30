import { z } from 'zod';

const studyGroupNameSchema = z
  .string()
  .trim()
  .min(
    2,
    'Название группы должно содержать минимум 2 символа',
  )
  .max(
    100,
    'Название группы не должно быть длиннее 100 символов',
  );

const studyGroupDescriptionSchema = z
  .string()
  .trim()
  .min(
    1,
    'Описание группы не должно быть пустым',
  )
  .max(
    1000,
    'Описание группы не должно быть длиннее 1000 символов',
  );

export const createStudyGroupSchema = z
  .object({
    name: studyGroupNameSchema,

    description:
      studyGroupDescriptionSchema
        .nullable()
        .optional(),
  })
  .strict();

export const updateStudyGroupSchema = z
  .object({
    name: studyGroupNameSchema.optional(),

    /*
     * null означает, что пользователь
     * хочет полностью удалить описание.
     */
    description:
      studyGroupDescriptionSchema
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

export const joinStudyGroupSchema = z
  .object({
    inviteCode: z
      .string()
      .trim()
      .transform((value) =>
        value.toUpperCase(),
      )
      .refine(
        (value) =>
          /^[A-HJ-NP-Z2-9]{8}$/.test(
            value,
          ),
        {
          message:
            'Код приглашения должен содержать 8 допустимых символов',
        },
      ),
  })
  .strict();

export const studyGroupIdSchema = z
  .string()
  .uuid(
    'Некорректный идентификатор учебной группы',
  );

export const studyGroupMemberUserIdSchema = z
  .string()
  .uuid(
    'Некорректный идентификатор участника',
  );

export type CreateStudyGroupInput = z.infer<
  typeof createStudyGroupSchema
>;

export type UpdateStudyGroupInput = z.infer<
  typeof updateStudyGroupSchema
>;

export type JoinStudyGroupInput = z.infer<
  typeof joinStudyGroupSchema
>;