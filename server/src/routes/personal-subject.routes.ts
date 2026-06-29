import { Router } from 'express';

import {
  createSubject,
  getSubjectById,
  getSubjects,
  removeSubject,
  updateSubject,
} from '../controllers/personal-subject.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const personalSubjectRouter = Router();

personalSubjectRouter.use(authenticate);

personalSubjectRouter.post('/', createSubject);
personalSubjectRouter.get('/', getSubjects);
personalSubjectRouter.get('/:id', getSubjectById);
personalSubjectRouter.patch('/:id', updateSubject);
personalSubjectRouter.delete('/:id', removeSubject);