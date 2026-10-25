'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserRole,
  getAvailablePersonas,
  getPersonaLabel,
  getRoleRank,
  ROLE_RANKS,
} from '@/lib/roles';

interface PersonaContextValue {
  activePersona: UserRole;
  availablePersonas: UserRole[];
  setPersona: (persona: UserRole) => void;
  isMultiPersona: boolean;
  activePersonaLabel: string;
  // Convenience boolean helpers based on the CURRENT active persona
  isAdminPersona: boolean;
  isMusyrifahPersona: boolean;
  isMuallimahPersona: boolean;
  isRaisahPersona: boolean;
  isThalibahPersona: boolean;
  isStaffPersona: boolean; // Admin, Musyrifah, or Muallimah
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

const STORAGE_KEY = 'mti_active_persona';

interface PersonaProviderProps {
  roles?: string[] | null;
  primaryRole?: string | null;
  children: React.ReactNode;
}

export function PersonaProvider({ roles, primaryRole, children }: PersonaProviderProps) {
  // 1. Calculate available personas from the user's assigned roles
  const availablePersonas = useMemo(() => {
    return getAvailablePersonas(roles);
  }, [roles]);

  // 2. Initialize active persona
  const [activePersona, setActivePersonaState] = useState<UserRole>(() => {
    // Highest rank persona as default fallback
    const fallback = (availablePersonas[0] || (primaryRole as UserRole) || 'thalibah') as UserRole;
    return fallback;
  });

  // 3. Hydrate from localStorage once mounted
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (saved && availablePersonas.includes(saved)) {
        setActivePersonaState(saved);
      } else {
        // If saved persona is invalid or not in available personas, fallback to highest
        const defaultRole = availablePersonas[0] || 'thalibah';
        setActivePersonaState(defaultRole);
        localStorage.setItem(STORAGE_KEY, defaultRole);
      }
    } catch {
      // Storage access failure safe fallback
    }
  }, [availablePersonas]);

  // 4. Setter with persistence (localStorage + cookie for server sync)
  const setPersona = useCallback(
    (persona: UserRole) => {
      if (!availablePersonas.includes(persona)) {
        console.warn(`[Persona] Persona "${persona}" is not in available personas:`, availablePersonas);
        return;
      }

      setActivePersonaState(persona);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, persona);
          // Set a cookie so Server Components or SSR can also read if needed
          document.cookie = `mti_active_persona=${persona}; path=/; max-age=31536000; SameSite=Lax`;
        } catch (e) {
          console.warn('[Persona] Could not persist persona:', e);
        }
      }
    },
    [availablePersonas]
  );

  // 5. Convenience flags
  const isMultiPersona = availablePersonas.length > 1;
  const activePersonaLabel = getPersonaLabel(activePersona);

  const isAdminPersona = activePersona === 'admin' || activePersona === 'super_admin';
  const isMusyrifahPersona = activePersona === 'musyrifah';
  const isMuallimahPersona = activePersona === 'muallimah';
  const isRaisahPersona = activePersona === 'raisah' || activePersona === 'roisah';
  const isThalibahPersona = activePersona === 'thalibah' || activePersona === 'calon_thalibah';
  const isStaffPersona = isAdminPersona || isMusyrifahPersona || isMuallimahPersona;

  const value = useMemo<PersonaContextValue>(
    () => ({
      activePersona,
      availablePersonas,
      setPersona,
      isMultiPersona,
      activePersonaLabel,
      isAdminPersona,
      isMusyrifahPersona,
      isMuallimahPersona,
      isRaisahPersona,
      isThalibahPersona,
      isStaffPersona,
    }),
    [
      activePersona,
      availablePersonas,
      setPersona,
      isMultiPersona,
      activePersonaLabel,
      isAdminPersona,
      isMusyrifahPersona,
      isMuallimahPersona,
      isRaisahPersona,
      isThalibahPersona,
      isStaffPersona,
    ]
  );

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const context = useContext(PersonaContext);
  if (!context) {
    // Safe fallback if used outside PersonaProvider
    return {
      activePersona: 'thalibah',
      availablePersonas: ['thalibah'],
      setPersona: () => {},
      isMultiPersona: false,
      activePersonaLabel: 'Thalibah',
      isAdminPersona: false,
      isMusyrifahPersona: false,
      isMuallimahPersona: false,
      isRaisahPersona: false,
      isThalibahPersona: true,
      isStaffPersona: false,
    };
  }
  return context;
}

export default PersonaContext;
