import React from 'react';
import { WorkItem } from '../types';
import { Calendar, CheckCircle2, Clock, AlertTriangle, Layers, ChevronRight } from 'lucide-react';

interface RoadmapViewProps {
  items: WorkItem[];
  onSelect: (item: WorkItem) => void;
}

interface Milestone {
  id: string;
  name: string;
  team: string;
  quarter: string;
  progress: number;
  status: 'In Progress' | 'Completed' | 'Upcoming';
  color: string;
  startDate: string;
  endDate: string;
  deliverables: string[];
}

const MILESTONES: Milestone[] = [
  {
    id: 'm1',
    name: 'Transactional Outbox & Worker Infrastructure',
    team: 'Core Platform',
    quarter: 'Q4 2026',
    progress: 85,
    status: 'In Progress',
    color: '#0052cc',
    startDate: 'Oct 01',
    endDate: 'Nov 15',
    deliverables: ['PostgreSQL outbox table', 'Exponential backoff worker', 'Idempotent deduplication'],
  },
  {
    id: 'm2',
    name: 'Ledger Settlement & Payment Gateway Resiliency',
    team: 'Payments & Billing',
    quarter: 'Q4 2026',
    progress: 60,
    status: 'In Progress',
    color: '#00875a',
    startDate: 'Oct 15',
    endDate: 'Dec 01',
    deliverables: ['Webhook retry idempotency', 'Dispute reconciliation', 'Currency settlement lock'],
  },
  {
    id: 'm3',
    name: 'Real-Time Fraud Prevention & Session Sentinel',
    team: 'Trust & Safety',
    quarter: 'Q1 2027',
    progress: 30,
    status: 'Upcoming',
    color: '#6554c0',
    startDate: 'Dec 01',
    endDate: 'Jan 20',
    deliverables: ['Automated risk scoring', 'Suspicious activity quarantine', 'Device fingerprinting'],
  },
  {
    id: 'm4',
    name: 'Annual SOC2 & GDPR Retention Automated Purge',
    team: 'Compliance & Risk',
    quarter: 'Q1 2027',
    progress: 10,
    status: 'Upcoming',
    color: '#ff8b00',
    startDate: 'Jan 15',
    endDate: 'Feb 28',
    deliverables: ['Data lifecycle purging', 'Cryptographic audit proof', 'Access review reports'],
  },
];

export const RoadmapView: React.FC<RoadmapViewProps> = ({ items, onSelect }) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', background: '#fafbfc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#172b4d', letterSpacing: '-0.02em' }}>
            Operations Strategic Roadmap
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#5e6c84', marginTop: '0.15rem' }}>
            Quarterly engineering initiatives, SLA milestones, and operational delivery timeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84', background: '#ebecf0', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
            Oct 2026 – Mar 2027
          </span>
        </div>
      </div>

      {/* Visual Gantt Timeline Canvas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {MILESTONES.map((m) => {
          const relatedItems = items.filter((i) => i.team.name === m.team).slice(0, 3);

          return (
            <div
              key={m.id}
              style={{
                background: '#ffffff',
                border: '1px solid #dfe1e6',
                borderRadius: '8px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(9, 30, 66, 0.08)',
              }}
            >
              {/* Milestone Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '3px',
                        background: `${m.color}15`,
                        color: m.color,
                      }}
                    >
                      {m.team}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#7a869a', fontWeight: 600 }}>{m.quarter}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#172b4d' }}>{m.name}</h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: m.status === 'Completed' ? '#00875a' : m.status === 'In Progress' ? '#0052cc' : '#5e6c84',
                    }}
                  >
                    {m.status} ({m.progress}%)
                  </span>
                  <div style={{ fontSize: '0.725rem', color: '#7a869a' }}>
                    {m.startDate} – {m.endDate}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '8px',
                  background: '#ebecf0',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${m.progress}%`,
                    background: m.color,
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Deliverable Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {m.deliverables.map((deliv, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.725rem',
                      background: '#f4f5f7',
                      color: '#42526e',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #dfe1e6',
                    }}
                  >
                    ✓ {deliv}
                  </span>
                ))}
              </div>

              {/* Active Linked Work Items in Queue */}
              <div style={{ borderTop: '1px solid #f4f5f7', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5e6c84', marginBottom: '0.5rem' }}>
                  ASSOCIATED ACTIVE TICKETS:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {relatedItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelect(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        background: '#fafbfc',
                        border: '1px solid #ebecf0',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#ebf3ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fafbfc')}
                    >
                      <span style={{ fontWeight: 600, color: '#172b4d' }}>{item.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#0052cc', fontWeight: 700 }}>
                          OPS-{item.id.slice(0, 4).toUpperCase()}
                        </span>
                        <ChevronRight size={14} color="#7a869a" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
