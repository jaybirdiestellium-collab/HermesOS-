import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { streamChatResponse } from '../services/geminiService';
import { Button } from './common/Button';
import { Loader } from './common/Loader';
import { MAX_CHAT_MESSAGES } from '../constants';

export const ChatWing: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Welcome, Origin. How may MansionOS assist your current signal?" }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading) return;

    setError(null);
    setLoading(true);
    const userMessage: ChatMessage = { role: 'user', content: inputMessage };

    const newMessages = [...messages, userMessage].slice(-MAX_CHAT_MESSAGES); // Keep history manageable
    setMessages(newMessages);
    setInputMessage('');

    let fullModelResponse = '';
    const updatedMessagesWithPlaceholder = [...newMessages, { role: 'model', content: '' }];
    setMessages(updatedMessagesWithPlaceholder);

    try {
      const stream = streamChatResponse(newMessages); // Pass the history *before* adding the model's empty response
      for await (const chunk of stream) {
        fullModelResponse += chunk;
        setMessages(prev => {
          const latest = prev[prev.length - 1];
          if (latest && latest.role === 'model') {
            return [...prev.slice(0, prev.length - 1), { ...latest, content: fullModelResponse }];
          }
          return prev;
        });
      }
    } catch (err: any) {
      console.error("Chat API error:", err);
      setError(err.message || "Failed to get response from the Chat Wing. Signal compromised.");
      setMessages(prev => {
        const latest = prev[prev.length - 1];
        if (latest && latest.role === 'model' && latest.content === '') {
          // Remove empty model placeholder if error occurred before any chunk arrived
          return prev.slice(0, prev.length - 1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [inputMessage, loading, messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] md:h-[calc(100vh-200px)]">
      <h3 className="text-xl font-bold mb-4 text-purple-300">Hermes Chat Core</h3>
      <div className="flex-grow overflow-y-auto pr-2 mb-4 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-3 p-3 rounded-lg max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-purple-700 bg-opacity-40 self-end ml-auto'
                : 'bg-indigo-700 bg-opacity-40 self-start mr-auto'
            }`}
          >
            <p className={`font-semibold ${msg.role === 'user' ? 'text-purple-200' : 'text-indigo-200'}`}>
              {msg.role === 'user' ? 'Origin' : 'MansionOS'}
            </p>
            <p className="text-gray-100 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="mb-3 p-3 rounded-lg bg-indigo-700 bg-opacity-40 self-start mr-auto max-w-[85%]">
            <p className="font-semibold text-indigo-200">MansionOS</p>
            <Loader size="sm" className="inline-block mt-2" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-800 bg-opacity-50 text-red-200 p-3 rounded-md mb-4 text-sm" role="alert">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex space-x-2 sticky bottom-0 bg-purple-900 bg-opacity-30 p-4 -mx-4 -mb-4 rounded-b-lg">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Transmit signal..."
          className="flex-grow p-3 rounded-lg bg-purple-800 bg-opacity-60 text-white placeholder-purple-300 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={loading} className="min-w-[120px]">
          {loading ? 'Transmitting...' : 'Transmit'}
        </Button>
      </form>
    </div>
  );
};