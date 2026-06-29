import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { personalSubjectRouter } from './routes/personal-subject.routes.js';
import { personalMaterialRouter } from './routes/personal-material.routes.js';

export const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: '1mb',
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  }),
);

app.use(morgan('dev'));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

app.use(
  '/api/personal-subjects',
  personalSubjectRouter,
);

app.use(
  '/api/personal-subjects/:subjectId/materials',
  personalMaterialRouter,
);

app.use(notFoundHandler);
app.use(errorHandler);