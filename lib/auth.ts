/**
 * Authentication utilities for client-side auth management
 */

export interface User {
  username: string;
  applications?: string[];
}

export interface AuthTokens {
  token: string;
  user: User;
}

/**
 * Get the auth token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Get user data from localStorage
 */
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  
  const username = localStorage.getItem("username");
  const applicationsStr = localStorage.getItem("applications");
  
  if (!username) return null;
  
  return {
    username,
    applications: applicationsStr ? JSON.parse(applicationsStr) : [],
  };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Save auth tokens to localStorage
 */
export function setAuth(token: string, user: User): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem("token", token);
  localStorage.setItem("username", user.username);
  if (user.applications) {
    localStorage.setItem("applications", JSON.stringify(user.applications));
  }
}

/**
 * Clear auth tokens from localStorage
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("applications");
}

/**
 * Verify token is valid by making a test request
 */
export async function verifyToken(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
