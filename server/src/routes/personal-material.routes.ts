import { Router } from 'express';

import {
  createMaterial,
  getMaterialById,
  getMaterials,
  removeMaterial,
  updateMaterial,
} from '../controllers/personal-material.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const personalMaterialRouter = Router({
  mergeParams: true,
});

personalMaterialRouter.use(authenticate);

personalMaterialRouter.post('/', createMaterial);
personalMaterialRouter.get('/', getMaterials);
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