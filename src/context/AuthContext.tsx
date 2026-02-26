import { createContext, useState, useEffect, useContext } from "react";

// --------------------------
// TYPES
// --------------------------
interface User {
  userId: string;
  email: string;
  roles: string[];
  permissions?: string[];
  fullName?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (
    userId: string,
    data: UpdateUserPayload,
  ) => Promise<{ success: boolean; error?: string }>;
  getUserRoles: (userId: string) => Promise<string[]>;
  updateUserRoles: (
    userId: string,
    roles: string[],
  ) => Promise<{ success: boolean; error?: string }>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
}

// --------------------------
// CONTEXT
// --------------------------
export const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_URL;

// --------------------------
// HELPER: Get auth headers
// --------------------------
const getAuthHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
});

// --------------------------
// PROVIDER
// --------------------------
function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  // Token expiration check
  useEffect(() => {
    if (!isAuthenticated) return;

    const check = () => {
      const expiresAtUtc = localStorage.getItem("expiresAtUtc");
      if (expiresAtUtc && new Date(expiresAtUtc) <= new Date()) logout();
    };

    const interval = setInterval(check, 60_000);
    check();
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // --------------------------
  // LOGIN
  // --------------------------
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "Login failed");

      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);
      if (data.expiresAtUtc)
        localStorage.setItem("expiresAtUtc", data.expiresAtUtc);

      const userData: User = {
        userId: data.userId,
        email: data.email,
        roles: data.roles ?? [],
        permissions: data.permissions ?? [],
        fullName: data.fullName,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  // --------------------------
  // REGISTER
  // --------------------------
  const register = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "Registration failed");

      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);
      if (data.expiresAtUtc)
        localStorage.setItem("expiresAtUtc", data.expiresAtUtc);

      const userData: User = {
        userId: data.userId,
        email: data.email,
        roles: data.roles ?? [],
        permissions: data.permissions ?? [],
        fullName: data.fullName ?? fullName,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  // --------------------------
  // LOGOUT
  // --------------------------
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("expiresAtUtc");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  };

  // --------------------------
  // UPDATE USER
  // --------------------------
  const updateUser = async (userId: string, payload: UpdateUserPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "Update failed");

      const data = await response.json();

      // Sync local user state
      const updatedUser: User = { ...user!, ...data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  // --------------------------
  // GET USER ROLES
  // --------------------------
  const getUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/Api/V1/users/${userId}/roles`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) throw new Error("Failed to fetch roles");

      const data = await response.json();
      return data.roles ?? data ?? [];
    } catch {
      return [];
    }
  };

  // --------------------------
  // UPDATE USER ROLES
  // --------------------------
  const updateUserRoles = async (userId: string, roles: string[]) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/Api/V1/users/${userId}/roles`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ roles }),
        },
      );

      if (!response.ok)
        throw new Error((await response.text()) || "Failed to update roles");

      // Sync roles in local state if updating current user
      if (user?.userId === userId) {
        const updatedUser = { ...user, roles };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

  // --------------------------
  // PERMISSION / ROLE HELPERS
  // --------------------------
  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  const hasPermission = (permission: string) =>
    user?.permissions?.includes(permission) ?? false;
  const hasAnyPermission = (permissions: string[]) =>
    permissions.some((p) => user?.permissions?.includes(p)) ?? false;
  const hasAllPermissions = (permissions: string[]) =>
    permissions.every((p) => user?.permissions?.includes(p)) ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateUser,
        getUserRoles,
        updateUserRoles,
        hasRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --------------------------
// HOOK
// --------------------------
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthContextProvider");
  return ctx;
};

export default AuthContextProvider;
