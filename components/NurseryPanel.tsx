import React, { useState, useEffect, useCallback } from 'react';
import { Users, PlusCircle, RefreshCw, CheckCircle, Activity, ToggleLeft } from 'lucide-react';
import type { MansionNode, NodeClearance, NodeStatus } from '../types';

interface NurseryData {
  nodes: Record<string, MansionNode>;
  count: number;
  registration_count: number;
}

const CLEARANCE_COLORS: Record<NodeClearance, string> = {
  operator: 'text-emerald-400 border-emerald-700 bg-emerald-900/30',
  builder: 'text-blue-400 border-blue-700 bg-blue-900/30',
  witness: 'text-purple-300 border-purple-700 bg-purple-900/30',
};

const STATUS_DOT: Record<NodeStatus, string> = {
  active: 'bg-emerald-500',
  dormant: 'bg-amber-400',
  suspended: 'bg-red-500',
};

/** Returns Tailwind color classes based on how long ago last_seen was. */
function getStaleLevel(lastSeen: string): 'fresh' | 'stale' | 'cold' {
  const ageMs = Date.now() - new Date(lastSeen).getTime();
  if (ageMs < 5 * 60 * 1000) return 'fresh';
  if (ageMs < 60 * 60 * 1000) return 'stale';
  return 'cold';
}

const STALE_DOT: Record<'fresh' | 'stale' | 'cold', string> = {
  fresh: 'bg-emerald-400',
  stale: 'bg-amber-400',
  cold: 'bg-red-500',
};

const STALE_TEXT: Record<'fresh' | 'stale' | 'cold', string> = {
  fresh: 'text-emerald-400',
  stale: 'text-amber-400',
  cold: 'text-red-400',
};

