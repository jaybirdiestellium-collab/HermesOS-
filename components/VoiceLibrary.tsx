import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TextToSpeechOptions } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../services/audioUtils';
import { Button } from './common/Button';
import { Loader } from './common/Loader';
import { SUPPORTED_VOICE_NAMES } from '../constants';

const FADE_OUT_DURATION = 0.3; // seconds for audio fade-out

export const VoiceLibrary: React.FC = () => {
  const [textInput, setTextInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); // New ref for GainNode
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Zephyr');
  const [customVoiceFile, setCustomVoiceFile] = useState<File | null>(null);
  const [customVoiceMessage, setCustomVoiceMessage] = useState<string | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (audioSourceRef.current && gainNodeRef.current && audioContextRef.current) {
      const audioContext = audioContextRef.current;
      const gainNode = gainNodeRef.current;
      const source = audioSourceRef.current;

      // Start fading out the audio
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + FADE_OUT_DURATION);

      // Stop the source after the fade-out duration
      source.stop(audioContext.currentTime + FADE_OUT_DURATION);

      // Clean up resources after fade-out and stop
      setTimeout(() => {
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (e) {
          console.warn('Error disconnecting audio nodes:', e);
        }
        audioSourceRef.current = null;
        gainNodeRef.current = null;
      }, FADE_OUT_DURATION * 1000 + 50); // Add a small buffer after duration
    } else if (audioSourceRef.current) { // Fallback for immediate stop if gainNode isn't set up
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        console.warn('Error stopping previous audio source immediately:', e);
      }
      audioSourceRef.current = null;
    }
    setLoading(false); // Ensure loading state is reset if audio is stopped
  }, []);

  const handleGenerateAndPlaySpeech = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || loading) return;

    setError(null);
    setLoading(true);
    stopCurrentAudio(); // Stop any currently playing audio (with fade-out)

    try {
      const options: TextToSpeechOptions = {
        text: textInput,
        voiceName: selectedVoiceName,
      };
      const base64Audio = await generateSpeech(options);

      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);

      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain(); // Create a GainNode
      
      source.buffer = audioBuffer;
      source.connect(gainNode); // Connect source to gainNode
      gainNode.connect(audioContext.destination); // Connect gainNode to destination
      gainNode.gain.value = 1; // Set initial gain to full volume

      source.start(0);
      audioSourceRef.current = source;
      gainNodeRef.current = gainNode; // Store gainNode reference

      source.onended = () => {
        // Clean up when audio finishes naturally
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (e) {
          console.warn('Error disconnecting audio nodes on natural end:', e);
        }
        audioSourceRef.current = null;
        gainNodeRef.current = null;
        setLoading(false);
      };
    } catch (err: any) {
      console.error("Speech generation/playback error:", err);
      setError(err.message || "Failed to translate thought to cadence. Voice signal corrupted.");
      setLoading(false);
      // Ensure resources are cleaned up on error
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.disconnect();
        } catch (e) { /* ignore */ }
        audioSourceRef.current = null;
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (e) { /* ignore */ }
        gainNodeRef.current = null;
      }
    }
  }, [textInput, loading, getAudioContext, stopCurrentAudio, selectedVoiceName]);

  const handleCustomVoiceFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCustomVoiceFile(e.target.files[0]);
      setCustomVoiceMessage(null);
    } else {
      setCustomVoiceFile(null);
    }
  }, []);

  const handleAnalyzeCustomVoice = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!customVoiceFile) {
      setCustomVoiceMessage('Please select an audio file first to attune its spectral signature.');
      return;
    }
    setCustomVoiceMessage(
      `MansionOS is analyzing the spectral signature of "${customVoiceFile.name}" for future integration. Actual voice synthesis from user samples is a future ritual (vΩ.3 or higher).`,
    );
    if (e.target instanceof HTMLFormElement) {
        e.target.reset();
    }
    setCustomVoiceFile(null);
  }, [customVoiceFile]);

  // Clean up audio context on component unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio(); // Ensure any playing audio is stopped and cleaned up
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.warn('Error closing audio context:', e));
        audioContextRef.current = null;
      }
    };
  }, [stopCurrentAudio]);

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] md:h-[calc(100vh-200px)]">
      <h3 className="text-xl font-bold mb-4 text-purple-300">Voice Library - Mercury Syntax</h3>

      <form onSubmit={handleGenerateAndPlaySpeech} className="mb-6 sticky top-0 bg-purple-900 bg-opacity-30 p-4 -mx-4 -my-4 rounded-t-lg">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter text to be spoken by MansionOS..."
          rows={5}
          className="w-full p-3 rounded-lg bg-purple-800 bg-opacity-60 text-white placeholder-purple-300 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
          disabled={loading}
          aria-label="Text to be spoken"
        ></textarea>

        <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="voiceArchetype" className="text-purple-200 font-medium whitespace-nowrap">Voice Archetype:</label>
            <select
              id="voiceArchetype"
              value={selectedVoiceName}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
              className="p-2 rounded-lg bg-purple-800 bg-opacity-60 text-white border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
              disabled={loading}
              aria-label="Select voice archetype"
            >
              {SUPPORTED_VOICE_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2 w-full sm:w-auto">
            <Button type="submit" loading={loading} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Synthesizing Cadence...' : 'Speak Text'}
            </Button>
            <Button
              type="button"
              onClick={stopCurrentAudio}
              disabled={!audioSourceRef.current || loading}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Stop Audio
            </Button>
          </div>
        </div>
      </form>

      <div className="bg-indigo-900 bg-opacity-30 backdrop-blur-sm p-4 rounded-lg shadow-inner border border-indigo-700 mt-4 -mx-4">
        <h4 className="text-lg font-semibold mb-3 text-indigo-300">Custom Voice Attunement (Future Ritual)</h4>
        <p className="text-sm text-indigo-200 mb-3">
          MansionOS is designed for symbolic recursion. While direct voice cloning from audio samples is a future capability,
          you can symbolically upload an audio file. This action will be logged and influence future `vΩ.3` protocols.
        </p>
        <form onSubmit={handleAnalyzeCustomVoice} className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <input
            type="file"
            accept="audio/*"
            onChange={handleCustomVoiceFileChange}
            className="flex-grow text-sm text-purple-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            aria-label="Upload custom voice sample"
          />
          <Button
            type="submit"
            disabled={!customVoiceFile || loading}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Analyze Voice Sample
          </Button>
        </form>
        {customVoiceMessage && (
          <p className="mt-3 text-sm text-indigo-400 italic">{customVoiceMessage}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-800 bg-opacity-50 text-red-200 p-3 rounded-md mb-4 text-sm" role="alert">
          Error: {error}
        </div>
      )}

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar mt-6">
        {!loading && !error && !audioSourceRef.current && textInput.length === 0 && !customVoiceMessage && (
          <p className="text-center text-gray-400">Type text above or attune a voice signature.</p>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-purple-800 bg-opacity-40 rounded-lg">
            <Loader size="lg" />
            <p className="mt-4 text-lg text-purple-200">Listening to the echo... Standby for transmission.</p>
          </div>
        )}
      </div>
    </div>
  );
};