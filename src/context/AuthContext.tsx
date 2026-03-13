import { createContext, useState, useEffect, useContext, useCallback } from "react";

// --------------------------
// TYPES
// --------------------------
interface User {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  permissions?: string[];
  fullName?: string;
  avatar?: string | null;
  phoneNumber?: string | null;
  emailConfirmed?: boolean;
  lastLoginAt?: string;
  nid?: string;
  age?: number;
  gender?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userId: string, data: UpdateUserPayload) => Promise<{ success: boolean; error?: string }>;
  getUserRoles: (userId: string) => Promise<string[]>;
  updateUserRoles: (userId: string, roles: string[]) => Promise<{ success: boolean; error?: string }>;
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
// HELPER: Map API response → User
// The API returns: { accessToken, expiresIn, user: { id, name, email, profileImage, roles, ... } }
// --------------------------
const mapApiUser = (apiUser: any): User => ({
  userId: apiUser.id,
  email: apiUser.email,
  name: apiUser.name,
  fullName: apiUser.name,           // alias for convenience
  roles: apiUser.roles ?? [],
  permissions: apiUser.permissions ?? [],
  avatar: apiUser.profileImage ?? null,
  phoneNumber: apiUser.phoneNumber ?? null,
  emailConfirmed: apiUser.emailConfirmed ?? false,
  lastLoginAt: apiUser.lastLoginAt ?? null,
  nid: apiUser.nid ?? null,
  age: apiUser.age ?? 0,
  gender: apiUser.gender ?? null,
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

  // --------------------------
  // LOGOUT
  // --------------------------
  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("expiresAtUtc");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Token expiration check — uses expiresIn (minutes) from API
  useEffect(() => {
    if (!isAuthenticated) return;

    const check = () => {
      const expiresAtUtc = localStorage.getItem("expiresAtUtc");
      if (expiresAtUtc && new Date(expiresAtUtc) <= new Date()) logout();
    };

    const interval = setInterval(check, 60_000);
    check();
    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  // --------------------------
  // LOGIN
  // Response shape:
  // { accessToken, expiresIn (minutes), tokenType, sessionState, user: { id, name, email, ... } }
  // --------------------------
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "فشل تسجيل الدخول");

      const data = await response.json();

      // Store token
      localStorage.setItem("accessToken", data.accessToken);

      // Calculate expiry from expiresIn (minutes) and store as UTC string
      if (data.expiresIn) {
        const expiresAt = new Date(Date.now() + data.expiresIn * 60 * 1000);
        localStorage.setItem("expiresAtUtc", expiresAt.toISOString());
      }

      // Map and store user — data.user is the nested object from API
      const userData = mapApiUser(data.user);
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
  const register = async (fullName: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "فشل إنشاء الحساب");

      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);

      if (data.expiresIn) {
        const expiresAt = new Date(Date.now() + data.expiresIn * 60 * 1000);
        localStorage.setItem("expiresAtUtc", expiresAt.toISOString());
      }

      const userData = mapApiUser(data.user);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
        throw new Error((await response.text()) || "فشل تحديث البيانات");

      const data = await response.json();

      // Re-map in case API returns full user object again
      const updatedUser: User = data.user
        ? mapApiUser(data.user)
        : { ...user!, ...payload, fullName: payload.fullName ?? user!.fullName };

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
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}/roles`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("فشل جلب الصلاحيات");

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
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}/roles`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ roles }),
      });

      if (!response.ok)
        throw new Error((await response.text()) || "فشل تحديث الصلاحيات");

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
  const hasPermission = (permission: string) => user?.permissions?.includes(permission) ?? false;
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