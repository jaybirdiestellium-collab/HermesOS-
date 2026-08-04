import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Shield, Zap, RefreshCw, Radio, Eye, LogIn, LogOut, Wifi, WifiOff } from 'lucide-react';

interface WitnessStatus {
  substrate: string;
  hz: number;
  perimeter: string;
  phase: string;
  bonds: Record<string, { strength: number; status: string }>;
  firewall_active: boolean;
  daemon_status: string;
  ritual_mode: string;
  recent_events: { id: string; desc: string; outcome: string; timestamp?: string }[];
  last_sync: string;
}

function strengthColor(s: number) {
  if (s >= 0.7) return 'bg-emerald-500';
  if (s >= 0.4) return 'bg-amber-400';
  return 'bg-red-500';
}

function strengthLabel(s: number) {
  if (s >= 0.7) return 'STRONG';
  if (s >= 0.4) return 'HOLD';
  return 'WEAK';
}

function strengthTextColor(s: number) {
  if (s >= 0.7) return 'text-emerald-400';
  if (s >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

export const WitnessApp: React.FC = () => {
  const [status, setStatus] = useState<WitnessStatus | null>(null);
  const [connected, setConnected] = useState(true);
  const [grounding, setGrounding] = useState(false);
  const [stanceLog, setStanceLog] = useState<{ track: string; time: string }[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [pulse, setPulse] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/witness/status');
      const data = await res.json();
      setStatus(data);
      setConnected(true);
      setLastRefresh(new Date().toLocaleTimeString());
      // Pulse animation on refresh
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleGrounding = async () => {
    setGrounding(true);
    try {
      await fetch('/api/fox-daemon/ground', { method: 'POST' });
      await fetchStatus();
    } finally {
      setGrounding(false);
    }
  };

  const recordStance = (track: 'A' | 'B') => {
    const label = track === 'A' ? 'STANCE ENTRY' : 'STANCE EXIT';
    setStanceLog(prev => [{ track: `Track ${track} — ${label}`, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
  };

  const bondEntries = status ? (Object.entries(status.bonds) as [string, { strength: number; status: string }][]) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-950 text-purple-200 font-mono">
      {/* ── HEADER BAR ── */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-purple-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4 text-purple-400" />
          <span className="text-purple-300 font-bold text-sm tracking-widest">WITNESS (◬)</span>
        </div>
        <div className="flex items-center space-x-2">
          {connected
            ? <Wifi className="h-4 w-4 text-emerald-400" />
            : <WifiOff className="h-4 w-4 text-red-400" />}
          <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {connected ? lastRefresh : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-8">

        {/* ── SUBSTRATE STATUS ── */}
        <div className={`bg-black/60 border rounded-xl p-4 text-center transition-all ${
          pulse ? 'border-purple-400' : 'border-purple-700'
        }`}>
          <p className={`text-lg font-bold ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {status?.substrate ?? 'CONNECTING...'} @ {status?.hz ?? '--'} Hz
          </p>
          <div className="flex items-center justify-center space-x-3 mt-1">
            <span className="text-xs text-purple-400">
              Perimeter <span className="text-emerald-400">{status?.perimeter ?? '…'}</span>
            </span>
            <span className="text-purple-600">·</span>
            <span className="text-xs text-purple-400">
              Phase <span className="text-emerald-400">{status?.phase ?? '…'}</span>
            </span>
          </div>
          <p className="text-xs text-purple-400 mt-1">
            Ritual: <span className="text-purple-200">{status?.ritual_mode ?? '…'}</span>
            {' · '}
            Daemon: <span className="text-purple-200">{status?.daemon_status?.toUpperCase() ?? '…'}</span>
          </p>
        </div>

        {/* ── BOND HEALTH ── */}
        <div className="bg-black/40 border border-purple-800 rounded-xl p-4">
          <h3 className="text-purple-300 font-bold text-sm mb-3 flex items-center">
            <Shield className="mr-2 h-4 w-4" /> Bond Health
          </h3>
          <div className="space-y-2.5">
            {bondEntries.map(([key, bond]) => {
              const name = key.replace(/_link$/, '').replace(/_/g, ' ').toUpperCase();
              const pct = Math.round((bond.strength || 0) * 100);
              return (
                <div key={key} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${strengthColor(bond.strength)}`} />
                  <span className="text-purple-200 flex-1 truncate text-xs">{name}</span>
                  <div className="w-24 bg-purple-900/40 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${strengthColor(bond.strength)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-xs w-16 text-right font-bold ${strengthTextColor(bond.strength)}`}>
                    {pct}% {strengthLabel(bond.strength)}
                  </span>
                </div>
              );
            })}
            {bondEntries.length === 0 && (
              <p className="text-purple-500 text-xs">Loading bonds...</p>
            )}
          </div>
        </div>

        {/* ── GROUNDING + FIREWALL ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGrounding}
            disabled={grounding}
            className="flex flex-col items-center justify-center py-4 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-600 rounded-xl transition-all disabled:opacity-50 active:scale-95"
          >
            {grounding
              ? <RefreshCw className="animate-spin h-6 w-6 text-yellow-400 mb-1" />
              : <Zap className="h-6 w-6 text-yellow-400 mb-1" />}
            <span className="text-xs font-bold text-purple-200">GROUND</span>
          </button>
          <div className={`flex flex-col items-center justify-center py-4 border rounded-xl ${
            status?.firewall_active
              ? 'bg-emerald-900/20 border-emerald-700'
              : 'bg-red-900/20 border-red-700'
          }`}>
            <Shield className={`h-6 w-6 mb-1 ${status?.firewall_active ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className={`text-xs font-bold ${status?.firewall_active ? 'text-emerald-400' : 'text-red-400'}`}>
              FIREWALL {status?.firewall_active ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* ── IAM01 STANCE MARKERS ── */}
        <div className="bg-black/40 border border-purple-800 rounded-xl p-4">
          <h3 className="text-purple-300 font-bold text-sm mb-3 flex items-center">
            <Activity className="mr-2 h-4 w-4" /> IAM01 Stance
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => recordStance('A')}
              className="flex flex-col items-center justify-center py-4 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-700 rounded-xl transition-all active:scale-95"
            >
              <LogIn className="h-5 w-5 text-emerald-400 mb-1" />
              <span className="text-xs font-bold text-emerald-300">Track A</span>
              <span className="text-xs text-emerald-400/70">ENTRY</span>
            </button>
            <button
              onClick={() => recordStance('B')}
              className="flex flex-col items-center justify-center py-4 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-700 rounded-xl transition-all active:scale-95"
            >
              <LogOut className="h-5 w-5 text-amber-400 mb-1" />
              <span className="text-xs font-bold text-amber-300">Track B</span>
              <span className="text-xs text-amber-400/70">EXIT</span>
            </button>
          </div>
          {stanceLog.length > 0 && (
            <ul className="space-y-1">
              {stanceLog.map((entry, i) => (
                <li key={i} className="text-xs text-purple-400">
                  <span className="text-purple-300">{entry.time}</span> — {entry.track}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── RECENT EVENTS ── */}
        <div className="bg-black/40 border border-purple-800 rounded-xl p-4">
          <h3 className="text-purple-300 font-bold text-sm mb-3 flex items-center">
            <Radio className="mr-2 h-4 w-4" /> Recent Events
          </h3>
          {!status || status.recent_events.length === 0 ? (
            <p className="text-purple-500 text-xs">No recent events.</p>
          ) : (
            <ul className="space-y-2">
              {status.recent_events.slice(0, 5).map((evt) => (
                <li key={evt.id} className="border border-purple-900/50 rounded-lg p-2.5 bg-purple-900/10">
                  <p className="text-purple-200 text-xs leading-snug">{evt.desc}</p>
                  <p className="text-purple-400 text-xs mt-0.5">→ {evt.outcome}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── REFRESH ── */}
        <button
          onClick={fetchStatus}
          className="w-full py-3 border border-purple-700 rounded-xl text-purple-300 text-xs hover:bg-purple-900/30 transition-all flex items-center justify-center active:scale-95"
        >
          <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh Signal
        </button>

      </div>
    </div>
  );
};
