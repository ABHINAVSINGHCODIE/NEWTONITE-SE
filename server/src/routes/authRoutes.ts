import { Router, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/demo-users', async (_req, res, next) => {
  try {
    const users = await AuthService.getDemoUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

/**
 * POST /auth/members
 * Add a new member to a team with their designated role
 */
authRouter.post('/members', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, email, teamId, role, password } = req.body;

    if (!name || !email || !teamId || !role) {
      res.status(400).json({ error: 'Name, email, teamId, and role are required.' });
      return;
    }

    const validRoles = ['Viewer', 'Member', 'Lead', 'Admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Role check: Only Leads or Admins can add members
    const userRole = req.user?.memberships.find((m) => m.teamId === teamId)?.role;
    const isGlobalAdmin = req.user?.memberships.some((m) => m.role === 'Admin');

    if (!isGlobalAdmin && userRole !== 'Lead' && userRole !== 'Admin') {
      res.status(403).json({ error: 'Only Team Leads or Admins can add new members to this team.' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password || 'Password123!', 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        name,
        email,
        passwordHash,
      },
    });

    const membership = await prisma.membership.upsert({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId,
        },
      },
      update: { role: role as any },
      create: {
        userId: user.id,
        teamId,
        role: role as any,
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: `Successfully added ${name} as ${role} to ${membership.team.name}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        team: membership.team,
      },
    });
  } catch (error) {
    next(error);
  }
});
