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

// ✅ JWT base64url safe decode
const decodeBase64Url = (input: string) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return atob(padded)
}

export const decodeToken = (): AuthPayload | null => {
  const token = getToken()
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    const decoded = decodeBase64Url(payload)
    return JSON.parse(decoded) as AuthPayload
  } catch (error) {
    console.error('Failed to decode token', error)
    return null
  }
}

export const getUserRole = (): UserRole | undefined => {
  const payload = decodeToken()
  return payload?.role
}

export const isRoleAllowed = (
  role: UserRole | undefined,
  allowedRoles?: UserRole[],
) => {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return !!role && allowedRoles.includes(role)
}

/**
 * Retrieves the current authenticated user from localStorage.
 * The backend sends the user object in the login/register response.
 * Returns null if not logged in or if the stored data is invalid.
 */
export function getCurrentUser(): AuthPayload | null {
  if (typeof window === 'undefined') return null

  const raw = localStorage.getItem('user')
  const tokenPayload = decodeToken()
  if (!raw) return tokenPayload

  try {
    const parsed = JSON.parse(raw) as AuthPayload
    // Basic validation
    if (!parsed.userId || !parsed.email) return tokenPayload

    return {
      ...parsed,
      role: parsed.role ?? tokenPayload?.role,
      roles: parsed.roles ?? tokenPayload?.roles,
      permissions: parsed.permissions ?? tokenPayload?.permissions,
      employeeId: parsed.employeeId ?? tokenPayload?.employeeId,
      departmentId: parsed.departmentId ?? tokenPayload?.departmentId,
      positionId: (parsed as any).positionId ?? (tokenPayload as any)?.positionId,
    }
  } catch {
    return tokenPayload
  }
}

/**
 * Checks if the current user has at least one of the required roles.
 * ✅ Checks both role + roles[]
 */
export function hasAnyRole(requiredRoles: string[]): boolean {
  const user = getCurrentUser()
  if (!user) return false

  const roles = [user.role, ...(user.roles ?? [])].filter(Boolean) as string[]
  return requiredRoles.some((r) => roles.includes(r))
}

/**
 * Clears all authentication data from localStorage.
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  localStorage.removeItem('access_token')
  clearToken()
  // Clean up legacy keys if they exist
  localStorage.removeItem('systemRoles')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userName')
}
