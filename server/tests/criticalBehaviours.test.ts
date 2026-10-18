import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/db';
import { OutboxService, deliveredNotifications } from '../src/services/outboxService';
import { ItemStatus, ItemPriority, ItemType, OutboxStatus } from '@prisma/client';

describe('Newtonite Operations Under Pressure — Critical Behaviours Beyond CRUD', () => {
  let adminToken: string;
  let leadPlatformToken: string;
  let memberPlatformToken: string;
  let viewerPlatformToken: string;
  let leadPaymentsToken: string;
  let outsiderToken: string;

  let platformTeamId: string;
  let paymentsTeamId: string;

  beforeAll(async () => {
    // 1. Retrieve Tokens for seeded users
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@newtonite.internal', password: 'Password123!' });
    adminToken = adminRes.body.token;

    const leadPlatformRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lead.platform@newtonite.internal', password: 'Password123!' });
    leadPlatformToken = leadPlatformRes.body.token;

    const memberPlatformRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member.platform@newtonite.internal', password: 'Password123!' });
    memberPlatformToken = memberPlatformRes.body.token;

    const viewerPlatformRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer.platform@newtonite.internal', password: 'Password123!' });
    viewerPlatformToken = viewerPlatformRes.body.token;

    const leadPaymentsRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lead.payments@newtonite.internal', password: 'Password123!' });
    leadPaymentsToken = leadPaymentsRes.body.token;

    const outsiderRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'outsider@newtonite.internal', password: 'Password123!' });
    outsiderToken = outsiderRes.body.token;

    // Retrieve team IDs
    const platformTeam = await prisma.team.findUniqueOrThrow({ where: { name: 'Core Platform' } });
    platformTeamId = platformTeam.id;

    const paymentsTeam = await prisma.team.findUniqueOrThrow({ where: { name: 'Payments & Billing' } });
    paymentsTeamId = paymentsTeam.id;
  });

  /**
   * TEST 1: Two users claim the same item concurrently
   * Brief: "Fire two claims in parallel; exactly one succeeds, other gets 409 Conflict."
   */
  it('Critical Behaviour 1: Concurrent claim race condition — exactly one succeeds', async () => {
    // Create a pristine unassigned work item in Core Platform
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        title: 'Unclaimed Urgent Incident',
        description: 'Test concurrent claiming race condition',
        type: ItemType.incident,
        priority: ItemPriority.urgent,
        teamId: platformTeamId,
      });

    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;
    expect(createRes.body.assigneeId).toBeNull();

    // Fire two claims in parallel simultaneously from two different team members
    const [claim1, claim2] = await Promise.all([
      request(app)
        .post(`/api/items/${itemId}/claim`)
        .set('Authorization', `Bearer ${leadPlatformToken}`),
      request(app)
        .post(`/api/items/${itemId}/claim`)
        .set('Authorization', `Bearer ${memberPlatformToken}`),
    ]);

    const statuses = [claim1.status, claim2.status].sort();
    // Exactly one must succeed (200) and one must be rejected with 409 Conflict
    expect(statuses).toEqual([200, 409]);

    const conflictRes = claim1.status === 409 ? claim1 : claim2;
    expect(conflictRes.body.error).toContain('Conflict');

    // Verify in database that assignee is not corrupted
    const itemInDb = await prisma.workItem.findUnique({ where: { id: itemId } });
    expect(itemInDb?.assigneeId).not.toBeNull();
  });

  /**
   * TEST 2: Editing a stale version (Optimistic Locking)
   * Brief: "Update with an old version is rejected and data is unchanged."
   */
  it('Critical Behaviour 2: Stale edit rejection — version mismatch returns 409 Conflict', async () => {
    // Create an item
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        title: 'Optimistic Locking Baseline Ticket',
        description: 'Original description',
        type: ItemType.task,
        priority: ItemPriority.low,
        teamId: platformTeamId,
      });

    const itemId = createRes.body.id;
    const initialVersion = createRes.body.version; // 1

    // First update: increments version to 2
    const update1 = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        version: initialVersion,
        description: 'First successful update',
      });

    expect(update1.status).toBe(200);
    expect(update1.body.version).toBe(2);
    expect(update1.body.description).toBe('First successful update');

    // Second update: uses the stale version (1 instead of 2)
    const staleUpdate = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({
        version: initialVersion, // Stale version 1!
        description: 'Stale overwrite attempt that should fail',
      });

    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.body.error).toContain('Version conflict');

    // Verify data remains unchanged from update 1
    const finalItem = await prisma.workItem.findUnique({ where: { id: itemId } });
    expect(finalItem?.description).toBe('First successful update');
    expect(finalItem?.version).toBe(2);
  });

  /**
   * TEST 3: Repeated request (Idempotency Key)
   * Brief: "Same key sent twice creates one item, same response."
   */
  it('Critical Behaviour 3: Idempotency Key header — duplicate submission returns cached response', async () => {
    const timestamp = Date.now();
    const idempotencyKey = `idem-test-key-${timestamp}`;

    const payload = {
      title: `Idempotent Submission Work Item ${timestamp}`,
      description: 'Testing double-click prevention via Idempotency-Key',
      type: ItemType.payment,
      priority: ItemPriority.high,
      teamId: platformTeamId,
    };

    // First request with idempotency key
    const res1 = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    const createdId = res1.body.id;

    // Second request with EXACT SAME idempotency key (simulating network retry or double-click)
    const res2 = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.headers['x-idempotent-replay']).toBe('true');
    expect(res2.body.id).toBe(createdId);
    expect(res2.body.title).toBe(res1.body.title);

    // Verify only 1 item was created in the database
    const matchingCount = await prisma.workItem.count({
      where: { title: payload.title },
    });
    expect(matchingCount).toBe(1);
  });

  /**
   * TEST 4: Workflow rules & Role-based approval step
   * Brief: "Invalid jump (Open -> Closed) and non-Lead approval both rejected."
   */
  it('Critical Behaviour 4: Workflow transition validation & Lead-only approval guard', async () => {
    // Create an item in Open status
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        title: 'Workflow Verification Item',
        description: 'Verify strict state transitions and approval',
        type: ItemType.compliance,
        priority: ItemPriority.medium,
        teamId: platformTeamId,
      });

    const itemId = createRes.body.id;

    // Attempt illegal jump: Open -> Closed (Direct jump is forbidden)
    const illegalJumpRes = await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({ targetStatus: ItemStatus.Closed });

    expect(illegalJumpRes.status).toBe(400);
    expect(illegalJumpRes.body.error).toContain("Invalid status transition from 'Open' to 'Closed'");

    // Legal transition: Open -> In_Progress
    const toInProgress = await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({ targetStatus: ItemStatus.In_Progress });

    expect(toInProgress.status).toBe(200);
    expect(toInProgress.body.status).toBe(ItemStatus.In_Progress);

    // Legal transition: In_Progress -> Awaiting_Approval
    const toAwaitingApproval = await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({ targetStatus: ItemStatus.Awaiting_Approval });

    expect(toAwaitingApproval.status).toBe(200);
    expect(toAwaitingApproval.body.status).toBe(ItemStatus.Awaiting_Approval);

    // Non-Lead attempt to approve and resolve: Regular Member tries Awaiting_Approval -> Resolved
    const unauthorizedApproval = await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({ targetStatus: ItemStatus.Resolved });

    expect(unauthorizedApproval.status).toBe(403);
    expect(unauthorizedApproval.body.error).toContain('Team Lead or Admin');

    // Authorized approval: Lead approves Awaiting_Approval -> Resolved
    const authorizedApproval = await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({ targetStatus: ItemStatus.Resolved });

    expect(authorizedApproval.status).toBe(200);
    expect(authorizedApproval.body.status).toBe(ItemStatus.Resolved);
  });

  /**
   * TEST 5: Resource-level Authorization
   * Brief: "User outside the team gets 403/404 on read and write."
   */
  it('Critical Behaviour 5: Scoped team authorization — outsider rejected with 403 on read and write', async () => {
    // Create an item in Core Platform team
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        title: 'Platform Confidential Item',
        description: 'Should not be accessible to Payments or Outsider',
        type: ItemType.incident,
        priority: ItemPriority.high,
        teamId: platformTeamId,
      });

    const itemId = createRes.body.id;

    // 1. Read attempt by user from another team (leadPayments has NO membership in Core Platform)
    const readCrossTeam = await request(app)
      .get(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${leadPaymentsToken}`);

    expect(readCrossTeam.status).toBe(403);

    // 2. Read attempt by user with no team at all (outsider)
    const readOutsider = await request(app)
      .get(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(readOutsider.status).toBe(403);

    // 3. Write/update attempt across teams
    const updateCrossTeam = await request(app)
      .patch(`/api/items/${itemId}`)
      .set('Authorization', `Bearer ${leadPaymentsToken}`)
      .send({ version: 1, title: 'Unauthorized hack' });

    expect(updateCrossTeam.status).toBe(403);

    // 4. Viewer role attempt to claim (Viewer is in team, but read-only role)
    const viewerClaim = await request(app)
      .post(`/api/items/${itemId}/claim`)
      .set('Authorization', `Bearer ${viewerPlatformToken}`);

    expect(viewerClaim.status).toBe(403);
  });

  /**
   * TEST 6: Reliable Async Work (Transactional Outbox)
   * Brief: "Job processed twice produces one notification; failed job retries then marks failed."
   */
  it('Critical Behaviour 6: Transactional Outbox — deduplication and retry with max-attempt failure', async () => {
    // Drain any outbox jobs created during prior test setups
    await OutboxService.processPendingJobs(100);

    const dedupKey = `outbox-dedup-${Date.now()}`;
    const initialNotificationCount = deliveredNotifications.length;

    // Enqueue a job into outbox
    await prisma.$transaction(async (tx) => {
      await OutboxService.enqueueJob(tx, 'test_notification', {
        workItemId: 'simulated-item-id',
        title: 'Test Notification Outbox',
        dedupKey,
      });
    });

    // Process pending jobs once
    const processResult1 = await OutboxService.processPendingJobs(10);
    expect(processResult1.processed).toBeGreaterThanOrEqual(1);

    // Notification was recorded
    expect(deliveredNotifications.length).toBe(initialNotificationCount + 1);

    // Process second time with the exact same payload/dedupKey directly through executeHandler
    await OutboxService.executeHandler('second-run-job-id', {
      workItemId: 'simulated-item-id',
      title: 'Test Notification Outbox',
      dedupKey, // Same dedupKey!
    });

    // Verify duplicate was suppressed; count did NOT increase
    expect(deliveredNotifications.length).toBe(initialNotificationCount + 1);

    // Test retry exhaustion and marking failed
    const failJob = await prisma.outboxJob.create({
      data: {
        jobType: 'simulated_failure',
        payload: JSON.stringify({
          workItemId: 'fail-item',
          title: 'FORCE_FAIL',
        }),
        status: OutboxStatus.pending,
        attempts: 2,
        maxAttempts: 3, // 1 more attempt left before failure
        nextRunAt: new Date(Date.now() - 1000), // Ready to run
      },
    });

    // Process jobs: should trigger the final failed attempt
    await OutboxService.processPendingJobs(10);

    const reloadedFailJob = await prisma.outboxJob.findUnique({ where: { id: failJob.id } });
    expect(reloadedFailJob?.attempts).toBe(3);
    expect(reloadedFailJob?.status).toBe(OutboxStatus.failed);
    expect(reloadedFailJob?.lastError).toContain('Simulated external delivery failure');
  });

  /**
   * TEST 7: Audit trail consistency
   * Brief: "Record every change as an activity event in the same database transaction,
   * so history can never disagree with the item."
   */
  it('Critical Behaviour 7: Audit trail guarantees activity log matches work item transitions', async () => {
    const createRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${leadPlatformToken}`)
      .send({
        title: 'Audit Trail Verification Ticket',
        description: 'Verify activity history',
        type: ItemType.task,
        priority: ItemPriority.low,
        teamId: platformTeamId,
      });

    const itemId = createRes.body.id;

    // Transition to In_Progress
    await request(app)
      .post(`/api/items/${itemId}/transition`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({ targetStatus: ItemStatus.In_Progress });

    // Add a comment
    await request(app)
      .post(`/api/items/${itemId}/comments`)
      .set('Authorization', `Bearer ${memberPlatformToken}`)
      .send({ content: 'Investigation started on this task.' });

    // Fetch activity timeline
    const activityRes = await request(app)
      .get(`/api/items/${itemId}/activity`)
      .set('Authorization', `Bearer ${leadPlatformToken}`);

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.activities.length).toBeGreaterThanOrEqual(2);
    expect(activityRes.body.comments.length).toBe(1);

    const actionTypes = activityRes.body.activities.map((a: any) => a.action);
    expect(actionTypes).toContain('created');
    expect(actionTypes).toContain('status_changed');
    expect(activityRes.body.comments[0].content).toBe('Investigation started on this task.');
  });
});
