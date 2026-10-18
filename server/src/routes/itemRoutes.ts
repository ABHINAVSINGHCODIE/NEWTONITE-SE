import { Router, Response } from 'express';
import { ItemService } from '../services/itemService';
import { authenticate } from '../middleware/auth';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { AuthRequest } from '../types';
import { ItemStatus, ItemPriority, ItemType } from '@prisma/client';

export const itemRouter = Router();

// Protect all work item routes with authentication
itemRouter.use(authenticate);

/**
 * GET /items
 * List items with filters, search, and cursor pagination
 */
itemRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, priority, type, teamId, assigneeId, q, cursor, limit } = req.query;

    const result = await ItemService.listItems(req.user!, {
      status: status as ItemStatus,
      priority: priority as ItemPriority,
      type: type as ItemType,
      teamId: teamId as string,
      assigneeId: assigneeId as string,
      q: q as string,
      cursor: cursor as string,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /items
 * Create new work item with Idempotency-Key support
 */
itemRouter.post('/', idempotencyMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { title, description, type, priority, teamId, dueDate, assigneeId } = req.body;

    if (!title || !description || !type || !teamId) {
      res.status(400).json({ error: 'Title, description, type, and teamId are required.' });
      return;
    }

    const item = await ItemService.createItem(req.user!, {
      title,
      description,
      type,
      priority,
      teamId,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId,
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /items/:id
 * Retrieve item detail
 */
itemRouter.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const item = await ItemService.getItemById(req.user!, req.params.id);
    res.json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /items/:id
 * Update item with Optimistic Locking version check
 */
itemRouter.patch('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { version, title, description, priority, assigneeId, dueDate } = req.body;

    if (version === undefined || typeof version !== 'number') {
      res.status(400).json({ error: 'Version number is required for optimistic locking.' });
      return;
    }

    const updated = await ItemService.updateItem(req.user!, req.params.id, {
      version,
      title,
      description,
      priority,
      assigneeId,
      dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /items/:id/claim
 * Atomic conditional claim
 */
itemRouter.post('/:id/claim', async (req: AuthRequest, res: Response, next) => {
  try {
    const claimed = await ItemService.claimItem(req.user!, req.params.id);
    res.json(claimed);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /items/:id/transition
 * Workflow state transition with approval check
 */
itemRouter.post('/:id/transition', async (req: AuthRequest, res: Response, next) => {
  try {
    const { targetStatus } = req.body;
    if (!targetStatus) {
      res.status(400).json({ error: 'targetStatus is required' });
      return;
    }

    const item = await ItemService.transitionItem(
      req.user!,
      req.params.id,
      targetStatus as ItemStatus
    );
    res.json(item);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /items/:id/activity
 * Activity history timeline & comments
 */
itemRouter.get('/:id/activity', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = await ItemService.getActivity(req.user!, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /items/:id/comments
 * Add comment to work item
 */
itemRouter.post('/:id/comments', async (req: AuthRequest, res: Response, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Comment content cannot be empty' });
      return;
    }

    const comment = await ItemService.addComment(req.user!, req.params.id, content.trim());
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});
