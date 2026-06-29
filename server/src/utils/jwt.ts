import jwt, {
  type JwtPayload,
  type SignOptions,
} from 'jsonwebtoken';

import { env } from '../config/env.js';

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
}

const signOptions: SignOptions = {
  expiresIn:
    env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  algorithm: 'HS256',
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

export const verifyAccessToken = (
  token: string,
): AccessTokenPayload => {
  const decoded = jwt.verify(
    token,
    env.JWT_SECRET,
    {
      algorithms: ['HS256'],
    },
  );

  if (
    typeof decoded === 'string' ||
    typeof decoded.userId !== 'string'
  ) {
    throw new Error('Некорректное содержимое JWT');
  }

  return decoded as AccessTokenPayload;
};