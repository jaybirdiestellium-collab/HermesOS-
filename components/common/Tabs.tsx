import React, { PropsWithChildren } from 'react';

interface TabsPropsBase<T extends string> {
  activeTab: T;
  onTabChange: (tabId: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ children, activeTab, onTabChange, className }: PropsWithChildren<TabsPropsBase<T>>): React.ReactElement {
  return (
    <div className={`flex space-x-2 p-1 rounded-lg bg-purple-900 bg-opacity-40 backdrop-blur-sm shadow-md ${className || ''}`}>
      {/* Fix: Corrected type casting from TabProps to the defined TabProps interface */}
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement<TabProps<T>>, {
          isActive: (child as React.ReactElement<TabProps<T>>).props.tabId === activeTab,
          onClick: () => onTabChange((child as React.ReactElement<TabProps<T>>).props.tabId),
        }),
      )}
    </div>
  );
}

// Fix: Renamed TabPropsBase to TabProps for consistency and to resolve undefined type errors
interface TabProps<T extends string> extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tabId: T;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

// Fix: Updated the Tab component to use the new TabProps interface
export function Tab<T extends string>({ tabId, children, isActive = false, onClick, className, ...props }: PropsWithChildren<TabProps<T>>): React.ReactElement {
  const activeClasses = 'bg-purple-600 text-white shadow-lg';
  const inactiveClasses = 'text-purple-200 hover:bg-purple-800 hover:text-white';

  return (
    <button
      type="button"
      className={`
        px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
        ${isActive ? activeClasses : inactiveClasses}
        ${className || ''}
      `}
      onClick={onClick}
      aria-controls={`tabpanel-${tabId}`}
      aria-selected={isActive}
      id={`tab-${tabId}`}
      role="tab"
      {...props}
    >
      {children}
    </button>
  );
}

interface TabPanelPropsBase<T extends string> {
  tabId: T;
  activeTab: T;
  className?: string;
}

export function TabPanel<T extends string>({ tabId, activeTab, children, className }: PropsWithChildren<TabPanelPropsBase<T>>): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      hidden={tabId !== activeTab}
      className={tabId === activeTab ? `block ${className || ''}` : 'hidden'}
    >
      {children}
    </div>
  );
}