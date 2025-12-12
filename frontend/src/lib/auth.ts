'use client'

import { AuthPayload, UserRole } from '@/types/auth'

export const TOKEN_KEY = 'hr_token'

export const saveToken = (token: string) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export const clearToken = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export const decodeToken = (): AuthPayload | null => {
  const token = getToken()
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    const decoded = atob(payload)
    return JSON.parse(decoded) as AuthPayload
  } catch (error) {
    console.error('Failed to decode token', error)
    return null
  }
}

export const getUserRole = (): UserRole | undefined => {
  const payload = decodeToken()
  const role = payload?.role
  return role
}

export const isRoleAllowed = (role: UserRole | undefined, allowedRoles?: UserRole[]) => {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return !!role && allowedRoles.includes(role)
}

/**
 * Retrieves the current authenticated user from localStorage.
 * The backend sends the user object in the login/register response.
 * Returns null if not logged in or if the stored data is invalid.
 */
export function getCurrentUser(): AuthPayload | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem('user');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthPayload;
    // Basic validation
    if (!parsed.userId || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks if the current user has at least one of the required roles.
 */
export function hasAnyRole(requiredRoles: string[]): boolean {
  const user = getCurrentUser();
  if (!user || !user.role) return false;
  return requiredRoles.includes(user.role);
}

/**
 * Clears all authentication data from localStorage.
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
  clearToken();
  // Clean up legacy keys if they exist
  localStorage.removeItem('systemRoles');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
}
