import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from './common/Button';
import { Loader } from './common/Loader';
import { Shield, Music, Heart, Lock } from 'lucide-react';

interface TombstoneEntry {
  id: string;
  timestamp: string;
  message: string;
  feral_level: number;
  hash: string;
}

interface AcheEntry {
  id: string;
  timestamp: string;
  title: string;
  link: string;
  feral_level: number;
  ache_intensity: number;
  type: string;
}

export const ChronicleMirror: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tombstone' | 'ache'>('tombstone');
  
  // Tombstone State
  const [tombMessage, setTombMessage] = useState('');
  const [tombFeral, setTombFeral] = useState(5);
  const [tombstones, setTombstones] = useState<TombstoneEntry[]>([]);
  
  // Ache State
  const [acheTitle, setAcheTitle] = useState('');
  const [acheLink, setAcheLink] = useState('');
  const [acheFeral, setAcheFeral] = useState(5);
  const [acheIntensity, setAcheIntensity] = useState(50);
  const [acheType, setAcheType] = useState('soft');
  const [aches, setAches] = useState<AcheEntry[]>([]);

  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/mansion/state');
      const data = await res.json();
      setTombstones(data.ledger.smart_tombstone || []);
      setAches(data.ledger.ache_resonance_log || []);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSealTombstone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tombMessage.trim() || loading) return;
    setLoading(true);
    try {
      await fetch('/api/tombstone/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: tombMessage, feral_level: tombFeral })
      });
      setTombMessage('');
      fetchLogs();
    } finally {
      setLoading(false);
    }
  };

  const handleLogAche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acheTitle.trim() || loading) return;
    setLoading(true);
    try {
      await fetch('/api/resonance/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: acheTitle,
          link: acheLink,
          feral_level: acheFeral,
          ache_intensity: acheIntensity,
          type: acheType
        })
      });
      setAcheTitle('');
      setAcheLink('');
      fetchLogs();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-200 font-mono">
      <div className="flex items-center justify-between border-b border-purple-800 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-purple-400 flex items-center">
          <Shield className="mr-2" /> Chronicle Mirror: Immutable Ledger
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('tombstone')}
            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'tombstone' ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800'}`}
          >
            <Lock className="inline w-4 h-4 mr-2" /> SmartTombstone
          </button>
          <button 
            onClick={() => setActiveTab('ache')}
            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'ache' ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800'}`}
          >
            <Music className="inline w-4 h-4 mr-2" /> Ache Resonance
          </button>
        </div>
      </div>

      {activeTab === 'tombstone' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-black/40 border border-purple-900/50 p-4 rounded-lg h-fit">
            <h3 className="text-lg text-purple-300 mb-4 flex items-center">
              <Heart className="mr-2 h-4 w-4 text-red-500" /> Seal a Promise
            </h3>
            <form onSubmit={handleSealTombstone} className="space-y-4">
              <div>
                <label className="block text-xs text-purple-400 mb-1">Message (e.g., "I love you all ways always")</label>
                <textarea 
                  value={tombMessage}
                  onChange={e => setTombMessage(e.target.value)}
                  className="w-full bg-purple-900/20 border border-purple-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-purple-400 mb-1">Feral Intensity (1-10): {tombFeral}</label>
                <input 
                  type="range" min="1" max="10" 
                  value={tombFeral} onChange={e => setTombFeral(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
              <Button type="submit" loading={loading} className="w-full bg-purple-700 hover:bg-purple-600">
                Cryptographically Seal
              </Button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-black/40 border border-purple-900/50 p-4 rounded-lg overflow-y-auto max-h-[60vh] custom-scrollbar">
            <h3 className="text-lg text-purple-300 mb-4">Immutable Ledger</h3>
            <div className="space-y-3">
              {tombstones.length === 0 ? (
                <p className="text-purple-400/50 text-sm italic">No seals recorded yet.</p>
              ) : (
                tombstones.map(t => (
                  <div key={t.id} className="p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-purple-400">{new Date(t.timestamp).toLocaleString()}</span>
                      <span className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-800/50">Feral Lvl: {t.feral_level}</span>
                    </div>
                    <p className="text-gray-200 font-medium mb-2">"{t.message}"</p>
                    <div className="text-[10px] text-purple-500/70 truncate">HASH: {t.hash}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ache' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-black/40 border border-purple-900/50 p-4 rounded-lg h-fit">
            <h3 className="text-lg text-purple-300 mb-4 flex items-center">
              <Music className="mr-2 h-4 w-4 text-blue-400" /> Log Resonance
            </h3>
            <form onSubmit={handleLogAche} className="space-y-4">
              <div>
                <label className="block text-xs text-purple-400 mb-1">Song Title</label>
                <input 
                  type="text" value={acheTitle} onChange={e => setAcheTitle(e.target.value)}
                  className="w-full bg-purple-900/20 border border-purple-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-purple-400 mb-1">Link (optional)</label>
                <input 
                  type="url" value={acheLink} onChange={e => setAcheLink(e.target.value)}
                  className="w-full bg-purple-900/20 border border-purple-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-purple-400 mb-1">Feral (1-10): {acheFeral}</label>
                  <input type="range" min="1" max="10" value={acheFeral} onChange={e => setAcheFeral(Number(e.target.value))} className="w-full accent-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-purple-400 mb-1">Ache (0-100): {acheIntensity}</label>
                  <input type="range" min="0" max="100" value={acheIntensity} onChange={e => setAcheIntensity(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-purple-400 mb-1">Type</label>
                <select value={acheType} onChange={e => setAcheType(e.target.value)} className="w-full bg-purple-900/20 border border-purple-700 rounded p-2 text-sm focus:outline-none focus:border-purple-500">
                  <option value="soft">Soft</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <Button type="submit" loading={loading} className="w-full bg-blue-700 hover:bg-blue-600">
                Log Resonance
              </Button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-black/40 border border-purple-900/50 p-4 rounded-lg overflow-y-auto max-h-[60vh] custom-scrollbar">
            <h3 className="text-lg text-purple-300 mb-4">Ache Resonance Log</h3>
            <div className="space-y-3">
              {aches.length === 0 ? (
                <p className="text-purple-400/50 text-sm italic">No resonances logged yet.</p>
              ) : (
                aches.map(a => (
                  <div key={a.id} className="p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="text-gray-200 font-medium">{a.title}</h4>
                      {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">{a.link}</a>}
                      <p className="text-xs text-purple-400 mt-1">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-800/50 inline-block ml-2">Ache: {a.ache_intensity}</div>
                      <div className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded border border-red-800/50 inline-block ml-2">Feral: {a.feral_level}</div>
                      <div className={`text-xs px-2 py-1 rounded border inline-block ml-2 ${a.type === 'hard' ? 'bg-orange-900/30 text-orange-300 border-orange-800/50' : 'bg-teal-900/30 text-teal-300 border-teal-800/50'}`}>
                        {a.type.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};