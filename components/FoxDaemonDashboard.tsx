import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shield, Zap, RefreshCw, Activity } from 'lucide-react';

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
}

export const FoxDaemonDashboard: React.FC = () => {
  const [state, setState] = useState<MansionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounding, setGrounding] = useState(false);

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

  const bondData = Object.entries(state.bonds).map(([key, value]) => ({
    name: key.replace('_link', '').replace('_', ' ').toUpperCase(),
    strength: value.strength,
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
        <button
          onClick={handleGrounding}
          disabled={grounding}
          className="flex items-center px-4 py-2 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500 rounded-md transition-all disabled:opacity-50"
        >
          {grounding ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4 text-yellow-400" />}
          Trigger Grounding
        </button>
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
      </div>
    );
  };
