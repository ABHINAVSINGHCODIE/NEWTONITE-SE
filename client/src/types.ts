export type Role = 'Viewer' | 'Member' | 'Lead' | 'Admin';
export type ItemType = 'incident' | 'customer_issue' | 'payment' | 'compliance' | 'task';
export type ItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItemStatus = 'Open' | 'In_Progress' | 'Awaiting_Approval' | 'Resolved' | 'Closed';

export interface UserMembership {
  teamId: string;
  teamName: string;
  role: Role;
}

export interface User {
  id: string;
  name: string;
  email: string;
  memberships: UserMembership[];
}

export interface Team {
  id: string;
  name: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  priority: ItemPriority;
  status: ItemStatus;
  teamId: string;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  team: Team;
  creator: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string } | null;
  _count?: { comments: number };
}

export interface ActivityEvent {
  id: string;
  workItemId: string;
  actorId: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  metadata: string | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}

export interface Comment {
  id: string;
  workItemId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
}

export interface ItemListResponse {
  items: WorkItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}
