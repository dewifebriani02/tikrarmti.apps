import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireAdmin as rbacRequireAdmin, requireAuth as rbacRequireAuth } from '@/lib/rbac';

export async function requireAdmin(request: NextRequest) {
  const authErr = await rbacRequireAdmin();
  if (authErr) return authErr;
  return;
}

export async function requireAuth(request: NextRequest) {
  const authErr = await rbacRequireAuth();
  if (authErr) return authErr;
  return;
}
