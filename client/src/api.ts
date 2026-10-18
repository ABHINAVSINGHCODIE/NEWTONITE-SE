import { WorkItem, ItemListResponse, ActivityEvent, Comment, User, Role } from './types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  latestItem?: WorkItem;

  constructor(message: string, status: number, latestItem?: WorkItem) {
    super(message);
    this.status = status;
    this.latestItem = latestItem;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || 'An unexpected error occurred', res.status, data.latestItem);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password = 'Password123!') {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string; user: User }>(res);
    localStorage.setItem('token', data.token);
    return data;
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    return handleResponse<User[]>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    });
    return handleResponse<{ user: User }>(res);
  },

  logout() {
    localStorage.removeItem('token');
  },

  // Work Items
  async listItems(params: {
    status?: string;
    priority?: string;
    type?: string;
    teamId?: string;
    assigneeId?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ItemListResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) {
        query.set(k, String(v));
      }
    });

    const res = await fetch(`${API_BASE}/items?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<ItemListResponse>(res);
  },

  async getItemById(id: string): Promise<WorkItem> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<WorkItem>(res);
  },

  async createItem(
    data: {
      title: string;
      description: string;
      type: string;
      priority: string;
      teamId: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    },
    idempotencyKey?: string
  ): Promise<WorkItem> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse<WorkItem>(res);
  },

  async updateItem(
    id: string,
    data: {
      version: number;
      title?: string;
      description?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ): Promise<WorkItem> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<WorkItem>(res);
  },

  async claimItem(id: string): Promise<WorkItem> {
    const res = await fetch(`${API_BASE}/items/${id}/claim`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<WorkItem>(res);
  },

  async transitionItem(id: string, targetStatus: string): Promise<WorkItem> {
    const res = await fetch(`${API_BASE}/items/${id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ targetStatus }),
    });
    return handleResponse<WorkItem>(res);
  },

  async getActivity(id: string): Promise<{ activities: ActivityEvent[]; comments: Comment[] }> {
    const res = await fetch(`${API_BASE}/items/${id}/activity`, {
      headers: getAuthHeader(),
    });
    return handleResponse<{ activities: ActivityEvent[]; comments: Comment[] }>(res);
  },

  async addComment(id: string, content: string): Promise<Comment> {
    const res = await fetch(`${API_BASE}/items/${id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ content }),
    });
    return handleResponse<Comment>(res);
  },
};
