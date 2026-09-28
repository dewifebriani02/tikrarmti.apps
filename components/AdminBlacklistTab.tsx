'use client';

import { useState } from 'react';
import { ShieldAlert, RefreshCw, Ban, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminBlacklist } from '@/hooks/useAdminBlacklist';
import { BlacklistStats } from './blacklist/BlacklistStats';
import { BlacklistTable } from './blacklist/BlacklistTable';
import { BlacklistModals } from './blacklist/BlacklistModals';
import { AdminRekapChatDisiplinModal } from './AdminRekapChatDisiplinModal';

export function AdminBlacklistTab() {
  const [isRekapChatOpen, setIsRekapChatOpen] = useState(false);
  const {
    blacklistedUsers, isLoading, search, setSearch, currentPage, setCurrentPage, totalPages, totalItems,
    isAddModalOpen, setIsAddModalOpen, isDetailModalOpen, setIsDetailModalOpen, selectedUser, setSelectedUser,
    addForm, setAddForm, isSubmitting, fetchBlacklist, handleAddToBlacklist, handleRemoveFromBlacklist, monthStats
  } = useAdminBlacklist();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-600" /> Manajemen Blacklist
          </h2>
          <p className="text-gray-600 mt-1">Kelola user yang di-blacklist dari pendaftaran</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRekapChatOpen(true)} variant="outline" className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            <MessageSquare className="h-4 w-4" /> Template Rekap Chat WA
          </Button>
          <Button onClick={() => fetchBlacklist()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 hover:bg-red-700 gap-2">
            <Ban className="h-4 w-4" /> Tambah ke Blacklist
          </Button>
        </div>
      </div>

      {/* Stats */}
      <BlacklistStats totalItems={totalItems} monthStats={monthStats} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari berdasarkan email, WhatsApp, atau nama..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Blacklist Table */}
      <BlacklistTable
        blacklistedUsers={blacklistedUsers}
        isLoading={isLoading}
        search={search}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onViewDetails={(user) => { setSelectedUser(user); setIsDetailModalOpen(true); }}
        onRemove={handleRemoveFromBlacklist}
      />

      {/* Modals */}
      <BlacklistModals
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        addForm={addForm}
        setAddForm={setAddForm}
        isSubmitting={isSubmitting}
        onAdd={handleAddToBlacklist}
        isDetailModalOpen={isDetailModalOpen}
        setIsDetailModalOpen={setIsDetailModalOpen}
        selectedUser={selectedUser}
        onRemove={handleRemoveFromBlacklist}
      />

      <AdminRekapChatDisiplinModal
        isOpen={isRekapChatOpen}
        onClose={() => setIsRekapChatOpen(false)}
      />
    </div>
  );
}
