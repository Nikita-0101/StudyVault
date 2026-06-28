import { Router } from 'express';

import { prisma } from '../config/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      status: 'ok',
      service: 'studyvault-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});