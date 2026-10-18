import { PrismaClient, Role, ItemType, ItemPriority, ItemStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // Clean existing data
  await prisma.outboxJob.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Teams
  console.log('[Seed] Creating 4 teams...');
  const teamsData = [
    { name: 'Core Platform', description: 'Infrastructure, runtime systems, and internal tooling' },
    { name: 'Payments & Billing', description: 'Payment processing, gateways, ledger reconciliations' },
    { name: 'Trust & Safety', description: 'User account security, fraud detection, and policy enforcement' },
    { name: 'Compliance & Risk', description: 'Regulatory audits, KYC adherence, and data privacy' },
  ];

  const teams: Record<string, string> = {};
  for (const t of teamsData) {
    const created = await prisma.team.create({ data: t });
    teams[t.name] = created.id;
  }

  // 2. Create Seed Users
  console.log('[Seed] Creating 11 seed users across roles...');
  const usersData = [
    { name: 'Alice Admin', email: 'admin@newtonite.internal' },
    { name: 'Liam Lead (Platform)', email: 'lead.platform@newtonite.internal' },
    { name: 'Maya Member (Platform)', email: 'member.platform@newtonite.internal' },
    { name: 'Victor Viewer (Platform)', email: 'viewer.platform@newtonite.internal' },
    { name: 'Penny Lead (Payments)', email: 'lead.payments@newtonite.internal' },
    { name: 'Peter Member (Payments)', email: 'member.payments@newtonite.internal' },
    { name: 'Travis Lead (Trust)', email: 'lead.trust@newtonite.internal' },
    { name: 'Tina Member (Trust)', email: 'member.trust@newtonite.internal' },
    { name: 'Chloe Lead (Compliance)', email: 'lead.compliance@newtonite.internal' },
    { name: 'Carlos Member (Compliance)', email: 'member.compliance@newtonite.internal' },
    { name: 'Oscar Outsider', email: 'outsider@newtonite.internal' },
  ];

  const users: Record<string, string> = {};
  for (const u of usersData) {
    const created = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
      },
    });
    users[u.email] = created.id;
  }

  // 3. Create Memberships
  console.log('[Seed] Assigning team memberships and roles...');
  const memberships = [
    // Admin in all teams
    { userEmail: 'admin@newtonite.internal', teamName: 'Core Platform', role: Role.Admin },
    { userEmail: 'admin@newtonite.internal', teamName: 'Payments & Billing', role: Role.Admin },
    { userEmail: 'admin@newtonite.internal', teamName: 'Trust & Safety', role: Role.Admin },
    { userEmail: 'admin@newtonite.internal', teamName: 'Compliance & Risk', role: Role.Admin },

    // Core Platform Team
    { userEmail: 'lead.platform@newtonite.internal', teamName: 'Core Platform', role: Role.Lead },
    { userEmail: 'member.platform@newtonite.internal', teamName: 'Core Platform', role: Role.Member },
    { userEmail: 'viewer.platform@newtonite.internal', teamName: 'Core Platform', role: Role.Viewer },

    // Payments & Billing Team
    { userEmail: 'lead.payments@newtonite.internal', teamName: 'Payments & Billing', role: Role.Lead },
    { userEmail: 'member.payments@newtonite.internal', teamName: 'Payments & Billing', role: Role.Member },

    // Trust & Safety Team
    { userEmail: 'lead.trust@newtonite.internal', teamName: 'Trust & Safety', role: Role.Lead },
    { userEmail: 'member.trust@newtonite.internal', teamName: 'Trust & Safety', role: Role.Member },

    // Compliance & Risk Team
    { userEmail: 'lead.compliance@newtonite.internal', teamName: 'Compliance & Risk', role: Role.Lead },
    { userEmail: 'member.compliance@newtonite.internal', teamName: 'Compliance & Risk', role: Role.Member },
  ];

  for (const m of memberships) {
    await prisma.membership.create({
      data: {
        userId: users[m.userEmail],
        teamId: teams[m.teamName],
        role: m.role,
      },
    });
  }

  // 4. Create ~1,200 Work Items to thoroughly prove pagination and search
  console.log('[Seed] Generating 1,200 realistic work items across teams...');

  const itemTemplates = [
    { type: ItemType.incident, prefix: 'Production Incident: DB connection pool exhaustion in cluster', priority: ItemPriority.urgent },
    { type: ItemType.customer_issue, prefix: 'Customer escalates delay in wire settlement', priority: ItemPriority.high },
    { type: ItemType.payment, prefix: 'Stripe webhook retry failure on subscription renewal', priority: ItemPriority.high },
    { type: ItemType.compliance, prefix: 'Quarterly SOC2 audit evidence collection', priority: ItemPriority.medium },
    { type: ItemType.task, prefix: 'Refactor Redis cache invalidation keys', priority: ItemPriority.low },
    { type: ItemType.incident, prefix: 'High 5xx latency spike on payment checkout gateway', priority: ItemPriority.urgent },
    { type: ItemType.customer_issue, prefix: 'Merchant dispute filed for unauthorized charge', priority: ItemPriority.medium },
    { type: ItemType.payment, prefix: 'Automated settlement ledger reconciliation discrepancy', priority: ItemPriority.urgent },
    { type: ItemType.compliance, prefix: 'Annual GDPR user data retention purging verification', priority: ItemPriority.high },
    { type: ItemType.task, prefix: 'Database index tuning for slow cursor pagination queries', priority: ItemPriority.medium },
  ];

  const statuses = [
    ItemStatus.Open,
    ItemStatus.In_Progress,
    ItemStatus.Awaiting_Approval,
    ItemStatus.Resolved,
    ItemStatus.Closed,
  ];

  const teamKeys = Object.keys(teams);
  const userEmails = Object.keys(users).filter((e) => e !== 'outsider@newtonite.internal');

  const workItemsToInsert: any[] = [];
  const now = Date.now();

  for (let i = 1; i <= 1200; i++) {
    const tmpl = itemTemplates[i % itemTemplates.length];
    const teamName = teamKeys[i % teamKeys.length];
    const teamId = teams[teamName];
    const status = statuses[i % statuses.length];
    const creatorEmail = userEmails[i % userEmails.length];
    const createdById = users[creatorEmail];

    // Assignee (some null to test claimable unassigned items)
    const isUnassigned = i % 4 === 0;
    const assigneeEmail = isUnassigned ? null : userEmails[(i + 1) % userEmails.length];
    const assigneeId = assigneeEmail ? users[assigneeEmail] : null;

    // Distribute timestamps over past 30 days
    const createdAt = new Date(now - (1200 - i) * 3600 * 1000 * 0.5);

    workItemsToInsert.push({
      title: `${tmpl.prefix} #${1000 + i}`,
      description: `Detailed operational log and action items for ticket #${1000 + i}. Requires investigation and adherence to SLA. Team: ${teamName}.`,
      type: tmpl.type,
      priority: tmpl.priority,
      status,
      teamId,
      createdById,
      assigneeId,
      version: 1,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Insert in batches of 200
  const batchSize = 200;
  for (let i = 0; i < workItemsToInsert.length; i += batchSize) {
    const batch = workItemsToInsert.slice(i, i + batchSize);
    await prisma.workItem.createMany({ data: batch });
  }

  console.log(`[Seed] Successfully inserted ${workItemsToInsert.length} work items.`);

  // 5. Create initial activity events for a selection of items
  const sampleItems = await prisma.workItem.findMany({ take: 25 });
  for (const item of sampleItems) {
    await prisma.activityEvent.create({
      data: {
        workItemId: item.id,
        actorId: item.createdById,
        action: 'created',
        toValue: item.status,
        createdAt: item.createdAt,
      },
    });

    if (item.assigneeId) {
      await prisma.activityEvent.create({
        data: {
          workItemId: item.id,
          actorId: item.createdById,
          action: 'assigned',
          fromValue: 'Unassigned',
          toValue: 'Assigned User',
          createdAt: new Date(item.createdAt.getTime() + 60000),
        },
      });
    }

    // Add a comment
    await prisma.comment.create({
      data: {
        workItemId: item.id,
        authorId: item.createdById,
        content: `Initial operational note: ticket escalated according to team SLA policies.`,
        createdAt: new Date(item.createdAt.getTime() + 120000),
      },
    });
  }

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
