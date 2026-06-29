import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const startServer = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(
        `StudyVault API started on http://localhost:${env.PORT}`,
      );
      console.log('PostgreSQL connected');
    });

    let isShuttingDown = false;

    const shutdown = (signal: string): void => {
      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;

      console.log(`\nReceived ${signal}. Shutting down...`);

      server.close(() => {
        void prisma
          .$disconnect()
          .then(() => {
            console.log('PostgreSQL disconnected');
            process.exit(0);
          })
          .catch((error: unknown) => {
            console.error(
              'Failed to disconnect PostgreSQL:',
              error,
            );
            process.exit(1);
          });
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(
      'Failed to start StudyVault API:',
      error,
    );

    await prisma.$disconnect();
    process.exit(1);
  }
};

void startServer();