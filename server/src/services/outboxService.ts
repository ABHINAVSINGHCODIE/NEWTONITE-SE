import { Prisma, OutboxStatus } from '@prisma/client';
import prisma from '../db';

export interface OutboxPayload {
  workItemId: string;
  recipientId?: string;
  eventType: string;
  title: string;
  details?: Record<string, any>;
  dedupKey?: string;
}

// In-memory or simulated notification sink for audit and testing verification
export const deliveredNotifications: Array<{
  jobId: string;
  dedupKey?: string;
  recipientId?: string;
  title: string;
  deliveredAt: Date;
}> = [];

export class OutboxService {
  /**
   * Enqueue a job into the outbox within an existing database transaction.
   */
  static async enqueueJob(
    tx: Prisma.TransactionClient,
    jobType: string,
    payload: OutboxPayload,
    maxAttempts = 3
  ) {
    return tx.outboxJob.create({
      data: {
        jobType,
        payload: JSON.stringify(payload),
        status: OutboxStatus.pending,
        attempts: 0,
        maxAttempts,
        nextRunAt: new Date(),
      },
    });
  }

  /**
   * Idempotent notification processor handler.
   * If a notification with the same dedupKey was already delivered, it safely skips delivery.
   */
  static async executeHandler(jobId: string, payload: OutboxPayload): Promise<void> {
    if (payload.title === 'FORCE_FAIL') {
      throw new Error('Simulated external delivery failure');
    }

    // Deduplication check to guarantee idempotency
    const alreadyDelivered = deliveredNotifications.some(
      (n) => payload.dedupKey && n.dedupKey === payload.dedupKey
    );

    if (alreadyDelivered) {
      console.log(`[Outbox] Duplicate job ignored: dedupKey=${payload.dedupKey}`);
      return;
    }

    // Deliver notification
    deliveredNotifications.push({
      jobId,
      dedupKey: payload.dedupKey,
      recipientId: payload.recipientId,
      title: payload.title,
      deliveredAt: new Date(),
    });
  }

  /**
   * Processes all pending outbox jobs that are ready to run.
   * Handles retry limits, exponential backoff, and marking completed/failed.
   */
  static async processPendingJobs(limit = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();

    const jobs = await prisma.outboxJob.findMany({
      where: {
        status: { in: [OutboxStatus.pending] },
        nextRunAt: { lte: now },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
      // Mark as processing
      await prisma.outboxJob.update({
        where: { id: job.id },
        data: { status: OutboxStatus.processing },
      });

      try {
        const payload: OutboxPayload = JSON.parse(job.payload);
        await this.executeHandler(job.id, payload);

        // Mark as completed
        await prisma.outboxJob.update({
          where: { id: job.id },
          data: {
            status: OutboxStatus.completed,
            updatedAt: new Date(),
          },
        });
        succeeded++;
      } catch (err: any) {
        const nextAttempts = job.attempts + 1;
        const isExhausted = nextAttempts >= job.maxAttempts;

        // Exponential backoff: 2^attempts seconds
        const backoffMs = Math.pow(2, nextAttempts) * 1000;
        const nextRun = new Date(Date.now() + backoffMs);

        await prisma.outboxJob.update({
          where: { id: job.id },
          data: {
            status: isExhausted ? OutboxStatus.failed : OutboxStatus.pending,
            attempts: nextAttempts,
            nextRunAt: nextRun,
            lastError: err?.message || String(err),
            updatedAt: new Date(),
          },
        });
        failed++;
      }
    }

    return { processed: jobs.length, succeeded, failed };
  }
}
