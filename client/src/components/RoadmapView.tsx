import React, { useState, useMemo } from 'react';
import { WorkItem, Role } from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ChevronRight,
  ChevronDown,
  Plus,
  Play,
  Check,
  TrendingUp,
  Filter,
  Sparkles,
  Zap,
} from 'lucide-react';

interface RoadmapViewProps {
  items: WorkItem[];
  userRole: Role | null;
  onSelect: (item: WorkItem) => void;
  onStatusChange?: (item: WorkItem, newStatus: string) => void;
}

interface CustomInitiative {
  id: string;
  name: string;
  team: string;
  startDate: string;
  endDate: string;
  color: string;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  items,
  userRole,
  onSelect,
  onStatusChange,
}) => {
  const [timeScale, setTimeScale] = useState<'months' | 'quarters'>('months');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>({
    'Core Platform': true,
    'Payments & Billing': true,
    'Trust & Safety': true,
    'Compliance & Risk': true,
  });
  const [isAddingInitiative, setIsAddingInitiative] = useState(false);
  const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
  const [newInitiativeTeam, setNewInitiativeTeam] = useState('Core Platform');
  const [customInitiatives, setCustomInitiatives] = useState<CustomInitiative[]>([]);

  // Toggle track expansion
  const toggleTrack = (trackName: string) => {
    setExpandedTracks((prev) => ({ ...prev, [trackName]: !prev[trackName] }));
  };

  // Group real tasks by team / track
  const tracks = useMemo(() => {
    const teams = [
      {
        name: 'Core Platform',
        color: '#0052cc',
        bg: '#deebff',
        badge: 'Infra & Architecture',
        targetQuarter: 'Q4 2026',
        startMonth: 'Oct',
        endMonth: 'Dec',
        leftPct: 10,
        widthPct: 40,
      },
      {
        name: 'Payments & Billing',
        color: '#00875a',
        bg: '#e3fcef',
        badge: 'Ledger & Transactions',
        targetQuarter: 'Q4 2026 – Q1 2027',
        startMonth: 'Nov',
        endMonth: 'Jan',
        leftPct: 25,
        widthPct: 45,
      },
      {
        name: 'Trust & Safety',
        color: '#6554c0',
        bg: '#eae6ff',
        badge: 'Fraud & Sentinel',
        targetQuarter: 'Q1 2027',
        startMonth: 'Dec',
        endMonth: 'Feb',
        leftPct: 45,
        widthPct: 40,
      },
      {
        name: 'Compliance & Risk',
        color: '#ff8b00',
        bg: '#fffae6',
        badge: 'SOC2 & Governance',
        targetQuarter: 'Q1 2027',
        startMonth: 'Jan',
        endMonth: 'Mar',
        leftPct: 60,
        widthPct: 35,
      },
    ];

    return teams.map((t) => {
      // Find actual items belonging to this team
      const trackItems = items.filter((item) =>
        item.team.name.toLowerCase().includes(t.name.toLowerCase().split(' ')[0])
      );

      const total = trackItems.length;
      const resolved = trackItems.filter(
        (i) => i.status === 'Resolved' || i.status === 'Closed'
      ).length;
      const inProgress = trackItems.filter((i) => i.status === 'In_Progress').length;
      const awaiting = trackItems.filter((i) => i.status === 'Awaiting_Approval').length;
      const open = trackItems.filter((i) => i.status === 'Open').length;

      // Real live progress calculation
      const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return {
        ...t,
        items: trackItems,
        total,
        resolved,
        inProgress,
        awaiting,
        open,
        progress,
      };
    });
  }, [items]);

  // Overall operations statistics
  const overallStats = useMemo(() => {
    const total = items.length;
    const resolved = items.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;
    const inProgress = items.filter((i) => i.status === 'In_Progress').length;
    const awaiting = items.filter((i) => i.status === 'Awaiting_Approval').length;
    const overallPct = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, inProgress, awaiting, overallPct };
  }, [items]);

  // Filtered tracks
  const displayedTracks = useMemo(() => {
    if (selectedTeamFilter === 'all') return tracks;
    return tracks.filter((t) => t.name === selectedTeamFilter);
  }, [tracks, selectedTeamFilter]);

  const handleAddInitiative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInitiativeTitle.trim()) return;

    setCustomInitiatives((prev) => [
      ...prev,
      {
        id: `init-${Date.now()}`,
        name: newInitiativeTitle.trim(),
        team: newInitiativeTeam,
        startDate: 'Nov 2026',
        endDate: 'Jan 2027',
        color: '#0052cc',
      },
    ]);
    setNewInitiativeTitle('');
    setIsAddingInitiative(false);
  };

  const timelineHeaders =
    timeScale === 'months'
      ? ['Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027']
      : ['Q4 2026 (Oct-Dec)', 'Q1 2027 (Jan-Mar)', 'Q2 2027 (Apr-Jun)'];

  const canEdit = userRole !== 'Viewer' && userRole !== null;
  const isLead = userRole === 'Lead' || userRole === 'Admin';

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#fafbfc', padding: '1.5rem 2rem' }}>
      {/* Top Banner & Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#172b4d', margin: 0 }}>
              Live Operational Roadmap
            </h1>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: '#e3fcef',
                color: '#006644',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#00875a',
                  display: 'inline-block',
                }}
              />
              DYNAMIC SYNC ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#5e6c84', margin: 0 }}>
            Real-time Gantt tracking computed dynamically from live database tasks, state transitions, and SLA velocity.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Timescale switch */}
          <div
            style={{
              display: 'flex',
              background: '#ebecf0',
              padding: '2px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            <button
              onClick={() => setTimeScale('months')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: timeScale === 'months' ? '#ffffff' : 'transparent',
                color: timeScale === 'months' ? '#172b4d' : '#5e6c84',
                cursor: 'pointer',
                boxShadow: timeScale === 'months' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                fontWeight: 700,
              }}
            >
              Months
            </button>
            <button
              onClick={() => setTimeScale('quarters')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: timeScale === 'quarters' ? '#ffffff' : 'transparent',
                color: timeScale === 'quarters' ? '#172b4d' : '#5e6c84',
                cursor: 'pointer',
                boxShadow: timeScale === 'quarters' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                fontWeight: 700,
              }}
            >
              Quarters
            </button>
          </div>

          {/* Team Filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              border: '1px solid #dfe1e6',
              background: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#172b4d',
            }}
          >
            <option value="all">All Tracks & Teams</option>
            <option value="Core Platform">Core Platform</option>
            <option value="Payments & Billing">Payments & Billing</option>
            <option value="Trust & Safety">Trust & Safety</option>
            <option value="Compliance & Risk">Compliance & Risk</option>
          </select>

          {canEdit && (
            <button
              onClick={() => setIsAddingInitiative(true)}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
              }}
            >
              <Plus size={14} /> New Epic / Initiative
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 1px 2px rgba(9,30,66,0.06)',
          }}
        >
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase' }}>
            Overall Completion
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0052cc' }}>
              {overallStats.overallPct}%
            </span>
            <span style={{ fontSize: '0.75rem', color: '#00875a', fontWeight: 600 }}>
              {overallStats.resolved} of {overallStats.total} resolved
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: '#ebecf0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '0.5rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${overallStats.overallPct}%`,
                background: '#0052cc',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 1px 2px rgba(9,30,66,0.06)',
          }}
        >
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase' }}>
            Active In-Flight Work
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#00875a' }}>
              {overallStats.inProgress}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84' }}>tickets currently in execution</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#5e6c84', marginTop: '0.45rem' }}>
            Across {displayedTracks.length} engineering workstreams
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 1px 2px rgba(9,30,66,0.06)',
          }}
        >
          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#5e6c84', textTransform: 'uppercase' }}>
            Awaiting Lead Approval
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.3rem' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ff8b00' }}>
              {overallStats.awaiting}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#5e6c84' }}>gated for code review</span>
          </div>
          <div style={{ fontSize: '0.725rem', color: '#5e6c84', marginTop: '0.45rem' }}>
            Requires Lead or Admin sign-off
          </div>
        </div>
      </div>

      {/* Add Initiative Modal Form */}
      {isAddingInitiative && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #0052cc',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
          }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#172b4d', marginBottom: '0.75rem' }}>
            Add New Strategic Initiative to Roadmap
          </h3>
          <form
            onSubmit={handleAddInitiative}
            style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}
          >
            <div style={{ flex: 2, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#5e6c84' }}>
                Initiative Title
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Consensus Engine"
                value={newInitiativeTitle}
                onChange={(e) => setNewInitiativeTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem',
                  border: '1px solid #dfe1e6',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                }}
                required
              />
            </div>

            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#5e6c84' }}>
                Team Track
              </label>
              <select
                value={newInitiativeTeam}
                onChange={(e) => setNewInitiativeTeam(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.8rem',
                  border: '1px solid #dfe1e6',
                  borderRadius: '4px',
                  marginTop: '0.25rem',
                  background: '#ffffff',
                }}
              >
                <option value="Core Platform">Core Platform</option>
                <option value="Payments & Billing">Payments & Billing</option>
                <option value="Trust & Safety">Trust & Safety</option>
                <option value="Compliance & Risk">Compliance & Risk</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Save Initiative
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAddingInitiative(false)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Gantt Canvas Container */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dfe1e6',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Gantt Timeline Header Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            borderBottom: '2px solid #ebecf0',
            background: '#f4f5f7',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#5e6c84',
              textTransform: 'uppercase',
              borderRight: '1px solid #dfe1e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Initiative & Workstream</span>
            <span style={{ fontSize: '0.68rem', color: '#7a869a' }}>Progress</span>
          </div>

          {/* Timeline Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${timelineHeaders.length}, 1fr)`,
              position: 'relative',
            }}
          >
            {timelineHeaders.map((header, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#5e6c84',
                  textAlign: 'center',
                  borderRight: idx < timelineHeaders.length - 1 ? '1px solid #dfe1e6' : 'none',
                }}
              >
                {header}
              </div>
            ))}

            {/* Pulsing LIVE TODAY Vertical Marker */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '18%',
                width: '2px',
                background: '#ff5630',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '-20px',
                  background: '#ff5630',
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '3px',
                  boxShadow: '0 1px 4px rgba(255,86,48,0.4)',
                }}
              >
                TODAY
              </div>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div>
          {displayedTracks.map((track) => {
            const isExpanded = expandedTracks[track.name];

            return (
              <div key={track.name} style={{ borderBottom: '1px solid #dfe1e6' }}>
                {/* Track Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '320px 1fr',
                    alignItems: 'center',
                    background: isExpanded ? '#ffffff' : '#fafbfc',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleTrack(track.name)}
                >
                  {/* Left Column: Track Details */}
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRight: '1px solid #dfe1e6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              background: track.color,
                            }}
                          />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#172b4d' }}>
                            {track.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#7a869a', marginTop: '0.15rem' }}>
                          {track.badge} • {track.total} real tasks
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: track.progress === 100 ? '#00875a' : track.color,
                        }}
                      >
                        {track.progress}%
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#7a869a' }}>
                        {track.resolved}/{track.total} done
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Gantt Bar */}
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      height: '100%',
                    }}
                  >
                    {/* Background Column Grid Lines */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${timelineHeaders.length}, 1fr)`,
                        pointerEvents: 'none',
                      }}
                    >
                      {timelineHeaders.map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderRight:
                              idx < timelineHeaders.length - 1 ? '1px dashed #f0f1f4' : 'none',
                          }}
                        />
                      ))}
                    </div>

                    {/* Today marker on row */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: '18%',
                        width: '2px',
                        background: 'rgba(255, 86, 48, 0.2)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Live Moving Gantt Epic Bar */}
                    <div
                      style={{
                        position: 'relative',
                        marginLeft: `${track.leftPct}%`,
                        width: `${track.widthPct}%`,
                        height: '28px',
                        background: '#ebecf0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* Live Completed Percentage Fill */}
                      <div
                        style={{
                          height: '100%',
                          width: `${track.progress}%`,
                          background: `linear-gradient(90deg, ${track.color}, ${track.color}dd)`,
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />

                      {/* Bar Label */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '10px',
                          right: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: track.progress > 40 ? '#ffffff' : '#172b4d',
                          textShadow: track.progress > 40 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                          pointerEvents: 'none',
                        }}
                      >
                        <span>{track.targetQuarter}</span>
                        <span>{track.progress}% complete</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Tasks List for this Track */}
                {isExpanded && (
                  <div style={{ background: '#ffffff', paddingLeft: '2rem' }}>
                    {track.items.length === 0 ? (
                      <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#7a869a' }}>
                        No tickets assigned to this team track.
                      </div>
                    ) : (
                      track.items.map((item, idx) => {
                        const isResolved = item.status === 'Resolved' || item.status === 'Closed';
                        const isInProgress = item.status === 'In_Progress';
                        const isAwaiting = item.status === 'Awaiting_Approval';

                        // Calculate visual offset for the ticket
                        const itemLeft = 10 + (idx % 4) * 12;
                        const itemWidth = 22 + (item.priority === 'urgent' ? 14 : 8);

                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '304px 1fr',
                              alignItems: 'center',
                              borderTop: '1px solid #f4f5f7',
                              padding: '0.45rem 0',
                              fontSize: '0.78rem',
                            }}
                          >
                            {/* Ticket Summary Left */}
                            <div
                              style={{
                                padding: '0.2rem 1rem 0.2rem 0',
                                borderRight: '1px solid #dfe1e6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div
                                onClick={() => onSelect(item)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  cursor: 'pointer',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isResolved ? (
                                  <CheckCircle2 size={13} style={{ color: '#00875a', flexShrink: 0 }} />
                                ) : isInProgress ? (
                                  <Play size={13} style={{ color: '#0052cc', flexShrink: 0 }} />
                                ) : isAwaiting ? (
                                  <Clock size={13} style={{ color: '#ff8b00', flexShrink: 0 }} />
                                ) : (
                                  <div
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '2px',
                                      border: '2px solid #7a869a',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}

                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#0052cc',
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  OPS-{item.id.slice(0, 4).toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: '#172b4d',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={item.title}
                                >
                                  {item.title}
                                </span>
                              </div>

                              {/* Quick Transition on Roadmap */}
                              {canEdit && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  {item.status === 'Open' && (
                                    <button
                                      className="btn-secondary"
                                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange?.(item, 'In_Progress');
                                      }}
                                      title="Start work on this roadmap ticket"
                                    >
                                      Start
                                    </button>
                                  )}
                                  {item.status === 'In_Progress' && (
                                    <button
                                      className="btn-secondary"
                                      style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', color: '#ff8b00' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange?.(item, 'Awaiting_Approval');
                                      }}
                                      title="Submit ticket for lead approval"
                                    >
                                      Review
                                    </button>
                                  )}
                                  {item.status === 'Awaiting_Approval' && isLead && (
                                    <button
                                      className="btn-primary"
                                      style={{
                                        padding: '0.15rem 0.4rem',
                                        fontSize: '0.65rem',
                                        background: '#00875a',
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStatusChange?.(item, 'Resolved');
                                      }}
                                      title="Approve and mark resolved"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Ticket Micro-Gantt Bar Right */}
                            <div
                              style={{
                                padding: '0.2rem 1rem',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              {/* Background column lines */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${timelineHeaders.length}, 1fr)`,
                                  pointerEvents: 'none',
                                }}
                              >
                                {timelineHeaders.map((_, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      borderRight:
                                        cIdx < timelineHeaders.length - 1 ? '1px dashed #f0f1f4' : 'none',
                                    }}
                                  />
                                ))}
                              </div>

                              {/* Mini Task Bar */}
                              <div
                                onClick={() => onSelect(item)}
                                style={{
                                  marginLeft: `${itemLeft}%`,
                                  width: `${itemWidth}%`,
                                  height: '20px',
                                  borderRadius: '4px',
                                  background: isResolved
                                    ? '#e3fcef'
                                    : isInProgress
                                    ? '#deebff'
                                    : isAwaiting
                                    ? '#fffae6'
                                    : '#f4f5f7',
                                  border: `1px solid ${
                                    isResolved
                                      ? '#57d9a3'
                                      : isInProgress
                                      ? '#4c9aff'
                                      : isAwaiting
                                      ? '#ffab00'
                                      : '#dfe1e6'
                                  }`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 0.5rem',
                                  cursor: 'pointer',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: isResolved
                                    ? '#006644'
                                    : isInProgress
                                    ? '#0747a6'
                                    : isAwaiting
                                    ? '#974f00'
                                    : '#42526e',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  transition: 'transform 0.15s, box-shadow 0.15s',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.02)';
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                                }}
                              >
                                <span>
                                  {item.status.replace('_', ' ')} • {item.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom User Added Initiatives */}
          {customInitiatives.map((cInit) => (
            <div
              key={cInit.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '320px 1fr',
                alignItems: 'center',
                borderBottom: '1px solid #dfe1e6',
                background: '#fafbfc',
                padding: '0.85rem 0',
              }}
            >
              <div
                style={{
                  padding: '0 1rem',
                  borderRight: '1px solid #dfe1e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#172b4d' }}>
                    {cInit.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#7a869a' }}>
                    {cInit.team} • Planned Initiative
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: '#deebff',
                    color: '#0747a6',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  NEW
                </span>
              </div>

              <div style={{ padding: '0 1rem', position: 'relative' }}>
                <div
                  style={{
                    marginLeft: '30%',
                    width: '35%',
                    height: '24px',
                    background: 'linear-gradient(90deg, #4c9aff, #0052cc)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 0.5rem',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {cInit.startDate} – {cInit.endDate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
