import { z } from 'zod';

/*
 * Общее название материала.
 */
const studyGroupMaterialTitleSchema =
  z
    .string()
    .trim()
    .min(
      2,
      'Название материала должно содержать минимум 2 символа',
    )
    .max(
      150,
      'Название материала не должно превышать 150 символов',
    );

/*
 * Текст заметки.
 */
const studyGroupMaterialContentSchema =
  z
    .string()
    .trim()
    .min(
      1,
      'Содержимое заметки не может быть пустым',
    )
    .max(
      20_000,
      'Содержимое заметки не должно превышать 20000 символов',
    );

/*
 * Проверяем:
 *
 * 1. что строка является URL;
 * 2. что используется только HTTP или HTTPS;
 * 3. что ссылка не слишком длинная.
 *
 * Например:
 *
 * https://example.com — разрешено
 * http://example.com  — разрешено
 * javascript:...      — запрещено
 */
const studyGroupMaterialUrlSchema =
  z
    .string()
    .trim()
    .url(
      'Необходимо передать корректную ссылку',
    )
    .max(
      2048,
      'Ссылка не должна превышать 2048 символов',
    )
    .refine(
      (value) => {
        try {
          const parsedUrl =
            new URL(value);

          return (
            parsedUrl.protocol ===
              'http:' ||
            parsedUrl.protocol ===
              'https:'
          );
        } catch {
          return false;
        }
      },
      {
        message:
          'Разрешены только ссылки с протоколом HTTP или HTTPS',
      },
    );

/*
 * NOTE требует:
 *
 * type
 * title
 * content
 */
const createStudyGroupNoteSchema =
  z
    .object({
      type:
        z.literal('NOTE'),

      title:
        studyGroupMaterialTitleSchema,

      content:
        studyGroupMaterialContentSchema,
    })
    .strict();

/*
 * LINK требует:
 *
 * type
 * title
 * url
 */
const createStudyGroupLinkSchema =
  z
    .object({
      type:
        z.literal('LINK'),

      title:
        studyGroupMaterialTitleSchema,

      url:
        studyGroupMaterialUrlSchema,
    })
    .strict();

/*
 * Через обычный JSON-маршрут
 * создаём только NOTE и LINK.
 *
 * FILE создаётся через отдельный
 * multipart/form-data маршрут:
 *
 * POST /materials/upload
 */
export const createStudyGroupMaterialSchema =
  z.discriminatedUnion(
    'type',
    [
      createStudyGroupNoteSchema,
      createStudyGroupLinkSchema,
    ],
  );

/*
 * Дополнительные поля, которые можно
 * передать вместе с файлом через
 * multipart/form-data.
 *
 * Поле title необязательное.
 *
 * Если клиент его не передаст,
 * название материала будет создано
 * из исходного имени файла.
 *
 * Например:
 *
 * "Лекция 1.pdf"
 *
 * превратится в:
 *
 * "Лекция 1"
 */
export const uploadStudyGroupMaterialSchema =
  z
    .object({
      title:
        studyGroupMaterialTitleSchema
          .optional(),
    })
    .strict();

/*
 * При PATCH тип материала не меняется.
 *
 * Можно:
 *
 * изменить title;
 * изменить content у NOTE;
 * изменить url у LINK.
 *
 * Проверка соответствия content и url
 * реальному типу материала выполняется
 * в сервисе.
 *
 * FILE через обычный PATCH
 * изменять нельзя.
 */
export const updateStudyGroupMaterialSchema =
  z
    .object({
      title:
        studyGroupMaterialTitleSchema
          .optional(),

      content:
        studyGroupMaterialContentSchema
          .optional(),

      url:
        studyGroupMaterialUrlSchema
          .optional(),
    })
    .strict()
    .refine(
      (value) =>
        value.title !== undefined ||
        value.content !== undefined ||
        value.url !== undefined,
      {
        message:
          'Необходимо передать хотя бы одно поле для изменения',
      },
    );

/*
 * Проверка materialId из URL.
 */
export const studyGroupMaterialIdSchema =
  z
    .string()
    .uuid(
      'Некорректный идентификатор материала учебной группы',
    );

/*
 * Тип входных данных для создания
 * NOTE или LINK.
 */
export type CreateStudyGroupMaterialInput =
  z.infer<
    typeof createStudyGroupMaterialSchema
  >;

/*
 * Тип дополнительных данных
 * при загрузке FILE.
 */
export type UploadStudyGroupMaterialInput =
  z.infer<
    typeof uploadStudyGroupMaterialSchema
  >;

/*
 * Тип входных данных для PATCH.
 */
export type UpdateStudyGroupMaterialInput =
  z.infer<
    typeof updateStudyGroupMaterialSchema
  >;