/**
 * Secure JWT Token & Session Storage Manager
 * Stores tokens securely, handles expiration checks and role/permission parsing.
 */

export interface UserSession {
  userId: string;
  username: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  token: string;
  expiresAt: number;
}

const TOKEN_KEY = 'educenter_access_token';
const USER_KEY = 'educenter_user_session';

export const authStorage = {
  /**
   * Saves JWT and user session metadata.
   */
  saveSession: (token: string, user: Omit<UserSession, 'token'>, rememberMe: boolean = false) => {
    try {
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify({ ...user, token }));
      
      // Also set a secure cookie for Next.js middleware if in browser environment
      const maxAge = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 12; // 7 days or 12 hours
      document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;
    } catch (e) {
      console.error('Failed to save session to storage', e);
    }
  },

  /**
   * Retrieves the stored access token.
   */
  getToken: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Retrieves user session and checks whether token has expired.
   */
  getUser: (): UserSession | null => {
    try {
      const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      if (!raw) return null;

      const session: UserSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        authStorage.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Clears all session tokens and cookies.
   */
  clearSession: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  },

  /**
   * Checks if user has a specific permission.
   */
  hasPermission: (permission: string): boolean => {
    const user = authStorage.getUser();
    if (!user) return false;
    if (user.roles.includes('SUPER_ADMIN')) return true;
    return user.permissions.includes(permission);
  }
};
