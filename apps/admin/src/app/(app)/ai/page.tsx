'use client';

import { useEffect, useState } from 'react';
import { Bot, Plus, X, MessageSquare, Users, Activity, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Settings {
  enabled: boolean;
  welcomeMessage: string;
  suggestedQuestions: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  rateLimitPerMinute: number;
}

interface Conversation {
  _id: string;
  sessionId: string;
  locale: string;
  messageCount: number;
  updatedAt: string;
  user?: { name: string; email: string };
  messages: { role: string; text: string }[];
}

const MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (balanced)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast, cheap, supports temperature)' },
];
// Models that reject the temperature parameter.
const NO_TEMP = new Set(['claude-opus-4-8', 'claude-opus-4-7', 'claude-sonnet-5', 'claude-fable-5']);

export default function AiSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState({ totalConversations: 0, loggedInConversations: 0, recentMessages: 0 });
  const [newQ, setNewQ] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<{ settings: Settings; llmConfigured: boolean }>('/ai/admin/settings')
      .then((d) => {
        setS(d.settings);
        setLlmConfigured(d.llmConfigured);
      })
      .catch(() => {});
    api<{ conversations: Conversation[]; analytics: typeof analytics }>('/ai/admin/conversations')
      .then((d) => {
        setConversations(d.conversations);
        setAnalytics(d.analytics);
      })
      .catch(() => {});
  }, []);

  const patch = (p: Partial<Settings>) => setS((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    await api('/ai/admin/settings', { method: 'PUT', body: JSON.stringify(s) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!s) return <p className="text-slate-400">Loading…</p>;

  const tempDisabled = NO_TEMP.has(s.model);

  return (
    <div>
      <PageHeader title="AI Assistant" />

      {!llmConfigured && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          No <code className="mx-1">ANTHROPIC_API_KEY</code> set — the assistant runs on the built-in rules engine
          (product search, orders, offers, FAQs). Add a key to enable natural-language replies &amp; translation.
        </p>
      )}

      {/* Analytics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={<MessageSquare className="h-5 w-5" />} label="Conversations" value={analytics.totalConversations} />
        <Stat icon={<Users className="h-5 w-5" />} label="From logged-in users" value={analytics.loggedInConversations} />
        <Stat icon={<Activity className="h-5 w-5" />} label="Recent messages" value={analytics.recentMessages} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="card space-y-5 p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Bot className="h-5 w-5 text-brand-600" /> Settings
          </h2>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={s.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
            Enable AI assistant on the storefront
          </label>

          <div>
            <label className="label">Welcome message</label>
            <textarea value={s.welcomeMessage} onChange={(e) => patch({ welcomeMessage: e.target.value })} rows={2} className="input" />
          </div>

          <div>
            <label className="label">Suggested questions</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {s.suggestedQuestions.map((q, i) => (
                <span key={i} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs">
                  {q}
                  <button type="button" onClick={() => patch({ suggestedQuestions: s.suggestedQuestions.filter((_, j) => j !== i) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Add a suggestion…" className="input" />
              <button
                type="button"
                onClick={() => {
                  if (newQ.trim()) {
                    patch({ suggestedQuestions: [...s.suggestedQuestions, newQ.trim()] });
                    setNewQ('');
                  }
                }}
                className="btn-ghost shrink-0"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Model</label>
              <select value={s.model} onChange={(e) => patch({ model: e.target.value })} className="input">
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Max tokens</label>
              <input type="number" min={128} max={4096} value={s.maxTokens} onChange={(e) => patch({ maxTokens: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label">
                Temperature {tempDisabled && <span className="text-amber-600">(ignored for this model)</span>}
              </label>
              <input type="number" step={0.1} min={0} max={1} value={s.temperature} disabled={tempDisabled} onChange={(e) => patch({ temperature: Number(e.target.value) })} className="input disabled:bg-slate-50" />
            </div>
            <div>
              <label className="label">Rate limit (msgs/min per user)</label>
              <input type="number" min={1} max={120} value={s.rateLimitPerMinute} onChange={(e) => patch({ rateLimitPerMinute: Number(e.target.value) })} className="input" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary">Save Settings</button>
            {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
          </div>
        </form>

        {/* Recent conversations */}
        <div className="card h-fit p-5">
          <h2 className="mb-3 font-bold">Recent Conversations</h2>
          <div className="max-h-[520px] space-y-3 overflow-y-auto">
            {conversations.length === 0 && <p className="text-sm text-slate-400">No conversations yet.</p>}
            {conversations.map((c) => (
              <div key={c._id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{c.user?.name || 'Guest'} · {c.locale}</span>
                  <span>{formatDate(c.updatedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {c.messages?.[c.messages.length - 1]?.text || '—'}
                </p>
                <p className="mt-1 text-xs text-slate-400">{c.messageCount} messages</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
