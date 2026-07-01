import { Router } from 'express';

import {
  createGroupTopic,
  deleteGroupTopic,
  getGroupTopicById,
  getGroupTopics,
  updateGroupTopic,
} from '../controllers/study-group-topic.controller.js';

import {
  studyGroupMaterialRouter,
} from './study-group-material.routes.js';

/*
 * mergeParams нужен для получения
 * groupId из родительского router.
 */
export const studyGroupTopicRouter =
  Router({
    mergeParams: true,
  });

/*
 * POST
 * /api/study-groups/:groupId/topics
 */
studyGroupTopicRouter.post(
  '/',
  createGroupTopic,
);

/*
 * GET
 * /api/study-groups/:groupId/topics
 */
studyGroupTopicRouter.get(
  '/',
  getGroupTopics,
);

/*
 * Вложенный router материалов.
 *
 * Итоговые маршруты:
 *
 * POST
 * /api/study-groups/:groupId/topics/:topicId/materials
 *
 * GET
 * /api/study-groups/:groupId/topics/:topicId/materials
 *
 * GET
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 *
 * PATCH
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 *
 * DELETE
 * /api/study-groups/:groupId/topics/:topicId/materials/:materialId
 */
studyGroupTopicRouter.use(
  '/:topicId/materials',
  studyGroupMaterialRouter,
);

/*
 * GET
 * /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.get(
  '/:topicId',
  getGroupTopicById,
);

/*
 * PATCH
 * /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.patch(
  '/:topicId',
  updateGroupTopic,
);

/*
 * DELETE
 * /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.delete(
  '/:topicId',
  deleteGroupTopic,
);