import {
  Router,
} from 'express';

import {
  createGroupTopic,
  deleteGroupTopic,
  getGroupTopicById,
  getGroupTopics,
  updateGroupTopic,
} from '../controllers/study-group-topic.controller.js';

/*
 * mergeParams нужен, чтобы дочерний router
 * получил groupId из родительского маршрута:
 *
 * /:groupId/topics
 */
export const studyGroupTopicRouter =
  Router({
    mergeParams: true,
  });

/*
 * POST /api/study-groups/:groupId/topics
 */
studyGroupTopicRouter.post(
  '/',
  createGroupTopic,
);

/*
 * GET /api/study-groups/:groupId/topics
 */
studyGroupTopicRouter.get(
  '/',
  getGroupTopics,
);

/*
 * GET /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.get(
  '/:topicId',
  getGroupTopicById,
);

/*
 * PATCH /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.patch(
  '/:topicId',
  updateGroupTopic,
);

/*
 * DELETE /api/study-groups/:groupId/topics/:topicId
 */
studyGroupTopicRouter.delete(
  '/:topicId',
  deleteGroupTopic,
);