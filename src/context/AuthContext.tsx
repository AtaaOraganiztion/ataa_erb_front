import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

// --------------------------
// TYPES
// --------------------------
interface User {
  userId: string;
  email: string;
  name: string;
  roles: string[];           // ← Will now include NID as well
  permissions?: string[];
  fullName?: string;
  avatar?: string | null;
  phoneNumber?: string | null;
  emailConfirmed?: boolean;
  lastLoginAt?: string;
  nid?: string;              // Keep nid separate for convenience
  age?: number;
  gender?: string | null;
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
  nid?: string;
}

// --------------------------
// CONTEXT
// --------------------------
export const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}`,
});

// --------------------------
// HELPER: Map API response + Add NID as a role
// --------------------------
const mapApiUser = (apiUser: any): User => {
  const baseRoles = apiUser.roles ?? [];

  // Add NID as a role if it exists (this is what you wanted)
  const rolesWithNid = apiUser.nid 
    ? [...baseRoles, apiUser.nid] 
    : baseRoles;

  return {
    userId: apiUser.id || apiUser.userId,
    email: apiUser.email,
    name: apiUser.name,
    fullName: apiUser.fullName || apiUser.name,
    roles: rolesWithNid,                    // ← Roles now include NID
    permissions: apiUser.permissions ?? [],
    avatar: apiUser.profileImage ?? apiUser.avatar ?? null,
    phoneNumber: apiUser.phoneNumber ?? null,
    emailConfirmed: apiUser.emailConfirmed ?? false,
    lastLoginAt: apiUser.lastLoginAt ?? null,
    nid: apiUser.nid ?? null,
    age: apiUser.age ?? 0,
    gender: apiUser.gender ?? null,
  };
};

// --------------------------
// PROVIDER
// --------------------------
function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Rehydrate from localStorage
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

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("expiresAtUtc");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  }, [navigate]);

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

      if (!response.ok) throw new Error((await response.text()) || "فشل تسجيل الدخول");

      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);

      if (data.expiresIn) {
        const expiresAt = new Date(Date.now() + data.expiresIn * 60 * 1000);
        localStorage.setItem("expiresAtUtc", expiresAt.toISOString());
      }

      const userData = mapApiUser(data.user || data);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // --------------------------
  // REGISTER (same logic)
  // --------------------------
  const register = async (fullName: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      if (!response.ok) throw new Error((await response.text()) || "فشل إنشاء الحساب");

      const data = await response.json();

      localStorage.setItem("accessToken", data.accessToken);

      if (data.expiresIn) {
        const expiresAt = new Date(Date.now() + data.expiresIn * 60 * 1000);
        localStorage.setItem("expiresAtUtc", expiresAt.toISOString());
      }

      const userData = mapApiUser(data.user || data);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Update user (re-apply NID as role if nid changes)
  const updateUser = async (userId: string, payload: UpdateUserPayload) => {
    try {
      const response = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.text()) || "فشل تحديث البيانات");

      const data = await response.json();
      const updatedUser = mapApiUser(data.user || data);   // This will re-add nid as role

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // Role & Permission helpers remain the same
  const hasRole = (role: string) => user?.roles?.includes(role) ?? false;
  const hasPermission = (permission: string) =>
    user?.permissions?.includes(permission) ?? false;
  const hasAnyPermission = (permissions: string[]) =>
    permissions.some((p) => user?.permissions?.includes(p)) ?? false;
  const hasAllPermissions = (permissions: string[]) =>
    permissions.every((p) => user?.permissions?.includes(p)) ?? false;

  const getUserRoles = async (userId: string): Promise<string[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}/roles`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("فشل جلب الصلاحيات");
      const data = await res.json();
      return data.roles ?? [];
    } catch {
      return [];
    }
  };

  const updateUserRoles = async (userId: string, roles: string[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/Api/V1/users/${userId}/roles`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ roles }),
      });

      if (!res.ok) throw new Error((await res.text()) || "فشل تحديث الصلاحيات");

      if (user?.userId === userId) {
        const updatedUser = { ...user, roles: [...roles, user.nid].filter(Boolean) as string[] };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

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

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthContextProvider");
  return ctx;
};

export default AuthContextProvider;