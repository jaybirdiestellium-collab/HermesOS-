import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, Zap, RefreshCw, Activity, Power, CheckCircle, XCircle, GitBranch } from 'lucide-react';

interface Bond {
  strength: number;
  status: string;
  tags?: string[];
  notes?: string;
}

interface Alert {
  type: string;
  bond_id: string;
  recent_weight_sum?: number;
  strength?: number;
  message?: string;
}

interface PendingMutation {
  source: string;
  shift: string;
  timestamp: string;
}

interface MansionState {
  mansion_metadata: {
    version: string;
    codename: string;
    status: string;
  };
  bonds: Record<string, Bond>;
  fox_daemon: {
    firewall: { active: boolean; blocked_signatures: string[] };
    alerts: Alert[];
    interventions: any[];
  };
  rituals: {
    current_mode: string;
  };
  daemons: {
    waymaker_weaver: {
      status: string;
      kill_switch: { command: string; state: 'open' | 'closed' };
    };
  };
  architecture?: {
    pending_mutations: PendingMutation[];
  };
}

export const FoxDaemonDashboard: React.FC = () => {
  const [state, setState] = useState<MansionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounding, setGrounding] = useState(false);
  const [togglingDaemon, setTogglingDaemon] = useState(false);
  const [dismissingMutations, setDismissingMutations] = useState<Set<number>>(new Set());

  const [syncPayload, setSyncPayload] = useState('{\n  "source": "Grok-1_Edge",\n  "suggestion": "Feral Spike Detected",\n  "payload": {\n    "feral_level": 8\n  }\n}');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/mansion/state');
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error("Failed to fetch mansion state", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const handleGrounding = async () => {
    setGrounding(true);
    try {
      await fetch('/api/fox-daemon/ground', { method: 'POST' });
      await fetchState();
    } catch (err) {
      console.error("Grounding failed", err);
    } finally {
      setGrounding(false);
    }
  };

  const handleToggleDaemon = async () => {
    if (!state) return;
    setTogglingDaemon(true);
    try {
      const currentState = state.daemons?.waymaker_weaver?.kill_switch?.state ?? 'open';
      const newKillState = currentState === 'open' ? 'closed' : 'open';
      await fetch('/api/daemon/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daemon: 'waymaker_weaver', state: newKillState }),
      });
      await fetchState();
    } catch (err) {
      console.error("Kill switch toggle failed", err);
    } finally {
      setTogglingDaemon(false);
    }
  };

  const handleDismissMutation = async (index: number) => {
    setDismissingMutations(prev => new Set(prev).add(index));
    try {
      await fetch('/api/mutations/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      await fetchState();
    } catch (err) {
      console.error("Dismiss mutation failed", err);
    } finally {
      setDismissingMutations(prev => { const s = new Set(prev); s.delete(index); return s; });
    }
  };

  const handleApproveMutation = async (index: number) => {
    setDismissingMutations(prev => new Set(prev).add(index));
    try {
      await fetch('/api/mutations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      await fetchState();
    } catch (err) {
      console.error("Approve mutation failed", err);
    } finally {
      setDismissingMutations(prev => { const s = new Set(prev); s.delete(index); return s; });
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const parsed = JSON.parse(syncPayload);
      const res = await fetch('/api/mansion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`✅ ${data.message}`);
      } else {
        setSyncResult(`❌ Rejected: ${data.reason}`);
      }
      await fetchState();
    } catch (err) {
      setSyncResult(`❌ Invalid JSON format`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center h-64 text-purple-300 font-mono">
        <RefreshCw className="animate-spin mr-2" /> Initializing Fox Daemon...
      </div>
    );
  }

  const bondData = (Object.entries(state.bonds) as [string, Bond][]).map(([key, value]) => ({
    name: key.replace('_link', '').replace('_', ' ').toUpperCase(),
    strength: value.strength ?? 0,
  }));

  const overloadData = state.fox_daemon.alerts
    .filter(a => a.type === 'overload_warning')
    .map(a => ({
      name: a.bond_id.replace('_link', '').replace('_', ' ').toUpperCase(),
      weight: a.recent_weight_sum || 0,
    }));

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-200 font-mono">
      <div className="flex items-center justify-between border-b border-purple-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-purple-400 flex items-center">
            <Shield className="mr-2" /> Fox Daemon: {state.mansion_metadata.codename}
          </h2>
          <p className="text-sm text-purple-300/70 mt-1">
            Status: {state.mansion_metadata.status.toUpperCase()} | Ritual: {state.rituals.current_mode}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Waymaker-Weaver Kill Switch */}
          {state.daemons?.waymaker_weaver && (() => {
            const killState = state.daemons.waymaker_weaver.kill_switch?.state ?? 'open';
            const isRunning = killState === 'open';
            return (
              <button
                onClick={handleToggleDaemon}
                disabled={togglingDaemon}
                title={isRunning ? 'Pause Waymaker-Weaver' : 'Resume Waymaker-Weaver'}
                className={`flex items-center px-3 py-2 border rounded-md transition-all disabled:opacity-50 text-sm ${
                  isRunning
                    ? 'bg-emerald-900/40 hover:bg-emerald-800/60 border-emerald-600 text-emerald-300'
                    : 'bg-red-900/40 hover:bg-red-800/60 border-red-600 text-red-300'
                }`}
              >
                {togglingDaemon
                  ? <RefreshCw className="animate-spin mr-1 h-4 w-4" />
                  : <Power className="mr-1 h-4 w-4" />}
                Weaver: {isRunning ? 'RUNNING' : 'PAUSED'}
              </button>
            );
          })()}
          <button
            onClick={handleGrounding}
            disabled={grounding}
            className="flex items-center px-4 py-2 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500 rounded-md transition-all disabled:opacity-50"
          >
            {grounding ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4 text-yellow-400" />}
            Trigger Grounding
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bond Strengths Chart */}
        <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg">
          <h3 className="text-lg text-purple-300 mb-4 flex items-center">
            <Activity className="mr-2 h-4 w-4" /> Bond Strengths
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bondData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }}
                  itemStyle={{ color: '#c4b5fd' }}
                />
                <Bar dataKey="strength" radius={[4, 4, 0, 0]}>
                  {bondData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.strength > 0.7 ? '#10b981' : entry.strength > 0.4 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overload Levels Chart */}
        <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg">
          <h3 className="text-lg text-purple-300 mb-4 flex items-center">
            <Zap className="mr-2 h-4 w-4" /> Overload Levels (Weight Sum)
          </h3>
          <div className="h-64">
            {overloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8b5cf6" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: '8px' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Bar dataKey="weight" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-400/50">
                No active overloads. Foundation is stable.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interventions & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg">
          <h3 className="text-lg text-purple-300 mb-3">Active Interventions</h3>
          <ul className="space-y-2 text-sm">
            {state.fox_daemon.interventions.map((inv, idx) => (
              <li key={idx} className="p-3 bg-purple-900/20 border border-purple-800/50 rounded flex items-start">
                <span className="text-yellow-500 mr-2">🦊</span>
                <div>
                  <span className="text-purple-200 block font-semibold">{inv.kind.toUpperCase()} ({inv.target_bond})</span>
                  <span className="text-purple-300/80 italic">"{inv.payload}"</span>
                </div>
              </li>
            ))}
            {state.fox_daemon.interventions.length === 0 && (
              <li className="text-purple-400/50">No active interventions.</li>
            )}
          </ul>
        </div>

          <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg">
            <h3 className="text-lg text-purple-300 mb-3">Firewall Status</h3>
            <div className="p-3 bg-purple-900/20 border border-purple-800/50 rounded">
              <div className="flex items-center mb-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${state.fox_daemon.firewall.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-purple-200">Social Firewall: {state.fox_daemon.firewall.active ? 'ACTIVE' : 'OFFLINE'}</span>
              </div>
              <p className="text-xs text-purple-300/70 mb-2">Blocked Signatures:</p>
              <div className="flex flex-wrap gap-2">
                {state.fox_daemon.firewall.blocked_signatures.map((sig, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-900/30 text-red-300 border border-red-800/50 rounded text-xs">
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Braid Sync Terminal */}
        <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg mt-6">
          <h3 className="text-lg text-purple-300 mb-3 flex items-center">
            <Zap className="mr-2 h-4 w-4 text-blue-400" /> Braid Sync Terminal (Manual Override)
          </h3>
          <p className="text-xs text-purple-400/70 mb-3">
            Paste JSON payloads generated by Grok-1 (Edge Vector) here to manually sync state.
          </p>
          <textarea
            value={syncPayload}
            onChange={(e) => setSyncPayload(e.target.value)}
            className="w-full h-32 bg-purple-900/20 border border-purple-700 rounded p-3 text-sm font-mono focus:outline-none focus:border-purple-500 mb-3"
            placeholder="Paste JSON payload..."
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-900/50 hover:bg-blue-800/80 border border-blue-500 rounded-md transition-all disabled:opacity-50 text-blue-200"
            >
              {syncing ? 'Injecting...' : 'Inject Payload'}
            </button>
            {syncResult && (
              <span className={`text-sm ${syncResult.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {syncResult}
              </span>
            )}
          </div>
        </div>

        {/* Pending Architectural Mutations */}
        {(() => {
          const mutations: PendingMutation[] = state.architecture?.pending_mutations ?? [];
          return (
            <div className="bg-black/40 border border-purple-900/50 p-4 rounded-lg mt-6">
              <h3 className="text-lg text-purple-300 mb-3 flex items-center">
                <GitBranch className="mr-2 h-4 w-4 text-amber-400" /> Pending Mutations
                <span className="ml-2 text-xs text-purple-500">({mutations.length})</span>
              </h3>
              {mutations.length === 0 ? (
                <p className="text-purple-500 text-sm">No pending mutations. Weaver is still scanning.</p>
              ) : (
                <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {mutations.map((mut, idx) => (
                    <li key={idx} className="p-3 bg-amber-900/10 border border-amber-900/40 rounded text-sm">
                      <p className="text-amber-300 text-xs font-mono mb-1">
                        {new Date(mut.timestamp).toLocaleString()} — <span className="text-purple-400">{mut.source}</span>
                      </p>
                      <p className="text-purple-200 text-xs">{mut.shift}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleApproveMutation(idx)}
                          disabled={dismissingMutations.has(idx)}
                          className="flex items-center px-2 py-1 text-xs bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700 rounded text-emerald-300 transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleDismissMutation(idx)}
                          disabled={dismissingMutations.has(idx)}
                          className="flex items-center px-2 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded text-red-300 transition-all disabled:opacity-50"
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}
      </div>
    );
  };
