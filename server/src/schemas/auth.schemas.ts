import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно быть длиннее 50 символов'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Некорректный email'),

  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(128, 'Пароль не должен быть длиннее 128 символов'),
});

export type RegisterInput = z.infer<typeof registerSchema>;