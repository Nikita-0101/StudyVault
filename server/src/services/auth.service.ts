import { compare, hash } from 'bcryptjs';

import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/app-error.js';
import type {
  LoginInput,
  RegisterInput,
} from '../schemas/auth.schemas.js';
import { generateAccessToken } from '../utils/jwt.js';

export const registerUser = async (
  input: RegisterInput,
) => {
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

export const loginUser = async (
  input: LoginInput,
) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(
      401,
      'Неверный email или пароль',
    );
  }

  const passwordMatches = await compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      'Неверный email или пароль',
    );
  }

  const token = generateAccessToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
    token,
  };
};

export const getCurrentUser = async (
  userId: string,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(
      401,
      'Пользователь токена не найден',
    );
  }

  return user;
};