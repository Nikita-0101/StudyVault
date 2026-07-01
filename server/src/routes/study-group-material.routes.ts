import { Router } from 'express';

import {
  createGroupMaterial,
  deleteGroupMaterial,
  getGroupMaterialById,
  getGroupMaterials,
  updateGroupMaterial,
} from '../controllers/study-group-material.controller.js';

import {
  uploadStudyGroupMaterialFile,
} from '../controllers/study-group-material-upload.controller.js';

import {
  downloadStudyGroupMaterialFile,
} from '../controllers/study-group-material-download.controller.js';

import {
  uploadSingleMaterialFile,
} from '../middlewares/upload.middleware.js';

/*
 * Получаем groupId и topicId
 * от родительских роутеров.
 */
export const studyGroupMaterialRouter =
  Router({
    mergeParams: true,
  });

/*
 * Загрузка файла.
 *
 * Multer:
 *
 * принимает поле file;
 * хранит файл временно в RAM;
 * проверяет MIME;
 * проверяет максимальный размер.
 */
studyGroupMaterialRouter.post(
  '/upload',
  uploadSingleMaterialFile,
  uploadStudyGroupMaterialFile,
);

/*
 * Получение временной ссылки
 * на скачивание приватного файла.
 *
 * Этот маршрут должен находиться
 * раньше /:materialId.
 */
studyGroupMaterialRouter.get(
  '/:materialId/download',
  downloadStudyGroupMaterialFile,
);

/*
 * Создание NOTE или LINK.
 */
studyGroupMaterialRouter.post(
  '/',
  createGroupMaterial,
);

/*
 * Список материалов темы.
 */
studyGroupMaterialRouter.get(
  '/',
  getGroupMaterials,
);

/*
 * Получение одного материала.
 */
studyGroupMaterialRouter.get(
  '/:materialId',
  getGroupMaterialById,
);

/*
 * Изменение NOTE или LINK.
 */
studyGroupMaterialRouter.patch(
  '/:materialId',
  updateGroupMaterial,
);

/*
 * Удаление NOTE, LINK или FILE.
 */
studyGroupMaterialRouter.delete(
  '/:materialId',
  deleteGroupMaterial,
);