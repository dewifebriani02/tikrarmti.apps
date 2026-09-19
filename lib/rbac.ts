/**
 * ROLE-BASED ACCESS CONTROL (RBAC) UTILITIES
 *
 * Provides consistent authorization checks across the application.
 * Direct integration with native PostgreSQL (mti_db) session layer.
 */

import { getCurrentUser } from '@/lib/auth';
import { getOwnerEmails } from '@/lib/env';
import { NextResponse } from 'next/server';
import {
  ADMIN_RANK,
  STAFF_RANK_THRESHOLD,
  MANAGEMENT_RANK_THRESHOLD,
  getRoleRank,
  isAdmin,
  consolidateRoles,
  type UserRole
} from '@/lib/roles';
import { ApiResponses } from '@/lib/api-responses';
import { HTTP_STATUS } from '@/lib/api-wrapper';

// =====================================================
// AUTHORIZATION RESULT TYPES
// =====================================================

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    roles: string[];
    primaryRole: string;
  };
  error?: string;
}

export interface AuthorizationContext {
  userId: string;
  email: string;
  roles: string[];
  primaryRole: string;
  rank: number;
}

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

/**
 * Get authenticated user from session.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const ownerEmails = getOwnerEmails();
    const rawRoles = [...(user.roles || [])];
    if (user.role) rawRoles.push(user.role);

    const distinctRoles = consolidateRoles(rawRoles, user.email, ownerEmails);
    const primaryRole = distinctRoles.sort((a, b) => getRoleRank(b) - getRoleRank(a))[0] || 'thalibah';

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        roles: distinctRoles,
        primaryRole,
      }
    };
  } catch {
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get full user authorization context including roles.
 */
export async function getAuthorizationContext(options?: { response?: NextResponse }): Promise<AuthorizationContext | null> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    // Consolidate roles with owner fallback
    const ownerEmails = getOwnerEmails();
    const rawRoles = [...(user.roles || [])];
    if (user.role) rawRoles.push(user.role);

    const distinctRoles = consolidateRoles(rawRoles, user.email, ownerEmails);
    const primaryRole = distinctRoles.sort((a, b) => getRoleRank(b) - getRoleRank(a))[0] || 'thalibah';

    return {
      userId: user.id,
      email: user.email || '',
      roles: distinctRoles,
      primaryRole,
      rank: getRoleRank(primaryRole)
    };
  } catch (error: any) {
    console.error('[RBAC] Unexpected context error:', error.message || error);
    return null;
  }
}

// =====================================================
// AUTHORIZATION CHECKS
// =====================================================

/**
 * Check if user has required role.
 */
export function hasRole(context: AuthorizationContext, requiredRole: UserRole): boolean {
  return context.roles.includes(requiredRole);
}

/**
 * Check if user has any of the required roles.
 */
export function hasAnyRole(context: AuthorizationContext, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => context.roles.includes(role));
}

/**
 * Check if user has minimum required rank.
 */
export function hasMinimumRank(context: AuthorizationContext, minRank: number): boolean {
  return context.rank >= minRank;
}

/**
 * Check if user is admin (has admin role or is owner).
 */
export function isUserAdmin(context: AuthorizationContext): boolean {
  return hasRole(context, 'admin');
}

/**
 * Check if user can access admin panel (admin only in this system).
 */
export function canAccessAdminPanel(context: AuthorizationContext): boolean {
  return isUserAdmin(context);
}

// =====================================================
// API ROUTE MIDDLEWARE HELPERS
// =====================================================

/**
 * Protect API route - require authentication.
 */
export async function requireAuth(response?: NextResponse) {
  const context = await getAuthorizationContext({ response });

  if (!context) {
    return ApiResponses.unauthorized('Authentication required');
  }

  return null;
}

/**
 * Protect API route - require specific role.
 */
export async function requireRole(requiredRole: UserRole, response?: NextResponse) {
  const context = await getAuthorizationContext({ response });

  if (!context) {
    return ApiResponses.unauthorized('Authentication required');
  }

  if (!hasRole(context, requiredRole)) {
    return ApiResponses.forbidden(`Requires ${requiredRole} role`);
  }

  return null;
}

/**
 * Protect API route - require any of the specified roles.
 */
export async function requireAnyRole(requiredRoles: UserRole[], response?: NextResponse) {
  const context = await getAuthorizationContext({ response });

  if (!context) {
    return ApiResponses.unauthorized('Authentication required');
  }

  if (!hasAnyRole(context, requiredRoles)) {
    return ApiResponses.forbidden(`Requires one of: ${requiredRoles.join(', ')}`);
  }

  return null;
}

/**
 * Protect API route - require minimum rank.
 */
export async function requireMinimumRank(minRank: number, response?: NextResponse) {
  const context = await getAuthorizationContext({ response });

  if (!context) {
    return ApiResponses.unauthorized('Authentication required');
  }

  if (!hasMinimumRank(context, minRank)) {
    return ApiResponses.forbidden('Insufficient permissions');
  }

  return null;
}

/**
 * Protect API route - require admin access.
 */
export async function requireAdmin(response?: NextResponse) {
  return requireRole('admin', response);
}

// =====================================================
// SERVER ACTION HELPERS
// =====================================================

export async function validateActionAuth(requiredRole?: UserRole): Promise<AuthorizationContext> {
  const context = await getAuthorizationContext();
  if (!context) {
    throw new Error('Unauthorized - Please login');
  }
  if (requiredRole && !hasRole(context, requiredRole)) {
    throw new Error(`Forbidden - Requires ${requiredRole} role`);
  }
  return context;
}

export async function validateActionRole(requiredRole: UserRole): Promise<AuthorizationContext> {
  const context = await validateActionAuth();
  if (!hasRole(context, requiredRole)) {
    throw new Error(`Forbidden - Requires ${requiredRole} role`);
  }
  return context;
}

export async function validateActionAnyRole(requiredRoles: UserRole[]): Promise<AuthorizationContext> {
  const context = await validateActionAuth();
  if (!hasAnyRole(context, requiredRoles)) {
    throw new Error(`Forbidden - Requires one of: ${requiredRoles.join(', ')}`);
  }
  return context;
}

export async function validateActionAdmin(): Promise<AuthorizationContext> {
  return validateActionRole('admin');
}

// Aliases for compatibility
export const validateServerActionAuth = validateActionAuth;
export const validateServerActionRole = validateActionRole;
export const validateServerActionAnyRole = validateActionAnyRole;
export const validateServerActionAdmin = validateActionAdmin;

