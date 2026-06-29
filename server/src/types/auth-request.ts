import type { Request } from 'express';

export type AuthenticatedUser = {
  userId: string;
  iat?: number;
  exp?: number;
};

export interface AuthenticatedRequest extends Request {
  auth: AuthenticatedUser;
}