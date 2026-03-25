import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { API_BASE_URL, parseApiResponse } from "@/lib/api";

export type UserRole = "admin" | "engineer" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
  lastLogin: string;
  topologiesCreated: number;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  department: string;
}

interface ProfilePayload {
  name: string;
  department: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: ProfilePayload) => Promise<User>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_STORAGE_KEY = "netforge_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const persistUser = (value: User | null) => {
    setUser(value);
    if (value) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const refreshUser = useCallback(async () => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    if (!saved) {
      setIsLoading(false);
      return;
    }

    try {
      const localUser = JSON.parse(saved) as User;
      const response = await fetch(`${API_BASE_URL}/users/${localUser.id}`);
      const freshUser = await parseApiResponse<User>(response);
      persistUser(freshUser);
    } catch (error) {
      console.error("Failed to refresh user session", error);
      persistUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const nextUser = await parseApiResponse<User>(response);
    persistUser(nextUser);
    return true;
  };

  const register = async (payload: RegisterPayload) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const nextUser = await parseApiResponse<User>(response);
    persistUser(nextUser);
    return true;
  };

  const updateProfile = async (payload: ProfilePayload) => {
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const updated = await parseApiResponse<User>(response);
    persistUser(updated);
    return updated;
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(`${API_BASE_URL}/users/${user.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    await parseApiResponse<{ success: boolean }>(response);
  };

  const logout = () => {
    persistUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
