import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './common/Button';
import { Loader } from './common/Loader';
import { AI_STUDIO_BILLING_URL } from '../constants';

interface ApiKeyGuardProps {
  onApiKeySelected: () => void;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ onApiKeySelected }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectApiKey = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Assume selection was successful and proceed.
        // A race condition can occur where hasSelectedApiKey() may not immediately return true.
        // As per instructions, assume success and proceed without delay.
        onApiKeySelected();
      } else {
        setError("AI Studio API for key selection not available. Cannot select API key.");
      }
    } catch (err: any) {
      console.error('Error opening API key selection:', err);
      setError(`Failed to select API key: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [onApiKeySelected]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 to-purple-950 text-purple-200 p-4">
      <div className="max-w-md w-full p-8 bg-purple-900 bg-opacity-30 backdrop-blur-sm rounded-lg shadow-xl border border-purple-700 text-center">
        <h2 className="text-3xl font-bold mb-4 text-purple-300">MansionOS Activation Required</h2>
        <p className="mb-6 text-lg">
          To unlock the full capabilities of MansionOS, including advanced Image Forge and Voice Library features,
          please select a valid Google Gemini API key from a paid GCP project.
        </p>
        <p className="mb-6 text-sm">
          This is a mandatory step before accessing these wings. The API key is injected automatically for your use.
        </p>

        {error && (
          <div className="bg-red-800 bg-opacity-50 text-red-200 p-3 rounded-md mb-4 text-sm" role="alert">
            {error}
          </div>
        )}

        <Button
          onClick={handleSelectApiKey}
          loading={loading}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Selecting Key...' : 'Select Gemini API Key'}
        </Button>

        <p className="mt-6 text-sm text-gray-400">
          Need a key? Visit the
          <a
            href={AI_STUDIO_BILLING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline ml-1"
          >
            Gemini API billing documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
};