export const NurseryPanel: React.FC = () => {
  const [data, setData] = useState<NurseryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formResult, setFormResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    node_id: '',
    role: '',
    clearance: 'witness' as NodeClearance,
    tags: '',
  });

  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/nursery/nodes');
      const d = await res.json();
      setData(d);
    } catch {
      // silent on connection error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 10000);
    return () => clearInterval(interval);
  }, [fetchNodes]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setFormResult(null);
    try {
      const tags = form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/nursery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          node_id: form.node_id || undefined,
          role: form.role,
          clearance: form.clearance,
          tags,
        }),
      });
      const d = await res.json();
      if (res.status === 201) {
        setFormResult({ ok: true, message: `✅ ${d.node.node_id} admitted to Nursery` });
        setForm({ name: '', node_id: '', role: '', clearance: 'witness', tags: '' });
        setShowForm(false);
        await fetchNodes();
      } else {
        setFormResult({ ok: false, message: `❌ ${d.error}` });
      }
    } catch {
      setFormResult({ ok: false, message: '❌ Registration failed — check server connection' });
    } finally {
      setRegistering(false);
    }
  };

  const handleHeartbeat = async (node_id: string) => {
    setPingingId(node_id);
    try {
      await fetch(`/api/nursery/nodes/${encodeURIComponent(node_id)}/heartbeat`, { method: 'PATCH' });
      await fetchNodes();
    } catch {
      // silent on connection error
    } finally {
      setPingingId(null);
    }
  };

  const handleStatusCycle = async (node: MansionNode) => {
    const cycle: NodeStatus[] = ['active', 'dormant', 'suspended'];
    const next = cycle[(cycle.indexOf(node.status) + 1) % cycle.length];
    try {
      await fetch(`/api/nursery/nodes/${encodeURIComponent(node.node_id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      await fetchNodes();
    } catch {
      // silent on connection error
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-purple-300 font-mono">
        <RefreshCw className="animate-spin mr-2" /> Scanning Nursery...
      </div>
    );
  }

  const nodes: MansionNode[] = data ? (Object.values(data.nodes) as MansionNode[]) : [];

  return (
    <div className="flex flex-col space-y-6 font-mono text-sm">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-purple-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-purple-400 flex items-center">
            <Users className="mr-2" /> Nursery — Node Registry
          </h2>
          <p className="text-xs text-purple-400/70 mt-1">
            Phase 5 · {nodes.length} node{nodes.length !== 1 ? 's' : ''} registered
            {data && data.registration_count > 0 && ` · ${data.registration_count} total admissions`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchNodes}
            className="p-2 border border-purple-700 rounded hover:bg-purple-900/40 transition-all text-purple-300"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setShowForm(f => !f); setFormResult(null); }}
            className="flex items-center px-3 py-2 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500 rounded transition-all text-purple-200 text-xs"
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            Admit Node
          </button>
        </div>
      </div>

      {/* ── REGISTRATION FORM ── */}
      {showForm && (
        <form
          onSubmit={handleRegister}
          className="bg-black/40 border border-purple-700 rounded-lg p-5 space-y-4"
        >
          <h3 className="text-purple-300 font-bold text-base">Nursery Admission Form</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-purple-400 text-xs mb-1">Node Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Copilot"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Role *</label>
              <input
                type="text"
                required
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. structured_builder"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Canonical Node ID</label>
              <input
                type="text"
                value={form.node_id}
                onChange={e => setForm(f => ({ ...f, node_id: e.target.value }))}
                placeholder="e.g. node.agent.copilot_cli"
                pattern="node\.(substrate|agent|daemon|human|memory)\.[a-z0-9_]+"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Clearance</label>
              <select
                value={form.clearance}
                onChange={e => setForm(f => ({ ...f, clearance: e.target.value as NodeClearance }))}
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="witness">Witness</option>
                <option value="builder">Builder</option>
                <option value="operator">Operator</option>
              </select>
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. copilot, daytime, structured"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={registering}
              className="flex items-center px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/80 border border-emerald-500 rounded text-emerald-200 text-xs transition-all disabled:opacity-50"
            >
              {registering ? <RefreshCw className="animate-spin mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
              {registering ? 'Admitting...' : 'Admit to Nursery'}
            </button>
            {formResult && (
              <span className={`text-xs ${formResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {formResult.message}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── RESULT BANNER (when form is closed) ── */}
      {formResult && !showForm && (
        <div className={`text-xs px-4 py-2 rounded border ${formResult.ok ? 'text-emerald-400 border-emerald-800 bg-emerald-900/20' : 'text-red-400 border-red-800 bg-red-900/20'}`}>
          {formResult.message}
        </div>
      )}

      {/* ── NODE LIST ── */}
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-purple-500 space-y-3">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No nodes registered yet.</p>
          <p className="text-xs opacity-60">Admit the first node to activate the registry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nodes.map(node => {
            const stale = getStaleLevel(node.last_seen);
            return (
            <div
              key={node.node_id}
              className="bg-black/40 border border-purple-900/60 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${node.status !== 'active' ? STATUS_DOT[node.status] : STALE_DOT[stale]}`} />
                  <span className="text-purple-200 font-bold text-sm">{node.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase ${CLEARANCE_COLORS[node.clearance] ?? 'text-gray-400'}`}>
                  {node.clearance}
                </span>
              </div>
              <p className="text-purple-400 text-xs font-mono">{node.node_id}</p>
              <p className="text-purple-300/80 text-xs">Role: {node.role}</p>
              {node.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {node.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-purple-900/40 border border-purple-800 rounded text-purple-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="border-t border-purple-900/40 pt-2 mt-1 space-y-1">
                <p className="text-purple-500 text-xs">Admitted: {formatDate(node.registered_at)}</p>
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${STALE_TEXT[stale]}`}>Last seen: {formatDate(node.last_seen)}</p>
                  <button
                    onClick={() => handleHeartbeat(node.node_id)}
                    disabled={pingingId === node.node_id}
                    className="flex items-center px-2 py-1 bg-purple-900/30 hover:bg-purple-800/60 border border-purple-700 rounded text-purple-300 text-xs transition-all disabled:opacity-50"
                    title="Send heartbeat"
                  >
                    {pingingId === node.node_id
                      ? <RefreshCw className="animate-spin h-3 w-3" />
                      : <Activity className="h-3 w-3 mr-1" />}
                    {pingingId === node.node_id ? '' : 'Ping'}
                  </button>
                  <button
                    onClick={() => handleStatusCycle(node)}
                    className="flex items-center px-2 py-1 bg-purple-900/30 hover:bg-purple-800/60 border border-purple-700 rounded text-purple-300 text-xs transition-all"
                    title={`Cycle status (current: ${node.status})`}
                  >
                    <ToggleLeft className="h-3 w-3 mr-1" />
                    {node.status}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
