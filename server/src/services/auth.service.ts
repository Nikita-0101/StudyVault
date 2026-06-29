import { hash } from 'bcryptjs';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { RegisterInput } from '../schemas/auth.schemas.js';
import { generateAccessToken } from '../utils/jwt.js';

export const registerUser = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      'Пользователь с таким email уже существует',
    );
  }

  const passwordHash = await hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  const token = generateAccessToken(user.id);

  return {
    user,
    token,
  };
};