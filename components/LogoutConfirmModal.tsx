'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoggingOut: boolean;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoggingOut
}: LogoutConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md border-none shadow-2xl rounded-[2rem] overflow-hidden p-0">
        <div className="bg-gradient-to-br from-red-600 to-rose-700 p-5 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-red-400/20 rounded-full blur-xl" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 shadow-inner border border-white/20">
              <LogOut className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight text-white m-0">Konfirmasi Keluar</DialogTitle>
          </div>
        </div>
        
        <div className="p-6 bg-white">
          <DialogDescription className="text-gray-600 text-center text-base font-medium leading-relaxed">
            Apakah <span className="text-red-600 font-bold italic">Ukhti</span> yakin ingin keluar dari aplikasi?
          </DialogDescription>
          
          <div className="mt-4 p-4 bg-red-50 rounded-2xl flex items-start gap-3 border border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-700 leading-relaxed font-semibold">
              Pastikan Ukhti sudah menyimpan semua progress hafalan dan jurnal harian hari ini sebelum keluar.
            </p>
          </div>

          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoggingOut}
              className="flex-1 rounded-xl h-11 font-bold text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-all text-xs"
            >
              Bismillah, Tetap di Sini
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="flex-1 rounded-xl h-11 font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-xs"
            >
              {isLoggingOut ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Ya, Keluar Aplikasi'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
