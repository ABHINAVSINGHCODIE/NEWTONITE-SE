import React, { useState, useEffect } from 'react';
import {
  Zap,
  Bot,
  GitBranch,
  Lock,
  Database,
  Bell,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  ChevronRight,
  Code,
  Activity,
  Layers,
  Check,
  Radio,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCode,
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  category: 'trigger' | 'agent' | 'router' | 'concurrency' | 'database' | 'action';
  x: number;
  y: number;
  icon: any;
  color: string;
  badge: string;
  status: 'idle' | 'running' | 'success' | 'error';
  executionTime?: string;
  outputSummary: string;
  payload: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export const WorkflowCanvasView: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [liveAutoRun, setLiveAutoRun] = useState(true);
  const [executionCount, setExecutionCount] = useState(152);
  const [zoom, setZoom] = useState(0.95);

  const NODE_WIDTH = 190;
  const NODE_HEIGHT = 86;

  // Nodes positioned neatly to fit within 1100px canvas
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'webhook-trigger',
      name: 'Incident Webhook',
      type: 'Webhook Trigger',
      category: 'trigger',
      x: 30,
      y: 160,
      icon: Zap,
      color: '#ff5630',
      badge: 'POST /api/items',
      status: 'success',
      executionTime: '8ms',
      outputSummary: 'Payload received & Idempotency Key verified',
      payload: {
        event: 'incident.reported',
        idempotencyKey: 'idemp-9a84f3-2026',
        source: 'monitoring-sentinel',
        priority: 'urgent',
        title: 'High latency spike on payments-vault cluster',
      },
    },
    {
      id: 'ai-agent',
      name: 'Newtonite AI Agent',
      type: 'Autonomous Copilot',
      category: 'agent',
      x: 250,
      y: 160,
      icon: Bot,
      color: '#6554c0',
      badge: 'Gemini Ops 2.0',
      status: 'success',
      executionTime: '42ms',
      outputSummary: 'Natural language triage & auto-tagging complete',
      payload: {
        classifiedSeverity: 'CRITICAL_P0',
        suggestedTeam: 'Payments & Billing',
        riskScore: 0.94,
        requiresLeadApproval: true,
        actionDraft: 'Trigger automated circuit breaker and notify On-Call Lead',
      },
    },
    {
      id: 'priority-switch',
      name: 'Priority Switch',
      type: 'Conditional Router',
      category: 'router',
      x: 470,
      y: 160,
      icon: GitBranch,
      color: '#0052cc',
      badge: 'Urgent vs Normal',
      status: 'success',
      executionTime: '2ms',
      outputSummary: 'Routed to urgent concurrency path',
      payload: {
        conditionEvaluated: 'priority === urgent',
        result: true,
        selectedBranch: 'urgent_incident_flow',
      },
    },
    {
      id: 'occ-validator',
      name: 'OCC & Claim Guard',
      type: 'Concurrency Lock',
      category: 'concurrency',
      x: 690,
      y: 50,
      icon: Lock,
      color: '#00875a',
      badge: 'Atomic Claim (409)',
      status: 'success',
      executionTime: '12ms',
      outputSummary: 'Version check passed (v1 -> v2). Lock secured.',
      payload: {
        workItemId: 'item-8f3b-47e1',
        version: 1,
        expectedVersion: 1,
        atomicClaimSuccess: true,
        conflictDetected: false,
      },
    },
    {
      id: 'outbox-engine',
      name: 'Transactional Outbox',
      type: 'PostgreSQL Worker',
      category: 'database',
      x: 690,
      y: 260,
      icon: Database,
      color: '#ff8b00',
      badge: 'Exponential Backoff',
      status: 'success',
      executionTime: '16ms',
      outputSummary: 'Atomic DB commit + dedupKey registered',
      payload: {
        outboxJobId: 'job-5a7e12',
        dedupKey: 'outbox-dedup-179241',
        retryAttempts: 0,
        status: 'PROCESSED',
        publishedToQueue: true,
      },
    },
    {
      id: 'lead-notifier',
      name: 'Lead Gate & Alert',
      type: 'Audit & Escalation',
      category: 'action',
      x: 910,
      y: 160,
      icon: Bell,
      color: '#36b37e',
      badge: 'Approval Gate',
      status: 'success',
      executionTime: '24ms',
      outputSummary: 'Awaiting_Approval gate established + SMS sent',
      payload: {
        notifiedRole: 'Lead',
        targetLead: 'lead.payments@newtonite.internal',
        workflowState: 'Awaiting_Approval',
        auditEventCreated: true,
      },
    },
  ]);

  const edges: WorkflowEdge[] = [
    { id: 'e1', from: 'webhook-trigger', to: 'ai-agent', label: 'POST' },
    { id: 'e2', from: 'ai-agent', to: 'priority-switch', label: 'Triage' },
    { id: 'e3', from: 'priority-switch', to: 'occ-validator', label: 'P0 Urgent' },
    { id: 'e4', from: 'priority-switch', to: 'outbox-engine', label: 'Queue' },
    { id: 'e5', from: 'occ-validator', to: 'lead-notifier', label: 'Locked' },
    { id: 'e6', from: 'outbox-engine', to: 'lead-notifier', label: 'Outbox Event' },
  ];

  // Continuous live running simulation
  useEffect(() => {
    if (!liveAutoRun) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % 6;
        if (next === 5) {
          setExecutionCount((c) => c + 1);
        }
        return next;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [liveAutoRun]);

  const handleManualExecute = () => {
    setActiveStep(0);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step < 6) {
        setActiveStep(step);
      } else {
        clearInterval(timer);
        setExecutionCount((c) => c + 1);
      }
    }, 600);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsInspectorOpen(true);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
        color: '#c9d1d9',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Top Workflow Control Bar */}
      <div
        style={{
          height: '52px',
          background: '#161b22',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #ff5630, #ff8b00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Share2 size={16} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f0f6fc' }}>
                Newtonite Incident & Outbox Orchestration
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  background: liveAutoRun ? '#238636' : '#30363d',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#56d364',
                    display: 'inline-block',
                    animation: liveAutoRun ? 'pulse 1.5s infinite' : 'none',
                  }}
                />
                {liveAutoRun ? 'LIVE STREAMING' : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Zoom controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#21262d',
              borderRadius: '6px',
              border: '1px solid #30363d',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
              title="Zoom Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
              }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '0.7rem', color: '#c9d1d9', padding: '0 0.3rem' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              title="Zoom In"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
              }}
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom(0.95)}
              title="Reset Zoom to Fit"
              style={{
                background: 'transparent',
                border: 'none',
                borderLeft: '1px solid #30363d',
                color: '#8b949e',
                padding: '0.3rem 0.5rem',
                cursor: 'pointer',
              }}
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Toggle Inspector Button */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            style={{
              background: isInspectorOpen ? '#1f6feb22' : '#21262d',
              border: `1px solid ${isInspectorOpen ? '#388bfd' : '#30363d'}`,
              color: isInspectorOpen ? '#58a6ff' : '#8b949e',
              padding: '0.32rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FileCode size={13} />
            {isInspectorOpen ? 'Hide Payload' : 'Inspect Node'}
          </button>

          {/* Live Stream Toggle */}
          <button
            onClick={() => setLiveAutoRun(!liveAutoRun)}
            style={{
              background: liveAutoRun ? '#1f6feb22' : '#21262d',
              border: `1px solid ${liveAutoRun ? '#388bfd' : '#30363d'}`,
              color: liveAutoRun ? '#58a6ff' : '#8b949e',
              padding: '0.32rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Radio size={13} style={{ color: liveAutoRun ? '#58a6ff' : '#8b949e' }} />
            {liveAutoRun ? 'Live: On' : 'Live: Off'}
          </button>

          {/* Test Manual Execution */}
          <button
            onClick={handleManualExecute}
            style={{
              background: '#238636',
              border: '1px solid #2ea043',
              color: '#ffffff',
              padding: '0.32rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Play size={13} fill="#ffffff" /> Run Test
          </button>

          <span style={{ fontSize: '0.72rem', color: '#8b949e' }}>
            Run #{executionCount}
          </span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            background: '#0d1117',
            backgroundImage: 'radial-gradient(#21262d 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            padding: '2rem',
          }}
        >
          {/* Scalable Container */}
          <div
            style={{
              position: 'relative',
              width: '1150px',
              height: '420px',
              transformOrigin: 'top left',
              transform: `scale(${zoom})`,
              transition: 'transform 0.15s ease',
            }}
          >
            {/* SVG Connecting Wires */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1150px',
                height: '420px',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <defs>
                <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#58a6ff" />
                  <stop offset="100%" stopColor="#388bfd" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {edges.map((edge, index) => {
                const fromNode = nodes.find((n) => n.id === edge.from)!;
                const toNode = nodes.find((n) => n.id === edge.to)!;

                const x1 = fromNode.x + NODE_WIDTH;
                const y1 = fromNode.y + NODE_HEIGHT / 2;
                const x2 = toNode.x;
                const y2 = toNode.y + NODE_HEIGHT / 2;

                const dx = (x2 - x1) * 0.5;
                const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                const isEdgeActive = activeStep === index || activeStep === index + 1;

                return (
                  <g key={edge.id}>
                    {/* Background Wire */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#30363d"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Active Pulsing Beam */}
                    {isEdgeActive && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="url(#activeGrad)"
                        strokeWidth="3.5"
                        strokeDasharray="8 6"
                        strokeDashoffset={-activeStep * 8}
                        filter="url(#glow)"
                        style={{
                          animation: 'dash 1s linear infinite',
                        }}
                      />
                    )}

                    {/* Edge Label Badge */}
                    {edge.label && (
                      <g transform={`translate(${(x1 + x2) / 2 - 30}, ${(y1 + y2) / 2 - 9})`}>
                        <rect
                          width="60"
                          height="18"
                          rx="9"
                          fill="#161b22"
                          stroke="#30363d"
                          strokeWidth="1"
                        />
                        <text
                          x="30"
                          y="12"
                          fill="#8b949e"
                          fontSize="9"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, idx) => {
              const isNodeActive = activeStep === idx;
              const isSelected = selectedNodeId === node.id;
              const NodeIcon = node.icon;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${NODE_WIDTH}px`,
                    background: isSelected ? '#1c2128' : '#161b22',
                    border: `2px solid ${
                      isNodeActive
                        ? '#58a6ff'
                        : isSelected
                        ? '#388bfd'
                        : '#30363d'
                    }`,
                    borderRadius: '10px',
                    boxShadow: isNodeActive
                      ? '0 0 16px rgba(88,166,255,0.4), 0 4px 12px rgba(0,0,0,0.5)'
                      : '0 4px 10px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 15 : 10,
                    transition: 'all 0.2s ease',
                    transform: isNodeActive ? 'scale(1.03)' : 'scale(1)',
                  }}
                  title="Click to view live execution payload"
                >
                  {/* Left Connector Handle */}
                  {node.category !== 'trigger' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-6px',
                        top: '36px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#161b22',
                        border: '2px solid #58a6ff',
                      }}
                    />
                  )}

                  {/* Right Connector Handle */}
                  {node.category !== 'action' && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: '36px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#161b22',
                        border: '2px solid #58a6ff',
                      }}
                    />
                  )}

                  {/* Content */}
                  <div style={{ padding: '0.7rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: `${node.color}25`,
                          border: `1px solid ${node.color}50`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: node.color,
                          flexShrink: 0,
                        }}
                      >
                        <NodeIcon size={17} />
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#f0f6fc',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {node.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.65rem',
                            color: '#8b949e',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {node.type}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.4rem',
                        borderTop: '1px solid #21262d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.65rem',
                      }}
                    >
                      <span
                        style={{
                          background: isNodeActive ? '#1f6feb33' : '#21262d',
                          color: isNodeActive ? '#58a6ff' : '#8b949e',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        {node.badge}
                      </span>

                      <span style={{ color: '#3fb950', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle2 size={9} /> {node.executionTime}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Right Inspector Drawer */}
        {isInspectorOpen && (
          <div
            style={{
              width: '320px',
              background: '#161b22',
              borderLeft: '1px solid #30363d',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 30,
              boxShadow: '-4px 0 16px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header with Close X */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderBottom: '1px solid #30363d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0f6fc' }}>
                  {selectedNode.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>{selectedNode.type}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: '#238636',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '8px',
                  }}
                >
                  {selectedNode.executionTime}
                </span>

                <button
                  onClick={() => setIsInspectorOpen(false)}
                  title="Close Inspector (Full Canvas)"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Execution Summary
                </div>
                <div style={{ fontSize: '0.78rem', color: '#c9d1d9', background: '#0d1117', padding: '0.6rem', borderRadius: '6px', border: '1px solid #30363d' }}>
                  {selectedNode.outputSummary}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Output Payload</span>
                  <span style={{ fontSize: '0.65rem', color: '#58a6ff' }}>JSON</span>
                </div>
                <pre
                  style={{
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '0.65rem',
                    fontSize: '0.7rem',
                    fontFamily: 'monospace',
                    color: '#79c0ff',
                    overflowX: 'auto',
                    lineHeight: '1.4',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedNode.payload, null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Invariants Guarded
                </div>
                <ul style={{ fontSize: '0.72rem', color: '#8b949e', paddingLeft: '1.2rem', margin: 0, lineHeight: '1.6' }}>
                  <li>Idempotency header uniqueness validated</li>
                  <li>Atomic UPDATE claim condition: assignee IS NULL</li>
                  <li>OCC Version check: version = version + 1</li>
                  <li>PostgreSQL Outbox event written in same TX</li>
                  <li>Lead-only transition enforced for approval</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
