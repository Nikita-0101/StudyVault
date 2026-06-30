import { Router } from 'express';

import {
  createGroup,
  getGroupById,
  getGroups,
  joinGroup,
  updateGroup,
  leaveGroup,
  removeGroupMember,
  deleteGroup,
} from '../controllers/study-group.controller.js';

import {
  authenticate,
} from '../middlewares/auth.middleware.js';

export const studyGroupRouter =
  Router();

studyGroupRouter.use(
  authenticate,
);

/*
 * Специальный маршрут ставим раньше /:groupId.
 *
 * Иначе Express может воспринять слово join
 * как идентификатор группы.
 */
studyGroupRouter.post(
  '/join',
  joinGroup,
);

/*
 * POST /api/study-groups
 */
studyGroupRouter.post(
  '/',
  createGroup,
);

/*
 * GET /api/study-groups
 */
studyGroupRouter.get(
  '/',
  getGroups,
);

/*
 * POST /api/study-groups/:groupId/leave
 */
studyGroupRouter.post(
  '/:groupId/leave',
  leaveGroup,
);

/*
 * DELETE /api/study-groups/:groupId/members/:userId
 *
 * Только владелец группы.
 */
studyGroupRouter.delete(
  '/:groupId/members/:userId',
  removeGroupMember,
);

/*
 * GET /api/study-groups/:groupId
 *
 * Динамический маршрут располагается
 * после статических маршрутов.
 */
studyGroupRouter.get(
  '/:groupId',
  getGroupById,
);

/*
 * PATCH /api/study-groups/:groupId
 *
 * Только владелец группы.
 */
studyGroupRouter.patch(
  '/:groupId',
  updateGroup,
);

/*
 * DELETE /api/study-groups/:groupId
 *
 * Полностью удаляет группу.
 * Доступно только владельцу.
 */
studyGroupRouter.delete(
  '/:groupId',
  deleteGroup,
);