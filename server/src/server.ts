import 'dotenv/config';

import { app } from './app.js';
import { prisma } from './config/prisma.js';

const port = Number(process.env.PORT ?? 5000);

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(
        `StudyVault API started on http://localhost:${port}`,
      );
      console.log('PostgreSQL connected');
    });

    const shutdown = (signal: string): void => {
      console.log(`\nReceived ${signal}. Shutting down...`);

      server.close(() => {
        void prisma.$disconnect().finally(() => {
          console.log('PostgreSQL disconnected');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start StudyVault API:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void startServer();