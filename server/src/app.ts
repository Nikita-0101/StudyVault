import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import {
  errorHandler,
  notFoundHandler,
} from './middlewares/error.middleware.js';

import { healthRouter } from './routes/health.routes.js';

export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

app.use('/api/health', healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);