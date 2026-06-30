import { z } from 'zod';

/*
 * Через этот маршрут разрешено:
 *
 * MEMBER -> EDITOR
 * EDITOR -> MEMBER
 *
 * OWNER здесь отсутствует намеренно.
 * Передача владения должна быть
 * отдельной транзакционной операцией.
 */
export const updateStudyGroupMemberRoleSchema =
  z
    .object({
      role: z.enum([
        'EDITOR',
        'MEMBER',
      ]),
    })
    .strict();

export const studyGroupMemberUserIdSchema =
  z
    .string()
    .uuid(
      'Некорректный идентификатор участника учебной группы',
    );

export type UpdateStudyGroupMemberRoleInput =
  z.infer<
    typeof updateStudyGroupMemberRoleSchema
  >;