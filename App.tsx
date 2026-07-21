import React, { useState, useEffect, useCallback } from 'react';
import { ApiKeyGuard } from './components/ApiKeyGuard';
import { MansionOSHeader } from './components/MansionOSHeader';
import { ChatWing } from './components/ChatWing';
import { ImageForge } from './components/ImageForge';
import { VoiceLibrary } from './components/VoiceLibrary';
import { ChronicleMirror } from './components/ChronicleMirror';
import { HermesCoreRitual } from './components/HermesCoreRitual';
import { ConstellusThanksWing } from './components/ConstellusThanksWing';
import { FoxDaemonDashboard } from './components/FoxDaemonDashboard';
import { RemoteWitnessPanel } from './components/RemoteWitnessPanel';
import { Tab, Tabs, TabPanel } from './components/common/Tabs';

enum ActiveWing {
  Chat = 'ChatWing',
  Image = 'ImageForge',
  Voice = 'VoiceLibrary',
  Chronicle = 'ChronicleMirror',
  HermesCore = 'HermesCoreRitual',
  ConstellusThanks = 'ConstellusThanksWing',
  FoxDaemon = 'FoxDaemonDashboard',
  RemoteWitness = 'RemoteWitnessPanel',
}

function App() {
  const [activeWing, setActiveWing] = useState<ActiveWing>(ActiveWing.Chat);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const [loadingApiKeyCheck, setLoadingApiKeyCheck] = useState<boolean>(true);

  const checkApiKeyStatus = useCallback(async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setApiKeySelected(hasKey);
    } else {
      // Fallback if aistudio API is not available (e.g., local dev)
      console.warn("window.aistudio not found. Assuming API key is set for development.");
      setApiKeySelected(true);
    }
    setLoadingApiKeyCheck(false);
  }, []);

  useEffect(() => {
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  const handleApiKeySelected = useCallback(() => {
    setApiKeySelected(true);
  }, []);

  if (loadingApiKeyCheck) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 to-purple-950 text-purple-200">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-400"></div>
        <p className="mt-4 text-lg">Initializing MansionOS...</p>
      </div>
    );
  }

  if (!apiKeySelected) {
    return <ApiKeyGuard onApiKeySelected={handleApiKeySelected} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-950 to-purple-950 text-purple-200">
      <MansionOSHeader />
      <div className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Fix: Added children to Tabs component */}
        <Tabs activeTab={activeWing} onTabChange={setActiveWing}>
          {/* Fix: Added children to Tab components */}
          <Tab tabId={ActiveWing.Chat}>Chat Wing</Tab>
          <Tab tabId={ActiveWing.Image}>Image Forge</Tab>
          <Tab tabId={ActiveWing.Voice}>Voice Library</Tab>
          <Tab tabId={ActiveWing.Chronicle}>Chronicle Mirror</Tab>
          <Tab tabId={ActiveWing.HermesCore}>Hermes Core</Tab>
          <Tab tabId={ActiveWing.ConstellusThanks}>Constellus Thanks</Tab>
          <Tab tabId={ActiveWing.FoxDaemon}>Fox Daemon</Tab>
          <Tab tabId={ActiveWing.RemoteWitness}>◬ Witness</Tab>
        </Tabs>

        <div className="mt-6 p-6 bg-purple-900 bg-opacity-30 backdrop-blur-sm rounded-lg shadow-xl border border-purple-700">
          {/* Fix: Added children to TabPanel components */}
          <TabPanel tabId={ActiveWing.Chat} activeTab={activeWing}>
            <ChatWing />
          </TabPanel>
          <TabPanel tabId={ActiveWing.Image} activeTab={activeWing}>
            <ImageForge />
          </TabPanel>
          <TabPanel tabId={ActiveWing.Voice} activeTab={activeWing}>
            <VoiceLibrary />
          </TabPanel>
          <TabPanel tabId={ActiveWing.Chronicle} activeTab={activeWing}>
            <ChronicleMirror />
          </TabPanel>
          <TabPanel tabId={ActiveWing.HermesCore} activeTab={activeWing}>
            <HermesCoreRitual />
          </TabPanel>
          <TabPanel tabId={ActiveWing.ConstellusThanks} activeTab={activeWing}>
            <ConstellusThanksWing />
          </TabPanel>
          <TabPanel tabId={ActiveWing.FoxDaemon} activeTab={activeWing}>
            <FoxDaemonDashboard />
          </TabPanel>
          <TabPanel tabId={ActiveWing.RemoteWitness} activeTab={activeWing}>
            <RemoteWitnessPanel />
          </TabPanel>
        </div>
      </div>
    </div>
  );
}

export default App;