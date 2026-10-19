import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import {
  moderationActionSchema,
  submitAppealSchema,
  reviewAppealSchema,
  contentTakedownSchema,
} from '@sahaaye/shared';
import { createActionHandler, getActionHandler } from './actions';
import {
  submitAppealHandler,
  reviewAppealHandler,
  getMyAppealsHandler,
  listAppealsHandler,
  getAppealByIdHandler,
} from './appeals';
import { getQueueHandler } from './queue';
import { takedownHandler } from './takedown';

export const moderationRouter = Router();

// --- Moderation Queue (Moderators & Admins only) ---
moderationRouter.get(
  '/queue',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  getQueueHandler
);

// --- Moderation Actions (Moderators & Admins only) ---
moderationRouter.post(
  '/actions',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  validateRequest(moderationActionSchema),
  createActionHandler
);

moderationRouter.get(
  '/actions/:id',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  getActionHandler
);

// --- Content Takedown (Moderators & Admins only) ---
moderationRouter.post(
  '/takedown',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  validateRequest(contentTakedownSchema),
  takedownHandler
);

// --- Appeals System ---
// Any authenticated user can submit an appeal against action taken on them
moderationRouter.post(
  '/appeals',
  authenticate,
  validateRequest(submitAppealSchema),
  submitAppealHandler
);

// Authenticated user can view their own appeals
moderationRouter.get(
  '/appeals/my',
  authenticate,
  getMyAppealsHandler
);

// Moderators/Admins can list appeals
moderationRouter.get(
  '/appeals',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  listAppealsHandler
);

// View single appeal (Owner or Moderator/Admin)
moderationRouter.get(
  '/appeals/:id',
  authenticate,
  getAppealByIdHandler
);

// Review/Adjudicate appeal (Moderators & Admins only)
moderationRouter.patch(
  '/appeals/:id/review',
  authenticate,
  authorize(['MODERATOR', 'ADMIN']),
  validateRequest(reviewAppealSchema),
  reviewAppealHandler
);
