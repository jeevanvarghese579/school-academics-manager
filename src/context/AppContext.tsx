import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/data/supabaseClient';
import { IndexedDbRepository } from '@/data/IndexedDbRepository';
import { SupabaseRepository } from '@/data/SupabaseRepository';
import type { DataRepository } from '@/data/DataRepository';
import type { StorageMode } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextValue {
  mode: StorageMode | null;
  setMode: (mode: StorageMode | null) => void;
  repo: DataRepository | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const MODE_KEY = 'sam-mode';

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<StorageMode | null>(() => {
    return (localStorage.getItem(MODE_KEY) as StorageMode | null) ?? null;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        if (!sess && mode === 'online') {
          // session expired
          setModeState(null);
          localStorage.removeItem(MODE_KEY);
        }
      })();
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [mode]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    })();
  }, []);

  const setMode = (m: StorageMode | null) => {
    setModeState(m);
    if (m) {
      localStorage.setItem(MODE_KEY, m);
    } else {
      localStorage.removeItem(MODE_KEY);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMode(null);
  };

  const repo = useMemo<DataRepository | null>(() => {
    if (!mode) return null;
    if (mode === 'offline') {
      return new IndexedDbRepository();
    }
    if (mode === 'online' && session) {
      return new SupabaseRepository(supabase);
    }
    return null;
  }, [mode, session]);

  // Initialize default settings on first use
  useEffect(() => {
    (async () => {
      if (!repo) return;
      try {
        const existing = await repo.getSettings();
        if (!existing) {
          const now = new Date().toISOString();
          await repo.saveSettings({
            ...DEFAULT_SETTINGS,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch {
        // ignore
      }
    })();
  }, [repo]);

  const value: AppContextValue = {
    mode,
    setMode,
    repo,
    session,
    user: session?.user ?? null,
    loading,
    signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
