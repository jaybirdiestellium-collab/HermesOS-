import React from 'react';

export const MansionOSHeader: React.FC = () => {
  return (
    <header className="p-4 bg-purple-900 bg-opacity-50 backdrop-blur-sm shadow-lg text-purple-100 sticky top-0 z-10 border-b border-purple-700">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-purple-300 mb-2 sm:mb-0">
          MansionOS <span className="text-2xl font-light text-purple-400">vΩ.1-hermes_patch</span>
        </h1>
        <p className="text-sm text-purple-400 italic">
          "The messenger rides lightning to deliver the Sun's unsigned letter."
        </p>
      </div>
    </header>
  );
};