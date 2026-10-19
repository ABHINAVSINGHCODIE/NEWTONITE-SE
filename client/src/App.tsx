import React, { useState, useEffect, useCallback } from 'react';
import { User, WorkItem, ItemListResponse, Role } from './types';
import { api } from './api';
import { JiraBoard } from './components/JiraBoard';
import { ItemTableView } from './components/ItemTableView';
import { RoadmapView } from './components/RoadmapView';
import { BacklogView } from './components/BacklogView';
import { ProjectSettingsView } from './components/ProjectSettingsView';
import { DashboardMetricsView } from './components/DashboardMetricsView';
import { WorkflowCanvasView } from './components/WorkflowCanvasView';
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
  Activity,
  CheckCircle2,
  FolderKanban,
  Check,
  Share2,
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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Views
  const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'urgent' | 'approval' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'roadmap' | 'backlog' | 'settings' | 'dashboard' | 'workflow'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Top nav menus
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(false);
  const [isFiltersMenuOpen, setIsFiltersMenuOpen] = useState(false);

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
        } else if (quickFilter === 'resolved') {
          effectiveStatus = 'Resolved';
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
      setSuccessToast(`Switched user context to ${authData.user.name}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setErrorToast('Failed to switch user account');
    }
  };

  const handleInlineClaim = async (item: WorkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.claimItem(item.id);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSuccessToast(`Claimed ticket OPS-${item.id.slice(0, 4).toUpperCase()}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to claim ticket');
    }
  };

  const handleStatusChange = async (item: WorkItem, newStatus: string) => {
    try {
      const updated = await api.transitionItem(item.id, newStatus);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selectedItem?.id === item.id) {
        setSelectedItem(updated);
      }
      setSuccessToast(`Transitioned OPS-${item.id.slice(0, 4).toUpperCase()} to ${newStatus.replace('_', ' ')}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setErrorToast(err.message || `Failed to transition item to ${newStatus}`);
    }
  };

  const handleItemUpdated = (updatedItem: WorkItem) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    setSelectedItem(updatedItem);
  };

  const handleItemCreated = (createdItem: WorkItem) => {
    setItems((prev) => [createdItem, ...prev]);
    setTotalCount((c) => c + 1);
    setSuccessToast(`Created new ticket OPS-${createdItem.id.slice(0, 4).toUpperCase()}`);
    setTimeout(() => setSuccessToast(null), 3000);
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

          <div
            className="jira-logo-brand"
            onClick={() => {
              setViewMode('board');
              setQuickFilter('all');
            }}
            title="Newtonite Operations - Home"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.53 2c0 5.26-4.27 9.53-9.53 9.53a9.53 9.53 0 0 1 9.53 9.53c0-5.26 4.27-9.53 9.53-9.53a9.53 9.53 0 0 1-9.53-9.53z"
                fill="#0052CC"
              />
            </svg>
            <span>Jira</span>
          </div>

          <nav className="jira-nav-links" style={{ position: 'relative' }}>
            {/* Your Work */}
            <button
              className={`jira-nav-link ${quickFilter === 'mine' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('board');
                setQuickFilter('mine');
              }}
              title="Show issues assigned to me"
            >
              Your work
            </button>

            {/* Projects Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className={`jira-nav-link ${viewMode === 'board' && quickFilter !== 'mine' ? 'active' : ''}`}
                onClick={() => {
                  setIsProjectsMenuOpen(!isProjectsMenuOpen);
                  setIsFiltersMenuOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                Projects <ChevronDown size={12} />
              </button>

              {isProjectsMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: '#ffffff',
                    border: '1px solid #dfe1e6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
                    width: '260px',
                    zIndex: 1000,
                    padding: '0.4rem 0',
                  }}
                >
                  <div
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#7a869a',
                      textTransform: 'uppercase',
                    }}
                  >
                    Select Active Scope
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTeamId('');
                      setIsProjectsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.8rem',
                      fontSize: '0.8rem',
                      background: selectedTeamId === '' ? '#deebff' : 'transparent',
                      color: selectedTeamId === '' ? '#0052cc' : '#172b4d',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: selectedTeamId === '' ? 700 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>All Teams (Global Operations)</span>
                    {selectedTeamId === '' && <Check size={14} />}
                  </button>

                  {currentUser?.memberships.map((m) => (
                    <button
                      key={m.teamId}
                      onClick={() => {
                        setSelectedTeamId(m.teamId);
                        setIsProjectsMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.8rem',
                        fontSize: '0.8rem',
                        background: selectedTeamId === m.teamId ? '#deebff' : 'transparent',
                        color: selectedTeamId === m.teamId ? '#0052cc' : '#172b4d',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: selectedTeamId === m.teamId ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {m.teamName} ({m.role})
                      </span>
                      {selectedTeamId === m.teamId && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filters Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="jira-nav-link"
                onClick={() => {
                  setIsFiltersMenuOpen(!isFiltersMenuOpen);
                  setIsProjectsMenuOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                Filters <ChevronDown size={12} />
              </button>

              {isFiltersMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: '#ffffff',
                    border: '1px solid #dfe1e6',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
                    width: '240px',
                    zIndex: 1000,
                    padding: '0.4rem 0',
                  }}
                >
                  <div
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#7a869a',
                      textTransform: 'uppercase',
                    }}
                  >
                    Preset Filters
                  </div>

                  {[
                    { key: 'all', label: 'All Issues' },
                    { key: 'mine', label: 'Only My Assigned Issues' },
                    { key: 'urgent', label: '🚨 Urgent Incidents' },
                    { key: 'approval', label: '⏳ Awaiting Lead Approval' },
                    { key: 'resolved', label: '✅ Resolved & Closed' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setQuickFilter(f.key as any);
                        setIsFiltersMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.8rem',
                        fontSize: '0.8rem',
                        background: quickFilter === f.key ? '#deebff' : 'transparent',
                        color: quickFilter === f.key ? '#0052cc' : '#172b4d',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: quickFilter === f.key ? 700 : 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{f.label}</span>
                      {quickFilter === f.key && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dashboards */}
            <button
              className={`jira-nav-link ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
              title="Open Live Operations & SLA Dashboard"
            >
              Dashboards
            </button>

            {/* Workflows */}
            <button
              className={`jira-nav-link ${viewMode === 'workflow' ? 'active' : ''}`}
              onClick={() => setViewMode('workflow')}
              title="Open n8n Incident & Outbox Workflow Graph"
            >
              Workflows
            </button>

            {/* People & Roles */}
            <button
              className="jira-nav-link"
              onClick={() => setIsAddMemberOpen(true)}
              style={{ color: '#0052cc', fontWeight: 700 }}
              title="Add a new member to operations"
            >
              <UserPlus size={14} style={{ marginRight: '4px' }} />
              People & Roles
            </button>

            {/* Apps / Copilot */}
            <button
              className="jira-nav-link"
              onClick={() => setIsAiDrawerOpen(true)}
              title="Open Newtonite AI Assistant"
            >
              Apps
            </button>
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

            <button
              className={`jira-sidebar-item ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setViewMode('dashboard')}
            >
              <Activity size={16} />
              <span>Operations Dashboard</span>
            </button>

            <button
              className={`jira-sidebar-item ${viewMode === 'workflow' ? 'active' : ''}`}
              onClick={() => setViewMode('workflow')}
            >
              <Share2 size={16} style={{ color: '#ff5630' }} />
              <span>Workflow Engine (n8n)</span>
              <span
                style={{
                  marginLeft: 'auto',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#36b37e',
                  boxShadow: '0 0 6px #36b37e',
                }}
              />
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
          {/* Success & Error Toasts */}
          {successToast && (
            <div
              style={{
                background: '#e3fcef',
                borderBottom: '1px solid #57d9a3',
                color: '#006644',
                padding: '0.5rem 1.5rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={15} /> {successToast}
            </div>
          )}

          {errorToast && (
            <div
              style={{
                background: '#ffebe6',
                borderBottom: '1px solid #ff8f73',
                color: '#de350b',
                padding: '0.5rem 1.5rem',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {errorToast}
            </div>
          )}

          {/* Board Title & Filters Header */}
          {viewMode !== 'roadmap' && viewMode !== 'dashboard' && viewMode !== 'workflow' && (
            <div className="jira-board-header">
              <div className="jira-title-row">
                <h1 className="jira-page-title">
                  {viewMode === 'backlog'
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
                <button
                  className={`filter-pill ${quickFilter === 'resolved' ? 'active' : ''}`}
                  onClick={() => setQuickFilter('resolved')}
                >
                  ✅ Resolved
                </button>
              </div>
            </div>
          )}

          {/* Canvas: Board vs Roadmap vs Backlog vs Dashboard vs Settings vs List */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#5e6c84' }}>
                Loading operations stream...
              </div>
            ) : viewMode === 'board' ? (
              <JiraBoard
                items={items}
                userRole={currentRole}
                onSelect={setSelectedItem}
                onClaim={handleInlineClaim}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === 'roadmap' ? (
              <RoadmapView
                items={items}
                userRole={currentRole}
                onSelect={setSelectedItem}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === 'backlog' ? (
              <BacklogView
                items={items}
                userRole={currentRole}
                onSelect={setSelectedItem}
                onOpenNewModal={() => setIsNewModalOpen(true)}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === 'dashboard' ? (
              <DashboardMetricsView
                items={items}
                currentUser={currentUser}
                onRefresh={() => fetchItems()}
              />
            ) : viewMode === 'workflow' ? (
              <WorkflowCanvasView />
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
          {viewMode !== 'roadmap' && viewMode !== 'dashboard' && viewMode !== 'workflow' && (
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
          )}
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
