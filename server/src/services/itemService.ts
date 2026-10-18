import { Prisma, ItemStatus, ItemPriority, ItemType, Role } from '@prisma/client';
import prisma from '../db';
import { AuthenticatedUser, ItemQueryFilters, ALLOWED_TRANSITIONS } from '../types';
import { AuthorizationService } from './authorizationService';
import { OutboxService } from './outboxService';

export class ItemService {
  /**
   * List work items with server-side filters, search, and cursor-based pagination.
   * Scoped strictly to the teams the user belongs to.
   */
  static async listItems(user: AuthenticatedUser, filters: ItemQueryFilters) {
    const userTeamIds = user.memberships.map((m) => m.teamId);

    // If user has no teams, return empty
    if (userTeamIds.length === 0) {
      return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
    }

    // Scoped team filter
    const effectiveTeamIds = filters.teamId
      ? userTeamIds.includes(filters.teamId)
        ? [filters.teamId]
        : []
      : userTeamIds;

    if (effectiveTeamIds.length === 0) {
      return { items: [], nextCursor: null, hasMore: false, totalCount: 0 };
    }

    const where: Prisma.WorkItemWhereInput = {
      teamId: { in: effectiveTeamIds },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.assigneeId !== undefined) {
      where.assigneeId = filters.assigneeId === 'null' ? null : filters.assigneeId;
    }

    if (filters.q && filters.q.trim()) {
      const query = filters.q.trim();
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const take = limit + 1; // Fetch 1 extra to determine hasMore

    const queryArgs: Prisma.WorkItemFindManyArgs = {
      where,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        team: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    };

    if (filters.cursor) {
      queryArgs.skip = 1;
      queryArgs.cursor = { id: filters.cursor };
    }

    const [itemsWithExtra, totalCount] = await Promise.all([
      prisma.workItem.findMany(queryArgs),
      prisma.workItem.count({ where }),
    ]);

    const hasMore = itemsWithExtra.length > limit;
    const items = hasMore ? itemsWithExtra.slice(0, limit) : itemsWithExtra;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * Retrieve a single item by ID, scoped to user's team membership.
   */
  static async getItemById(user: AuthenticatedUser, id: string) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!item) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    AuthorizationService.assertAuthorized(user, {
      action: 'READ',
      teamId: item.teamId,
    });

    return item;
  }

  /**
   * Create a new work item.
   * Atomically records item creation, activity event, and outbox job in a single transaction.
   */
  static async createItem(
    user: AuthenticatedUser,
    data: {
      title: string;
      description: string;
      type: ItemType;
      priority?: ItemPriority;
      teamId: string;
      dueDate?: Date | null;
      assigneeId?: string | null;
    }
  ) {
    AuthorizationService.assertAuthorized(user, {
      action: 'CREATE',
      teamId: data.teamId,
    });

    return prisma.$transaction(async (tx) => {
      const item = await tx.workItem.create({
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority || ItemPriority.medium,
          status: ItemStatus.Open,
          teamId: data.teamId,
          createdById: user.id,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate,
          version: 1,
        },
        include: {
          team: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      // Record activity event
      await tx.activityEvent.create({
        data: {
          workItemId: item.id,
          actorId: user.id,
          action: 'created',
          toValue: ItemStatus.Open,
          metadata: JSON.stringify({ priority: item.priority, type: item.type }),
        },
      });

      // Enqueue Outbox notification
      await OutboxService.enqueueJob(tx, 'work_item_created', {
        workItemId: item.id,
        eventType: 'created',
        title: `New work item created: ${item.title}`,
        dedupKey: `created_${item.id}`,
      });

      return item;
    });
  }

  /**
   * Update work item with Optimistic Locking version check.
   * Rejects update if client version does not match database version.
   */
  static async updateItem(
    user: AuthenticatedUser,
    id: string,
    data: {
      version: number;
      title?: string;
      description?: string;
      priority?: ItemPriority;
      assigneeId?: string | null;
      dueDate?: Date | null;
    }
  ) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    AuthorizationService.assertAuthorized(user, {
      action: 'UPDATE',
      teamId: existing.teamId,
    });

    // Check version
    if (data.version !== undefined && data.version !== existing.version) {
      const err: any = new Error(
        `Version conflict: Item was modified by another user. Latest version is ${existing.version}. Please refresh.`
      );
      err.status = 409;
      err.latestItem = existing;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      // Perform update with WHERE version = expectedVersion to prevent race conditions
      const updateResult = await tx.workItem.updateMany({
        where: {
          id,
          version: data.version,
        },
        data: {
          title: data.title !== undefined ? data.title : undefined,
          description: data.description !== undefined ? data.description : undefined,
          priority: data.priority !== undefined ? data.priority : undefined,
          assigneeId: data.assigneeId !== undefined ? data.assigneeId : undefined,
          dueDate: data.dueDate !== undefined ? data.dueDate : undefined,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        const latest = await tx.workItem.findUnique({ where: { id } });
        const err: any = new Error(
          'Version conflict: Item was concurrently updated by another transaction.'
        );
        err.status = 409;
        err.latestItem = latest;
        throw err;
      }

      const updatedItem = await tx.workItem.findUniqueOrThrow({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit priority change if modified
      if (data.priority && data.priority !== existing.priority) {
        await tx.activityEvent.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: 'priority_changed',
            fromValue: existing.priority,
            toValue: data.priority,
          },
        });
      }

      // Audit assignee change if modified
      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        await tx.activityEvent.create({
          data: {
            workItemId: id,
            actorId: user.id,
            action: 'assigned',
            fromValue: existing.assigneeId || 'Unassigned',
            toValue: data.assigneeId || 'Unassigned',
          },
        });

        if (data.assigneeId) {
          await OutboxService.enqueueJob(tx, 'notify_new_assignee', {
            workItemId: id,
            recipientId: data.assigneeId,
            eventType: 'assigned',
            title: `Assigned to you: ${updatedItem.title}`,
            dedupKey: `assign_${id}_${data.assigneeId}_v${updatedItem.version}`,
          });
        }
      }

      return updatedItem;
    });
  }

