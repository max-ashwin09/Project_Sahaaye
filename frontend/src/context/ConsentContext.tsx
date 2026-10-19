import React, { createContext, useContext, useState } from 'react';

interface ConsentContextType {
  consents: Record<string, boolean>;
  updateConsent: (purpose: string, granted: boolean) => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  const updateConsent = (purpose: string, granted: boolean) => {
    setConsents(prev => ({ ...prev, [purpose]: granted }));
  };

  return (
    <ConsentContext.Provider value={{ consents, updateConsent }}>
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider');
  return ctx;
};
