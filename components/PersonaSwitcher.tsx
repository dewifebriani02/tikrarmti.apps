'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePersona } from '@/hooks/usePersona';
import { UserRole, getPersonaLabel } from '@/lib/roles';
import {
  ShieldCheck,
  ClipboardCheck,
  GraduationCap,
  Award,
  BookOpen,
  User,
  ChevronDown,
  Check,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function getPersonaIcon(role: UserRole, className: string = 'w-4 h-4') {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return <ShieldCheck className={className} />;
    case 'musyrifah':
      return <ClipboardCheck className={className} />;
    case 'muallimah':
      return <GraduationCap className={className} />;
    case 'roisah':
    case 'raisah':
      return <Award className={className} />;
    case 'thalibah':
      return <BookOpen className={className} />;
    case 'calon_thalibah':
    default:
      return <User className={className} />;
  }
}

export function getPersonaColorClass(role: UserRole) {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    case 'musyrifah':
      return 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
    case 'muallimah':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    case 'roisah':
    case 'raisah':
      return 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100';
    case 'thalibah':
      return 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100';
    case 'calon_thalibah':
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100';
  }
}

interface PersonaSwitcherProps {
  variant?: 'header' | 'sidebar' | 'menu';
  className?: string;
}

export function PersonaSwitcher({ variant = 'header', className }: PersonaSwitcherProps) {
  const {
    activePersona,
    availablePersonas,
    setPersona,
    isMultiPersona,
    activePersonaLabel,
  } = usePersona();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Single persona non-interactive badge
  if (!isMultiPersona) {
    if (variant === 'sidebar') {
      return (
        <div
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium',
            getPersonaColorClass(activePersona),
            className
          )}
        >
          {getPersonaIcon(activePersona, 'w-4 h-4')}
          <span className="font-semibold">{activePersonaLabel}</span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shadow-xs',
          getPersonaColorClass(activePersona),
          className
        )}
      >
        {getPersonaIcon(activePersona, 'w-3.5 h-3.5')}
        <span>{activePersonaLabel}</span>
      </div>
    );
  }

  // 2. VARIANT: SIDEBAR CARD
  if (variant === 'sidebar') {
    return (
      <div className={cn('relative', className)} ref={dropdownRef}>
        <div className="bg-white/80 backdrop-blur-xs border border-gray-200/80 rounded-2xl p-2.5 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Mode Peran Aktif
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
              {availablePersonas.length} Peran
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 shadow-xs',
              getPersonaColorClass(activePersona)
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {getPersonaIcon(activePersona, 'w-4 h-4 shrink-0')}
              <span className="truncate">{activePersonaLabel}</span>
            </div>
            <ChevronDown
              className={cn('w-4 h-4 shrink-0 transition-transform duration-200 text-gray-500', {
                'rotate-180': isOpen,
              })}
            />
          </button>

          {/* Collapsible Dropdown */}
          {isOpen && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="text-[10px] text-gray-500 px-1 font-medium">Pilih Tampilan:</span>
              {availablePersonas.map((role) => {
                const isActive = role === activePersona;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setPersona(role);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors',
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getPersonaIcon(role, cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-gray-500'))}
                      <span className="truncate">{getPersonaLabel(role)}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-white ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. VARIANT: MENU (For inside user profile dropdown)
  if (variant === 'menu') {
    return (
      <div className={cn('py-2 border-t border-gray-100', className)}>
        <div className="px-3 py-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Ganti Mode Peran
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold">
            {activePersonaLabel}
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 px-1">
          {availablePersonas.map((role) => {
            const isActive = role === activePersona;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setPersona(role)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-2">
                  {getPersonaIcon(role, cn('w-4 h-4', isActive ? 'text-emerald-600' : 'text-gray-400'))}
                  <span>{getPersonaLabel(role)}</span>
                </div>
                {isActive && <Check className="w-4 h-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. VARIANT: HEADER (Default topbar interactive pill)
  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer',
          getPersonaColorClass(activePersona)
        )}
        title="Klik untuk berpindah peran/tampilan"
      >
        <span className="flex items-center gap-1.5">
          {getPersonaIcon(activePersona, 'w-3.5 h-3.5 shrink-0')}
          <span className="font-bold tracking-tight">{activePersonaLabel}</span>
        </span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 transition-transform duration-200 opacity-70', {
            'rotate-180': isOpen,
          })}
        />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200/80 p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1.5 mb-1 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Ganti Tampilan Peran
            </span>
            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin-hover" />
          </div>

          <div className="flex flex-col gap-1">
            {availablePersonas.map((role) => {
              const isActive = role === activePersona;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setPersona(role);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-all',
                    isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {getPersonaIcon(
                      role,
                      cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-gray-500')
                    )}
                    <span>{getPersonaLabel(role)}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
