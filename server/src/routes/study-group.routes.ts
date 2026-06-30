import { Router } from 'express';

import {
  createGroup,
  deleteGroup,
  getGroupById,
  getGroups,
  joinGroup,
  leaveGroup,
  removeGroupMember,
  updateGroup,
} from '../controllers/study-group.controller.js';

import {
  updateGroupMemberRole,
} from '../controllers/study-group-member-role.controller.js';

import {
  authenticate,
} from '../middlewares/auth.middleware.js';

import {
  studyGroupTopicRouter,
} from './study-group-topic.routes.js';

export const studyGroupRouter =
  Router();

/*
 * Все маршруты учебных групп
 * требуют авторизации через JWT.
 *
 * Middleware также защищает
 * вложенные маршруты тем.
 */
studyGroupRouter.use(
  authenticate,
);

/*
 * POST /api/study-groups/join
 *
 * Статический маршрут должен находиться
 * раньше маршрутов с параметром /:groupId.
 *
 * Иначе Express может воспринять
 * слово join как идентификатор группы.
 */
studyGroupRouter.post(
  '/join',
  joinGroup,
);

/*
 * POST /api/study-groups
 *
 * Создание учебной группы.
 */
studyGroupRouter.post(
  '/',
  createGroup,
);

/*
 * GET /api/study-groups
 *
 * Получение всех учебных групп,
 * в которых состоит текущий пользователь.
 */
studyGroupRouter.get(
  '/',
  getGroups,
);

/*
 * Вложенные маршруты тем:
 *
 * POST
 * /api/study-groups/:groupId/topics
 *
 * GET
 * /api/study-groups/:groupId/topics
 *
 * GET
 * /api/study-groups/:groupId/topics/:topicId
 *
 * PATCH
 * /api/study-groups/:groupId/topics/:topicId
 *
 * DELETE
 * /api/study-groups/:groupId/topics/:topicId
 */
studyGroupRouter.use(
  '/:groupId/topics',
  studyGroupTopicRouter,
);

/*
 * POST /api/study-groups/:groupId/leave
 *
 * Обычный участник выходит из группы.
 * Владелец не может выйти,
 * пока не передаст владение.
 */
studyGroupRouter.post(
  '/:groupId/leave',
  leaveGroup,
);

/*
 * PATCH
 * /api/study-groups/:groupId/members/:userId/role
 *
 * Только владелец группы может:
 *
 * MEMBER -> EDITOR
 * EDITOR -> MEMBER
 */
studyGroupRouter.patch(
  '/:groupId/members/:userId/role',
  updateGroupMemberRole,
);

/*
 * DELETE
 * /api/study-groups/:groupId/members/:userId
 *
 * Только владелец может удалить
 * обычного участника или редактора
 * из учебной группы.
 */
studyGroupRouter.delete(
  '/:groupId/members/:userId',
  removeGroupMember,
);

/*
 * GET /api/study-groups/:groupId
 *
 * Получение одной учебной группы
 * вместе со списком участников.
 *
 * Динамический маршрут располагается
 * после более конкретных маршрутов.
 */
studyGroupRouter.get(
  '/:groupId',
  getGroupById,
);

/*
 * PATCH /api/study-groups/:groupId
 *
 * Изменение названия или описания группы.
 * Доступно только владельцу.
 */
studyGroupRouter.patch(
  '/:groupId',
  updateGroup,
);

/*
 * DELETE /api/study-groups/:groupId
 *
 * Полное удаление учебной группы.
 * Доступно только владельцу.
 */
studyGroupRouter.delete(
  '/:groupId',
  deleteGroup,
);