  /**
   * Atomic conditional claim.
   * Executes atomic conditional update: WHERE id = ? AND assigneeId IS NULL.
   * If 0 rows updated, throws 409 Conflict.
   */
  static async claimItem(user: AuthenticatedUser, id: string) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    AuthorizationService.assertAuthorized(user, {
      action: 'CLAIM',
      teamId: existing.teamId,
    });

    return prisma.$transaction(async (tx) => {
      // Atomic conditional update ensuring concurrency safety
      const updatedCount = await tx.$executeRaw`
        UPDATE "work_items"
        SET "assigneeId" = ${user.id},
            "version" = "version" + 1,
            "updatedAt" = NOW()
        WHERE "id" = ${id} AND "assigneeId" IS NULL;
      `;

      if (updatedCount === 0) {
        const currentItem = await tx.workItem.findUnique({ where: { id } });
        const err: any = new Error(
          'Conflict: Item is already claimed or assigned to another user.'
        );
        err.status = 409;
        err.latestItem = currentItem;
        throw err;
      }

      const item = await tx.workItem.findUniqueOrThrow({
        where: { id },
        include: {
          team: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      // Record activity event
      await tx.activityEvent.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'claimed',
          toValue: user.name,
        },
      });

      // Outbox notification
      await OutboxService.enqueueJob(tx, 'work_item_claimed', {
        workItemId: id,
        recipientId: user.id,
        eventType: 'claimed',
        title: `Claimed: ${item.title}`,
        dedupKey: `claim_${id}_${user.id}_v${item.version}`,
      });

      return item;
    });
  }

  /**
   * Workflow state transition with server-enforced allowed transitions
   * and role-based approval check.
   */
  static async transitionItem(user: AuthenticatedUser, id: string, targetStatus: ItemStatus) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    const currentStatus = existing.status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      const err: any = new Error(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`
      );
      err.status = 400;
      throw err;
    }

    // Server-enforced role check: approval step requires Lead or Admin
    AuthorizationService.assertAuthorized(
      user,
      {
        action: 'TRANSITION',
        teamId: existing.teamId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
      },
      `Only a Team Lead or Admin can approve and resolve items awaiting approval.`
    );

    return prisma.$transaction(async (tx) => {
      const updated = await tx.workItem.update({
        where: { id },
        data: {
          status: targetStatus,
          version: { increment: 1 },
        },
        include: {
          team: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      // Record activity event
      await tx.activityEvent.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'status_changed',
          fromValue: currentStatus,
          toValue: targetStatus,
        },
      });

      // Outbox notification
      await OutboxService.enqueueJob(tx, 'status_transition', {
        workItemId: id,
        eventType: 'status_changed',
        title: `Item '${updated.title}' moved to ${targetStatus}`,
        details: { from: currentStatus, to: targetStatus },
        dedupKey: `trans_${id}_${targetStatus}_v${updated.version}`,
      });

      return updated;
    });
  }

  /**
   * Add a comment to an item and record activity in the same transaction.
   */
  static async addComment(user: AuthenticatedUser, id: string, content: string) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    AuthorizationService.assertAuthorized(user, {
      action: 'COMMENT',
      teamId: existing.teamId,
    });

    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          workItemId: id,
          authorId: user.id,
          content,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.activityEvent.create({
        data: {
          workItemId: id,
          actorId: user.id,
          action: 'comment_added',
          metadata: JSON.stringify({ commentId: comment.id }),
        },
      });

      return comment;
    });
  }

  /**
   * Get activity timeline and comments for an item.
   */
  static async getActivity(user: AuthenticatedUser, id: string) {
    const existing = await prisma.workItem.findUnique({
      where: { id },
    });

    if (!existing) {
      const err: any = new Error('Work item not found');
      err.status = 404;
      throw err;
    }

    AuthorizationService.assertAuthorized(user, {
      action: 'READ',
      teamId: existing.teamId,
    });

    const [activities, comments] = await Promise.all([
      prisma.activityEvent.findMany({
        where: { workItemId: id },
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.comment.findMany({
        where: { workItemId: id },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { activities, comments };
  }
}
