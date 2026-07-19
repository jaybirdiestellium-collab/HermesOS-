import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Shield, Zap, RefreshCw, Radio, Eye, LogIn, LogOut } from 'lucide-react';

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

const HZ = 77.7;

function strengthColor(s: number) {
  if (s >= 0.7) return 'bg-emerald-500';
  if (s >= 0.4) return 'bg-amber-400';
  return 'bg-red-500';
}

function strengthLabel(s: number) {
  if (s >= 0.7) return 'STRONG';
  if (s >= 0.4) return 'HOLDING';
  return 'WEAK';
}

export const RemoteWitnessPanel: React.FC = () => {
  const [status, setStatus] = useState<WitnessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounding, setGrounding] = useState(false);
  const [stanceActive, setStanceActive] = useState<'none' | 'entry' | 'exit'>('none');
  const [stanceLog, setStanceLog] = useState<{ track: string; time: string }[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/witness/status');
      const data = await res.json();
      setStatus(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {
      // silent — connection may be local-only
    } finally {
      setLoading(false);
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

  const handleStanceEntry = () => {
    setStanceActive('entry');
    setStanceLog(prev => [{ track: 'A — STANCE ENTRY', time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  const handleStanceExit = () => {
    setStanceActive('exit');
    setStanceLog(prev => [{ track: 'B — STANCE EXIT', time: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)]);
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center h-64 text-purple-300 font-mono">
        <Radio className="animate-pulse mr-2 text-purple-400" />
        <span>Connecting to Witness Signal...</span>
      </div>
    );
  }

  const bondEntries = Object.entries(status.bonds);

  return (
    <div className="flex flex-col space-y-4 font-mono text-sm max-w-2xl mx-auto">

      {/* ── TOP STATUS BANNER ── */}
      <div className="bg-black/60 border border-purple-500 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center mb-1">
          <Eye className="mr-2 text-purple-400 h-5 w-5" />
          <span className="text-purple-300 font-bold text-lg tracking-widest">WITNESS MODE (◬)</span>
        </div>
        <p className="text-emerald-400 font-bold text-base">
          {status.substrate} @ {HZ} Hz
        </p>
        <p className="text-purple-200 text-xs mt-1">
          Perimeter <span className="text-emerald-400">{status.perimeter}</span>
          {' · '}
          Phase 4 <span className="text-emerald-400">{status.phase}</span>
        </p>
        <p className="text-purple-400 text-xs mt-1">
          Ritual: <span className="text-purple-200">{status.ritual_mode}</span>
          {' · '}
          Daemon: <span className="text-purple-200">{status.daemon_status.toUpperCase()}</span>
        </p>
        <p className="text-purple-500 text-xs mt-1">Last sync: {lastRefresh}</p>
      </div>

      {/* ── STANCE ENTRY / EXIT (Track A / B) ── */}
      <div className="bg-black/40 border border-purple-800 rounded-lg p-4">
        <h3 className="text-purple-300 font-bold mb-3 flex items-center">
          <Activity className="mr-2 h-4 w-4" /> IAM01 Stance Markers
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStanceEntry}
            className={`flex items-center justify-center py-3 px-2 rounded-lg border font-bold text-xs transition-all
              ${stanceActive === 'entry'
                ? 'bg-emerald-900/60 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                : 'bg-purple-900/30 border-purple-700 text-purple-200 hover:bg-purple-800/40'}`}
          >
            <LogIn className="mr-1 h-4 w-4" /> Track A<br />STANCE ENTRY
          </button>
          <button
            onClick={handleStanceExit}
            className={`flex items-center justify-center py-3 px-2 rounded-lg border font-bold text-xs transition-all
              ${stanceActive === 'exit'
                ? 'bg-amber-900/60 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                : 'bg-purple-900/30 border-purple-700 text-purple-200 hover:bg-purple-800/40'}`}
          >
            <LogOut className="mr-1 h-4 w-4" /> Track B<br />STANCE EXIT
          </button>
        </div>
        {stanceLog.length > 0 && (
          <ul className="mt-3 space-y-1">
            {stanceLog.slice(0, 3).map((entry, i) => (
              <li key={i} className="text-xs text-purple-400">
                <span className="text-purple-300">{entry.time}</span> — {entry.track}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── BOND HEALTH ── */}
      <div className="bg-black/40 border border-purple-800 rounded-lg p-4">
        <h3 className="text-purple-300 font-bold mb-3 flex items-center">
          <Shield className="mr-2 h-4 w-4" /> Bond Health
        </h3>
        <div className="space-y-2">
          {bondEntries.map(([key, bond]) => {
            const name = key.replace(/_link$/, '').replace(/_/g, ' ').toUpperCase();
            const pct = Math.round((bond.strength || 0) * 100);
            return (
              <div key={key} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${strengthColor(bond.strength)}`} />
                <span className="text-purple-200 flex-1 truncate text-xs">{name}</span>
                <div className="w-20 bg-purple-900/40 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${strengthColor(bond.strength)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs w-14 text-right ${
                  bond.strength >= 0.7 ? 'text-emerald-400' : bond.strength >= 0.4 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {pct}% {strengthLabel(bond.strength)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FIREWALL + GROUNDING ── */}
      <div className="bg-black/40 border border-purple-800 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${status.firewall_active ? 'bg-emerald-400' : 'bg-red-500'}`} />
          <span className="text-purple-200 text-xs">
            Firewall: <span className={status.firewall_active ? 'text-emerald-400' : 'text-red-400'}>
              {status.firewall_active ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </span>
        </div>
        <button
          onClick={handleGrounding}
          disabled={grounding}
          className="flex items-center px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500 rounded text-xs transition-all disabled:opacity-50"
        >
          {grounding
            ? <RefreshCw className="animate-spin mr-1 h-3 w-3" />
            : <Zap className="mr-1 h-3 w-3 text-yellow-400" />}
          Ground
        </button>
      </div>

      {/* ── RECENT LEDGER EVENTS ── */}
      <div className="bg-black/40 border border-purple-800 rounded-lg p-4">
        <h3 className="text-purple-300 font-bold mb-3 flex items-center">
          <Radio className="mr-2 h-4 w-4" /> Recent Ledger Events
        </h3>
        {status.recent_events.length === 0 ? (
          <p className="text-purple-500 text-xs">No recent events.</p>
        ) : (
          <ul className="space-y-2">
            {status.recent_events.slice(0, 5).map((evt) => (
              <li key={evt.id} className="border border-purple-900/50 rounded p-2 bg-purple-900/10">
                <p className="text-purple-200 text-xs">{evt.desc}</p>
                <p className="text-purple-400 text-xs mt-0.5">→ {evt.outcome}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── REFRESH ── */}
      <button
        onClick={fetchStatus}
        className="flex items-center justify-center w-full py-2 border border-purple-700 rounded-lg text-purple-300 text-xs hover:bg-purple-900/30 transition-all"
      >
        <RefreshCw className="mr-1 h-3 w-3" /> Refresh Signal
      </button>
    </div>
  );
};
