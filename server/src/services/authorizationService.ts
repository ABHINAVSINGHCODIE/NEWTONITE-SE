import { Role, ItemStatus } from '@prisma/client';
import { AuthenticatedUser } from '../types';

export type ActionType = 'READ' | 'CREATE' | 'UPDATE' | 'CLAIM' | 'COMMENT' | 'TRANSITION';

export interface AuthorizationContext {
  action: ActionType;
  teamId: string;
  fromStatus?: ItemStatus;
  toStatus?: ItemStatus;
}

export class AuthorizationService {
  /**
   * Retrieves the role of the user within a specific team.
   */
  static getUserTeamRole(user: AuthenticatedUser, teamId: string): Role | null {
    const membership = user.memberships.find((m) => m.teamId === teamId);
    return membership ? membership.role : null;
  }

  /**
   * Central permission check function scoped to the user and team.
   * Returns true if allowed, false if forbidden.
   */
  static can(user: AuthenticatedUser, context: AuthorizationContext): boolean {
    const role = this.getUserTeamRole(user, context.teamId);

    // If user is not part of the team, access is completely denied
    if (!role) {
      return false;
    }

    // Role-specific action matrix
    switch (context.action) {
      case 'READ':
        // Viewer, Member, Lead, Admin can read
        return true;

      case 'CREATE':
      case 'UPDATE':
      case 'CLAIM':
        // Viewer cannot create, update, or claim
        return role === Role.Member || role === Role.Lead || role === Role.Admin;

      case 'COMMENT':
        // All members can comment
        return true;

      case 'TRANSITION':
        // Check if transition requires Lead/Admin approval
        if (context.fromStatus === ItemStatus.Awaiting_Approval && context.toStatus === ItemStatus.Resolved) {
          // Approval step only a Lead or Admin can pass
          return role === Role.Lead || role === Role.Admin;
        }

        // Standard transitions can be done by Member, Lead, Admin
        return role === Role.Member || role === Role.Lead || role === Role.Admin;

      default:
        return false;
    }
  }

  /**
   * Asserts authorization or throws a structured error with status 403.
   */
  static assertAuthorized(user: AuthenticatedUser, context: AuthorizationContext, message?: string): void {
    if (!this.can(user, context)) {
      const error: any = new Error(
        message || `Forbidden: Insufficient permissions for ${context.action} in team ${context.teamId}`
      );
      error.status = 403;
      throw error;
    }
  }
}
