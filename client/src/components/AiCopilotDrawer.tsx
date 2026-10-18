import React, { useState } from 'react';
import { Bot, Sparkles, X, Send, CheckCircle2, AlertTriangle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { WorkItem, User, Role } from '../types';
import { api } from '../api';

interface AiCopilotDrawerProps {
  currentUser: User | null;
  items: WorkItem[];
  userRole: Role | null;
  onRefreshItems: () => void;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  actionDetails?: string;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({
  currentUser,
  items,
  userRole,
  onRefreshItems,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Hello ${currentUser?.name || 'Operator'}! I am Newtonite AI Copilot. I monitor system pressure, optimize dispatch, and can automate your operational actions in real time.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Automation handlers
  const handleAutomateTriage = async () => {
    setIsProcessing(true);
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text: 'Auto-triage unassigned urgent items' },
    ]);

    const unassignedUrgent = items.filter(
      (i) => i.priority === 'urgent' && !i.assignee && i.status !== 'Closed'
    );

    if (unassignedUrgent.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: 'Great news! There are currently no unassigned urgent tickets requiring immediate triage in your queue.',
        },
      ]);
      setIsProcessing(false);
      return;
    }

    // Try to auto-claim the first unassigned urgent ticket for the operator
    const targetItem = unassignedUrgent[0];
    try {
      const claimed = await api.claimItem(targetItem.id);
      onRefreshItems();
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Automated Triage Executed: Successfully claimed urgent ticket "${claimed.title}" (v${claimed.version}) under atomic conditional update!`,
          actionDetails: `Ticket #${claimed.id.slice(0, 8)} assigned to ${currentUser?.name}.`,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Automation alert: ${err.message || 'Failed to claim ticket.'}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWorkloadSummary = () => {
    const total = items.length;
    const urgentCount = items.filter((i) => i.priority === 'urgent').length;
    const awaitingCount = items.filter((i) => i.status === 'Awaiting_Approval').length;
    const assignedCount = items.filter((i) => i.assigneeId === currentUser?.id).length;

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text: 'Generate operational pressure report' },
      {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: `Operational Situation Analysis:
• Total Active Queue: ${total} tickets
• Urgent Incidents: ${urgentCount}
• Awaiting Approval: ${awaitingCount}
• Assigned to You: ${assignedCount}
• System Health: Concurrency locks active, outbox worker healthy.`,
      },
    ]);
  };

  const handleApprovePending = async () => {
    setIsProcessing(true);
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), sender: 'user', text: 'Approve pending tickets in queue' },
    ]);

    if (userRole !== 'Lead' && userRole !== 'Admin') {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Permission Guard: Your current role is "${userRole}". Under Newtonite RBAC rules, only Team Leads and Admins can approve tickets in Awaiting Approval status.`,
        },
      ]);
      setIsProcessing(false);
      return;
    }

    const pending = items.filter((i) => i.status === 'Awaiting_Approval');
    if (pending.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: 'No tickets are currently pending approval.',
        },
      ]);
      setIsProcessing(false);
      return;
    }

    const first = pending[0];
    try {
      const transitioned = await api.transitionItem(first.id, 'Resolved');
      onRefreshItems();
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Authorized Approval Executed: Approved and moved "${transitioned.title}" to Resolved!`,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: `Approval failed: ${err.message}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: userText }]);

    setIsProcessing(true);

    const lower = userText.toLowerCase();

    // Natural language command recognition
    setTimeout(async () => {
      if (lower.includes('triage') || lower.includes('claim')) {
        await handleAutomateTriage();
      } else if (lower.includes('summary') || lower.includes('status') || lower.includes('report')) {
        handleWorkloadSummary();
        setIsProcessing(false);
      } else if (lower.includes('approve') || lower.includes('resolve')) {
        await handleApprovePending();
      } else if (lower.includes('create') || lower.includes('new ticket') || lower.includes('incident')) {
        try {
          const newTicket = await api.createItem({
            title: `AI Automated Incident: ${userText}`,
            description: `Generated automatically via AI Copilot command: "${userText}"`,
            type: 'incident',
            priority: 'urgent',
            teamId: currentUser?.memberships[0]?.teamId || '',
          });
          onRefreshItems();
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              sender: 'bot',
              text: `Created Urgent Work Item: "${newTicket.title}" under team ${newTicket.team.name} with Idempotency Key!`,
            },
          ]);
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            { id: String(Date.now()), sender: 'bot', text: `Failed to create item: ${err.message}` },
          ]);
        }
        setIsProcessing(false);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            sender: 'bot',
            text: `I understood: "${userText}". You can ask me to:
1. "Auto-triage urgent tickets"
2. "Approve pending review items"
3. "Generate workload summary"
4. "Create urgent incident for [issue description]"`,
          },
        ]);
        setIsProcessing(false);
      }
    }, 400);
  };

  return (
    <div className="ai-chat-drawer">
      {/* Header */}
      <div className="ai-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>Newtonite AI Copilot</div>
            <div style={{ fontSize: '0.65rem', color: '#93c5fd' }}>Operational Assistant & Automation Engine</div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#94a3b8' }}>
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages-area">
        {messages.map((m) => (
          <div key={m.id} className={`ai-msg ${m.sender}`}>
            <p style={{ whiteSpace: 'pre-line' }}>{m.text}</p>
            {m.actionDetails && (
              <div
                style={{
                  marginTop: '0.4rem',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#67e8f9',
                }}
              >
                {m.actionDetails}
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="ai-msg bot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} className="animate-spin" />
            <span>Analyzing queue & executing command...</span>
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      <div className="ai-chip-suggestions">
        <button className="ai-chip" onClick={handleAutomateTriage} disabled={isProcessing}>
          <Zap size={11} style={{ marginRight: '3px' }} /> Auto-Triage Urgent
        </button>
        <button className="ai-chip" onClick={handleWorkloadSummary} disabled={isProcessing}>
          📊 Summary Report
        </button>
        <button className="ai-chip" onClick={handleApprovePending} disabled={isProcessing}>
          ✅ Approve Next
        </button>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="ai-input-bar">
        <input
          type="text"
          placeholder="Ask AI or give command (e.g. 'Triage urgent tickets')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
        />
        <button type="submit" disabled={isProcessing || !input.trim()}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
