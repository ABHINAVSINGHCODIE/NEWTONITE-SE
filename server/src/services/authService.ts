import bcrypt from 'bcryptjs';
import prisma from '../db';
import { generateToken } from '../middleware/auth';

export class AuthService {
  /**
   * Login with email and password.
   */
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      const err: any = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const err: any = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships.map((m) => ({
          teamId: m.teamId,
          teamName: m.team.name,
          role: m.role,
        })),
      },
    };
  }

  /**
   * List demo users for quick reviewer switching.
   */
  static async getDemoUsers() {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      memberships: u.memberships.map((m) => ({
        teamId: m.teamId,
        teamName: m.team.name,
        role: m.role,
      })),
    }));
  }
}
