import { Router } from 'express';

import {
  uploadPersonalMaterialFile,
} from '../controllers/personal-material-upload.controller.js';

import {
  createMaterial,
  getMaterialById,
  getMaterials,
  removeMaterial,
  updateMaterial,
} from '../controllers/personal-material.controller.js';

import {
  downloadPersonalMaterialFile,
} from '../controllers/personal-material-download.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';

import {
  uploadSingleMaterialFile,
} from '../middlewares/upload.middleware.js';

export const personalMaterialRouter = Router({
  mergeParams: true,
});

personalMaterialRouter.use(authenticate);

personalMaterialRouter.post(
  '/upload',
  uploadSingleMaterialFile,
  uploadPersonalMaterialFile,
);

personalMaterialRouter.get(
  '/:materialId/download',
  downloadPersonalMaterialFile,
);

personalMaterialRouter.post(
  '/',
  createMaterial,
);

personalMaterialRouter.get(
  '/',
  getMaterials,
);

personalMaterialRouter.get(
  '/:materialId',
  getMaterialById,
);

personalMaterialRouter.patch(
  '/:materialId',
  updateMaterial,
);

personalMaterialRouter.delete(
  '/:materialId',
  removeMaterial,
);