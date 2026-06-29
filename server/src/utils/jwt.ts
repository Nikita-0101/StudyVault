import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export interface AccessTokenPayload {
  userId: string;
}

const signOptions: SignOptions = {
  expiresIn:
    env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

export const generateAccessToken = (
  userId: string,
): string => {
  const payload: AccessTokenPayload = {
    userId,
  };

  return jwt.sign(
    payload,
    env.JWT_SECRET,
    signOptions,
  );
};