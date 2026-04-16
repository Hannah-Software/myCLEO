import React, { createContext, useContext, useState } from 'react';
import { CleoMode, OrchestratorState, Phase } from '../src/types';

interface CleoContextType {
  mode: CleoMode;
  state: OrchestratorState | null;
  phase: Phase | null;
  loading: boolean;
}

const CleoContext = createContext<CleoContextType | undefined>(undefined);

export function CleoProvider({ children }: { children: React.ReactNode }) {
  const [mode] = useState<CleoMode>((process.env.CLEO_MODE as CleoMode) || 'commercial');
  const [state, setState] = useState<OrchestratorState | null>(null);
  const [loading, setLoading] = useState(true);

  return (
    <CleoContext.Provider value={{ mode, state, phase: state?.phase || null, loading }}>
      {children}
    </CleoContext.Provider>
  );
}

export function useCleo() {
  const context = useContext(CleoContext);
  if (!context) {
    throw new Error('useCleo must be used within CleoProvider');
  }
  return context;
}
