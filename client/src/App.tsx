import React, { useState, useEffect, useCallback } from 'react';
import { User, WorkItem, ItemListResponse, Role } from './types';
import { api } from './api';
import { JiraBoard } from './components/JiraBoard';
import { ItemTableView } from './components/ItemTableView';
import { RoadmapView } from './components/RoadmapView';
import { BacklogView } from './components/BacklogView';
import { ProjectSettingsView } from './components/ProjectSettingsView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { NewItemModal } from './components/NewItemModal';
import { AddMemberModal } from './components/AddMemberModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';
import { RoleSwitcherDropdown } from './components/RoleSwitcherDropdown';
import {
  Grid,
  Search,
  Plus,
  Compass,
  Layers,
  Columns,
  ListTodo,
  FileText,
  Users,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserPlus,
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Filters & Views
  const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'urgent' | 'approval'>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'roadmap' | 'backlog' | 'settings'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Modals
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Initialize
  const refreshUsers = async () => {
    try {
      const users = await api.getDemoUsers();
      setDemoUsers(users);
      return users;
    } catch (err) {
      console.error('Failed to load users:', err);
      return [];
    }
  };

  useEffect(() => {
    async function init() {
      const users = await refreshUsers();
      const defaultUser =
        users.find((u) => u.email === 'lead.platform@newtonite.internal') || users[0];
      if (defaultUser) {
        const authData = await api.login(defaultUser.email);
        setCurrentUser(authData.user);
        if (authData.user.memberships.length > 0) {
          setSelectedTeamId(authData.user.memberships[0].teamId);
        }
      }
    }
    init();
  }, []);

  // Fetch Items
  const fetchItems = useCallback(
    async (cursor?: string) => {
      if (!currentUser) return;
      setLoading(true);
      setErrorToast(null);

      try {
        let effectiveAssignee: string | undefined = undefined;
        let effectivePriority: string | undefined = undefined;
        let effectiveStatus: string | undefined = undefined;

        if (quickFilter === 'mine') {
          effectiveAssignee = currentUser.id;
        } else if (quickFilter === 'urgent') {
          effectivePriority = 'urgent';
        } else if (quickFilter === 'approval') {
          effectiveStatus = 'Awaiting_Approval';
        }

        const data: ItemListResponse = await api.listItems({
          status: effectiveStatus,
          priority: effectivePriority,
          teamId: selectedTeamId,
          assigneeId: effectiveAssignee,
          q: searchQuery,
          cursor,
          limit: 30,
        });

        setItems(data.items);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setTotalCount(data.totalCount);
      } catch (err: any) {
        setErrorToast(err.message || 'Failed to fetch items');
      } finally {
        setLoading(false);
      }
    },
    [currentUser, quickFilter, selectedTeamId, searchQuery]
  );

  useEffect(() => {
    setCursorHistory([]);
    fetchItems();
  }, [fetchItems]);

  const handleSwitchUser = async (email: string) => {
    try {
      const authData = await api.login(email);
      setCurrentUser(authData.user);
      if (authData.user.memberships.length > 0) {
        setSelectedTeamId(authData.user.memberships[0].teamId);
      } else {
        setSelectedTeamId('');
      }
    } catch (err: any) {
      setErrorToast('Failed to switch user account');
    }
  };

  const handleInlineClaim = async (item: WorkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.claimItem(item.id);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to claim ticket');
    }
  };

  const handleItemUpdated = (updatedItem: WorkItem) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    setSelectedItem(updatedItem);
  };

  const handleItemCreated = (createdItem: WorkItem) => {
    setItems((prev) => [createdItem, ...prev]);
    setTotalCount((c) => c + 1);
  };

  const currentRole =
    currentUser?.memberships.find((m) => m.teamId === selectedTeamId)?.role ||
    currentUser?.memberships[0]?.role ||
    'Viewer';

  return (
    <div className="jira-app-shell">
      {/* 1. Global Atlassian Top Navigation */}
      <header className="jira-top-navbar">
        <div className="jira-top-left">
          <Grid size={18} style={{ color: '#7a869a', cursor: 'pointer' }} />

          <div className="jira-logo-brand" onClick={() => setQuickFilter('all')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.53 2c0 5.26-4.27 9.53-9.53 9.53a9.53 9.53 0 0 1 9.53 9.53c0-5.26 4.27-9.53 9.53-9.53a9.53 9.53 0 0 1-9.53-9.53z"
                fill="#0052CC"
              />
            </svg>
            <span>Jira</span>
          </div>

          <nav className="jira-nav-links">
            <button className="jira-nav-link">Your work</button>
            <button className="jira-nav-link active">Projects</button>
            <button className="jira-nav-link">Filters</button>
            <button className="jira-nav-link">Dashboards</button>
            <button
              className="jira-nav-link"
              onClick={() => setIsAddMemberOpen(true)}
              style={{ color: '#0052cc', fontWeight: 700 }}
              title="Add a new member to operations"
            >
              <UserPlus size={14} style={{ marginRight: '4px' }} />
              People & Roles
            </button>
            <button className="jira-nav-link">Apps</button>
          </nav>

          <button className="btn-jira-create" onClick={() => setIsNewModalOpen(true)}>
            <Plus size={15} />
            <span>Create</span>
          </button>
        </div>

        <div className="jira-top-right">
          <div className="jira-search-box">
            <Search size={14} style={{ color: '#7a869a' }} />
            <input
              type="text"
              placeholder="Search Jira..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Reviewer Role Switcher */}
          <RoleSwitcherDropdown
            currentUser={currentUser}
            demoUsers={demoUsers}
            onSwitchUser={handleSwitchUser}
            selectedTeamId={selectedTeamId}
          />
        </div>
      </header>

      {/* 2. Workspace Body */}
      <div className="jira-workspace-body">
        {/* Left Jira Project Sidebar */}
        <aside className="jira-sidebar">
          <div className="jira-project-header">
            <div className="project-icon-box">N</div>
            <div>
              <div className="project-title">Newtonite Ops</div>
              <div className="project-type">Operations Under Pressure</div>
            </div>
          </div>

          <nav className="jira-sidebar-nav">
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#7a869a',
                padding: '0.4rem 0.75rem',
              }}
            >
              PLANNING
            </div>

            <button
              className={`jira-sidebar-item ${viewMode === 'roadmap' ? 'active' : ''}`}
              onClick={() => setViewMode('roadmap')}
            >
              <Compass size={16} />
              <span>Roadmap</span>
            </button>
            <button
              className={`jira-sidebar-item ${viewMode === 'backlog' ? 'active' : ''}`}
              onClick={() => setViewMode('backlog')}
            >
              <ListTodo size={16} />
              <span>Backlog</span>
            </button>
            <button
              className={`jira-sidebar-item ${viewMode === 'board' ? 'active' : ''}`}
              onClick={() => setViewMode('board')}
            >
              <Columns size={16} />
              <span>Active sprints (Board)</span>
            </button>

            <div className="sidebar-divider" />

            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#7a869a',
                padding: '0.4rem 0.75rem',
              }}
            >
              TEAM & ROLES
            </div>

            <button
              className="jira-sidebar-item"
              onClick={() => setIsAddMemberOpen(true)}
              style={{ color: '#0052cc' }}
            >
              <UserPlus size={16} />
              <span>+ Add Member</span>
            </button>

            <button
              className={`jira-sidebar-item ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FileText size={16} />
              <span>All Issues List</span>
            </button>

            <button className="jira-sidebar-item" onClick={() => setIsAiDrawerOpen(true)}>
              <Sparkles size={16} style={{ color: '#0052cc' }} />
              <span>Newtonite AI Assistant</span>
            </button>

            <div className="sidebar-divider" />

            <button
              className={`jira-sidebar-item ${viewMode === 'settings' ? 'active' : ''}`}
              onClick={() => setViewMode('settings')}
            >
              <Settings size={16} />
              <span>Project settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Board Content */}
        <main className="jira-main-content">
          {/* Board Title & Filters Header */}
          <div className="jira-board-header">
            <div className="jira-title-row">
              <h1 className="jira-page-title">
                {viewMode === 'roadmap'
                  ? 'Strategic Roadmap'
                  : viewMode === 'backlog'
                  ? 'Backlog & Sprints'
                  : viewMode === 'settings'
                  ? 'Project Settings & Governance'
                  : viewMode === 'list'
                  ? 'All Issues List'
                  : selectedTeamId
                  ? 'Team Board'
                  : 'Operations Board'}
              </h1>

              {/* Team Selector Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84' }}>Team:</span>
                <select
                  className="form-control"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#fafbfc', width: '220px' }}
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">All Teams (Global Scope)</option>
                  {currentUser?.memberships.map((m) => (
                    <option key={m.teamId} value={m.teamId}>
                      {m.teamName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="jira-quick-filters">
              <button
                className={`filter-pill ${quickFilter === 'all' ? 'active' : ''}`}
                onClick={() => setQuickFilter('all')}
              >
                All Issues ({totalCount})
              </button>
              <button
                className={`filter-pill ${quickFilter === 'mine' ? 'active' : ''}`}
                onClick={() => setQuickFilter('mine')}
              >
                Only my issues
              </button>
              <button
                className={`filter-pill ${quickFilter === 'urgent' ? 'active' : ''}`}
                onClick={() => setQuickFilter('urgent')}
              >
                🚨 Urgent Incidents
              </button>
              <button
                className={`filter-pill ${quickFilter === 'approval' ? 'active' : ''}`}
                onClick={() => setQuickFilter('approval')}
              >
                ⏳ Awaiting Approval
              </button>
            </div>
          </div>

          {/* Canvas: Board vs Roadmap vs Backlog vs Settings vs List */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#5e6c84' }}>
                Loading Jira sprint board...
              </div>
            ) : viewMode === 'board' ? (
              <JiraBoard
                items={items}
                userRole={currentRole}
                onSelect={setSelectedItem}
                onClaim={handleInlineClaim}
              />
            ) : viewMode === 'roadmap' ? (
              <RoadmapView items={items} onSelect={setSelectedItem} />
            ) : viewMode === 'backlog' ? (
              <BacklogView
                items={items}
                userRole={currentRole}
                onSelect={setSelectedItem}
                onOpenNewModal={() => setIsNewModalOpen(true)}
              />
            ) : viewMode === 'settings' ? (
              <ProjectSettingsView currentUser={currentUser} />
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 2rem' }}>
                <ItemTableView
                  items={items}
                  userRole={currentRole}
                  onSelect={setSelectedItem}
                  onClaim={handleInlineClaim}
                />
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              height: '42px',
              borderTop: '1px solid #dfe1e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              fontSize: '0.8rem',
              color: '#5e6c84',
              background: '#fafbfc',
            }}
          >
            <button
              className="btn-secondary"
              onClick={() => {
                if (cursorHistory.length > 0) {
                  const newHist = [...cursorHistory];
                  newHist.pop();
                  const prev = newHist[newHist.length - 1];
                  setCursorHistory(newHist);
                  fetchItems(prev);
                }
              }}
              disabled={cursorHistory.length === 0 || loading}
              style={{ padding: '0.2rem 0.6rem' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span>
              Showing {items.length} of {totalCount} issues
            </span>

            <button
              className="btn-secondary"
              onClick={() => {
                if (nextCursor) {
                  setCursorHistory((prev) => [...prev, nextCursor]);
                  fetchItems(nextCursor);
                }
              }}
              disabled={!hasMore || loading}
              style={{ padding: '0.2rem 0.6rem' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </main>
      </div>

      {/* Floating AI Copilot Trigger */}
      {!isAiDrawerOpen && (
        <button className="ai-copilot-trigger" onClick={() => setIsAiDrawerOpen(true)}>
          <Sparkles size={16} />
          <span>Newtonite Copilot</span>
        </button>
      )}

      {/* AI Copilot Drawer */}
      {isAiDrawerOpen && (
        <AiCopilotDrawer
          currentUser={currentUser}
          items={items}
          userRole={currentRole}
          onRefreshItems={() => fetchItems()}
          onClose={() => setIsAiDrawerOpen(false)}
        />
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <AddMemberModal
          currentUser={currentUser}
          onClose={() => setIsAddMemberOpen(false)}
          onMemberAdded={async () => {
            await refreshUsers();
            fetchItems();
          }}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          userRole={currentRole}
          currentUserId={currentUser?.id || ''}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
        />
      )}

      {/* New Item Modal */}
      {isNewModalOpen && (
        <NewItemModal
          currentUser={currentUser}
          onClose={() => setIsNewModalOpen(false)}
          onItemCreated={handleItemCreated}
        />
      )}
    </div>
  );
};
