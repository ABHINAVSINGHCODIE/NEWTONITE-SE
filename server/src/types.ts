import { Request } from 'express';
import { Role, ItemStatus, ItemPriority, ItemType } from '@prisma/client';

export interface UserMembership {
  teamId: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  memberships: UserMembership[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ItemQueryFilters {
  status?: ItemStatus;
  priority?: ItemPriority;
  type?: ItemType;
  teamId?: string;
  assigneeId?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  [ItemStatus.Open]: [ItemStatus.In_Progress],
  [ItemStatus.In_Progress]: [ItemStatus.Awaiting_Approval, ItemStatus.Resolved],
  [ItemStatus.Awaiting_Approval]: [ItemStatus.Resolved],
  [ItemStatus.Resolved]: [ItemStatus.Closed, ItemStatus.Open],
  [ItemStatus.Closed]: [ItemStatus.Open],
};

export const APPROVAL_REQUIRED_STATUSES: ItemStatus[] = [ItemStatus.Resolved];
