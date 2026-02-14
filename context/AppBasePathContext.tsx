'use client';

import { createContext, useContext } from 'react';

const AppBasePathContext = createContext<string>('/app');

export function AppBasePathProvider({
  children,
  basePath,
}: {
  children: React.ReactNode;
  basePath: string;
}) {
  return (
    <AppBasePathContext.Provider value={basePath}>
      {children}
    </AppBasePathContext.Provider>
  );
}

export function useAppBasePath(): string {
  return useContext(AppBasePathContext);
}
