import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Filter,
  Edit,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ClipboardList,
  CheckSquare,
  XSquare,
  AlertCircle,
  Plane,
  Monitor,
  FileText,
  LogIn,
  LogOut,
  Clock,
  Timer,
  ShieldCheck,
  User,
  Calendar,
} from "lucide-react";
import type { QueryKey } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserMapValue = {
  name: string;
  email: string;
};
type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "OnLeave"
  | "WorkFromHome";

interface Attendance {
  id: string;
  employeeId?: string;
  employeeFullName?: string;
  sectorId?: string | null;
  sectorName?: string | null;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  hoursToWork?: number;
  hoursWorked?: number;
  status: AttendanceStatus | number;
  isConfirmed?: boolean;
  notes?: string | null;
  userId?: string | null;
}

interface StoredUser {
  userId: string;
  fullName: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  avatar?: string | null;
  age?: number;
  gender?: string | null;
  phoneNumber?: string;
  nid?: string;
}
interface ApiUser {
  id: string;
  name: string;
  phone: string; // This field actually contains the email
  email: string; // This field actually contains the phone number
  nid?: string;
  age?: number;
  gender?: string | null;
  status?: string;
}

interface StatusPatchData {
  id: string;
  status: AttendanceStatus;
  notes: string;
  record: Attendance;
}

// ─── Device Detection Utilities ───────────────────────────────────────────────
type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

interface DeviceInfo {
  type: DeviceType;
  os?: string;
  browser?: string;
  model?: string;
  userAgent: string;
}

function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  const tabletPatterns =
    /tablet|ipad|playbook|silk|kindle|(android(?!.*mobile))/i;
  if (tabletPatterns.test(ua)) return "tablet";
  const mobilePatterns =
    /mobile|iphone|ipod|blackberry|opera mini|opera mobi|android.*mobile|windows phone|iemobile|webos|incognito|mate|pixel|galaxy|nexus|xiaomi|oppo|vivo|huawei|realme|oneplus|nokia/i;
  if (mobilePatterns.test(ua)) return "mobile";
  return "desktop";
}

function detectOS(userAgent: string): string | undefined {
  const ua = userAgent.toLowerCase();
  if (ua.includes("win")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad"))
    return "iOS";
  return undefined;
}

function detectBrowser(userAgent: string): string | undefined {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("chrome") && !ua.includes("edg")) return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  return undefined;
}

function detectDeviceModel(userAgent: string): string | undefined {
  const ua = userAgent;
  // iPhone model detection (e.g., "iPhone14,2" or "iPhone 13 Pro")
  const iphoneMatch =
    ua.match(/iPhone(\d+,\d+)/i) || ua.match(/iPhone\s+(\w+\s?\w*)/i);
  if (iphoneMatch) return `iPhone ${iphoneMatch[1]}`;
  // iPad model
  const ipadMatch = ua.match(/iPad(\d+,\d+)/i);
  if (ipadMatch) return `iPad ${ipadMatch[1]}`;
  // Android model (e.g., "SM-G973F" or "Pixel 4")
  const androidMatch = ua.match(/Android; [^;]+; ([^;)]+)/);
  if (androidMatch) return androidMatch[1].trim();
  // Generic mobile device detection fallback
  if (detectDeviceType(ua) === "mobile") return "هاتف محمول";
  if (detectDeviceType(ua) === "tablet") return "جهاز لوحي";
  return undefined;
}

function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  return {
    type: detectDeviceType(userAgent),
    os: detectOS(userAgent),
    browser: detectBrowser(userAgent),
    model: detectDeviceModel(userAgent),
    userAgent,
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusCfg {
  label: string;
  cls: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<AttendanceStatus, StatusCfg> = {
  Present: {
    label: "حاضر",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckSquare,
  },
  Absent: {
    label: "غائب",
    cls: "bg-red-50 text-red-600 border-red-200",
    icon: XSquare,
  },
  Late: {
    label: "متأخر",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: AlertCircle,
  },
  OnLeave: {
    label: "إجازة",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    icon: Plane,
  },
  WorkFromHome: {
    label: "عمل عن بُعد",
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Monitor,
  },
};

const FALLBACK_CFG: StatusCfg = {
  label: "—",
  cls: "bg-gray-100 text-gray-600 border-gray-200",
  icon: FileText,
};

const API_BASE = import.meta.env.VITE_API_URL as string;
const QUERY_KEY = ["attendance"] as const;
const USERS_QUERY_KEY = ["users-map"] as const;
const CLOCK_IN_ID_KEY = "attendance_clockin_id";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalize = <T,>(raw: unknown): T[] =>
  Array.isArray(raw)
    ? (raw as T[])
    : (((raw as any)?.data ?? (raw as any)?.items ?? []) as T[]);

/** Today as YYYY-MM-DD in LOCAL time */
const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Returns current time in Egypt (UTC+2 / UTC+3) as UTC ISO string with Z */
const nowISO = (): string => {
  const now = new Date();
  const egyptOffset = 2;
  const utcTime = new Date(now.getTime() + egyptOffset * 60 * 60 * 1000);
  return utcTime.toISOString();
};

/** Return the date part (YYYY-MM-DD) of an ISO string, interpreted as local date */
const toLocalDate = (iso: string): string => {
  if (!iso) return "";
  return iso.split("T")[0];
};

const getStoredUser = (): StoredUser | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isAdmin = (user: StoredUser | null): boolean =>
  !!user?.roles?.some((r) => r.toLowerCase() === "admin");

const saveClockInEntry = (id: string, checkInTime: string) => {
  localStorage.setItem(
    CLOCK_IN_ID_KEY,
    JSON.stringify({ id, checkInTime, date: todayLocal() }),
  );
};

const getTodayClockInEntry = (): { id: string; checkInTime: string } | null => {
  try {
    const raw = localStorage.getItem(CLOCK_IN_ID_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.date === todayLocal()) return entry;
    return null;
  } catch {
    return null;
  }
};

const clearClockInEntry = () => localStorage.removeItem(CLOCK_IN_ID_KEY);

const calcHoursWorked = (checkIn: string, checkOut: string): number => {
  const diff =
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 1000;
  return Math.max(0, parseFloat((diff / 3600).toFixed(2)));
};

const formatElapsed = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const resolveStatus = (status: AttendanceStatus | number): AttendanceStatus => {
  if (typeof status === "string" && status in STATUS_CONFIG)
    return status as AttendanceStatus;
  return "Present";
};

const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── API ──────────────────────────────────────────────────────────────────────

const authFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<any> => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchAttendance = (
  params: Record<string, string> = {},
): Promise<unknown> => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(
    `${API_BASE}/Api/V1/Attendance/Get-All${qs ? `?${qs}` : ""}`,
  );
};

const fetchAllUsers = async (): Promise<Map<string, UserMapValue>> => {
  const raw = await authFetch(
    `${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=1000`,
  );
  const list: ApiUser[] = normalize<ApiUser>(raw);
  return new Map<string, UserMapValue>(
    list.map((u) => [
      u.id,
      {
        name: u.name || "Unknown User",
        email: u.email || "—",
      },
    ]),
  );
};

/**
 * Clock In — POST /Add
 * Sends a proper UTC ISO timestamp and optional notes (device info).
 */
const apiClockIn = (userId: string, notes?: string): Promise<string> => {
  const checkInTime = nowISO();
  const body: any = { date: checkInTime, checkInTime, userId };
  if (notes) body.notes = notes;
  console.log("Clock-in API called with body:", body);

  return authFetch(`${API_BASE}/Api/V1/Attendance/Add`, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

/** Patch status — PUT /{id}/status */
const apiPatchStatus = ({
  id,
  status,
  notes,
  record,
}: StatusPatchData): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Attendance/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      checkOutTime: record.checkOutTime ?? undefined,
      status,
      notes: notes || undefined,
      userId: record.userId ?? undefined,
    }),
  });

// ─── Sub-components (unchanged except for new imports) ────────────────────────

const StatusBadge = ({ status }: { status: AttendanceStatus | number }) => {
  const resolved = resolveStatus(status);
  const cfg = STATUS_CONFIG[resolved] ?? FALLBACK_CFG;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <Icon size={11} />
      {cfg.label || resolved}
    </span>
  );
};

// ─── User Info Card (unchanged) ───────────────────────────────────────────────

const UserInfoCard = ({ user }: { user: StoredUser }) => {
  const admin = isAdmin(user);
  const displayName = user.fullName || user.name || "—";
  const initials = displayName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-[#B8976B]/10 p-5 shadow-sm flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-[#1B5E4F] text-base">{displayName}</p>
          {admin ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              <ShieldCheck size={10} />
              مدير النظام
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
              <User size={10} />
              موظف
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
        {user.phoneNumber && (
          <p className="text-xs text-gray-400 mt-0.5" dir="ltr">
            {user.phoneNumber}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-[10px] font-bold text-[#1B5E4F]/50 uppercase tracking-widest mb-1">
          صلاحية العرض
        </p>
        <p className="text-xs font-semibold text-[#1B5E4F]">
          {admin ? "جميع السجلات" : "سجلاتي فقط"}
        </p>
      </div>
    </div>
  );
};

// ─── Live Elapsed Timer (unchanged) ───────────────────────────────────────────

const ElapsedTimer = ({ checkInTime }: { checkInTime: string }) => {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = new Date(checkInTime).getTime();
    const tick = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [checkInTime]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-emerald-200 border border-emerald-500/30"
      dir="ltr"
    >
      <Timer size={12} className="animate-pulse" />
      <span className="font-mono tracking-widest">
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
};

// ─── Clock In / Out Card (unchanged) ──────────────────────────────────────────

interface ClockCardProps {
  userName: string;
  activeSession: Attendance | undefined;
  clockingIn: boolean;
  clockingOut: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

const ClockCard = ({
  userName,
  activeSession,
  clockingIn,
  clockingOut,
  onClockIn,
  onClockOut,
}: ClockCardProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hasCheckedIn = !!activeSession?.checkInTime;
  const hasCheckedOut = !!activeSession?.checkOutTime;
  const checkInStr = activeSession?.checkInTime
    ? fmtTime(activeSession.checkInTime)
    : null;
  const checkOutStr = activeSession?.checkOutTime
    ? fmtTime(activeSession.checkOutTime)
    : null;
  const hoursWorked =
    activeSession?.checkInTime && activeSession?.checkOutTime
      ? calcHoursWorked(activeSession.checkInTime, activeSession.checkOutTime)
      : (activeSession?.hoursWorked ?? 0);

  const canClockIn = !hasCheckedIn || hasCheckedOut;
  const canClockOut = hasCheckedIn && !hasCheckedOut;

  return (
    <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] rounded-3xl p-7 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="text-white/60 text-sm mb-1">مرحباً، {userName}</p>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={20} className="text-white/70" />
            <span className="text-3xl font-bold tracking-tight" dir="ltr">
              {timeStr}
            </span>
          </div>
          <p className="text-white/50 text-sm">{dateStr}</p>

          <div className="flex gap-3 mt-4 flex-wrap items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                hasCheckedIn && !hasCheckedOut
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                  : "bg-white/10 text-white/50 border border-white/10"
              }`}
            >
              <LogIn size={12} />
              {checkInStr ? `حضور: ${checkInStr}` : "لم يُسجَّل الحضور بعد"}
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                hasCheckedOut
                  ? "bg-red-400/20 text-red-200 border border-red-400/30"
                  : "bg-white/10 text-white/50 border border-white/10"
              }`}
            >
              <LogOut size={12} />
              {checkOutStr
                ? `انصراف: ${checkOutStr}`
                : "لم يُسجَّل الانصراف بعد"}
            </div>

            {hasCheckedIn && !hasCheckedOut && activeSession?.checkInTime && (
              <ElapsedTimer checkInTime={activeSession.checkInTime} />
            )}

            {hasCheckedOut && hoursWorked > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white/70 border border-white/10">
                <Timer size={12} />
                {`${hoursWorked} ساعة عمل`}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={onClockIn}
            disabled={clockingIn || !canClockIn}
            className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm transition-all min-w-[110px] ${
              !canClockIn
                ? "bg-white/10 text-white/30 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            {clockingIn ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <LogIn size={22} />
            )}
            تسجيل الحضور
          </button>

          <button
            onClick={onClockOut}
            disabled={clockingOut || !canClockOut}
            className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl font-semibold text-sm transition-all min-w-[110px] ${
              !canClockOut
                ? "bg-white/10 text-white/30 cursor-not-allowed"
                : "bg-red-400 hover:bg-red-300 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            {clockingOut ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <LogOut size={22} />
            )}
            تسجيل الانصراف
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status Patch Modal (unchanged) ───────────────────────────────────────────

interface StatusModalProps {
  record: Attendance;
  saving: boolean;
  error?: string | null;
  onSave: (d: StatusPatchData) => void;
  onClose: () => void;
}

const StatusModal = ({
  record,
  saving,
  error,
  onSave,
  onClose,
}: StatusModalProps) => {
  const [status, setStatus] = useState<AttendanceStatus>(
    resolveStatus(record.status),
  );
  const [notes, setNotes] = useState(record.notes ?? "");

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/25 rounded-xl bg-white " +
    "focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] text-sm";
  const labelCls =
    "block text-[10px] font-bold text-[#1B5E4F]/60 mb-1.5 uppercase tracking-widest";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              تعديل حالة الحضور
            </h2>
            <p className="text-white/50 text-xs mt-0.5">
              {fmtDate(record.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="text-white/70" size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>الحالة الجديدة</label>
            <div className="grid grid-cols-1 gap-2">
              {(
                Object.entries(STATUS_CONFIG) as [AttendanceStatus, StatusCfg][]
              ).map(([k, v]) => {
                const Icon = v.icon;
                const active = status === k;
                return (
                  <button
                    key={k}
                    onClick={() => setStatus(k)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all text-right ${
                      active
                        ? "border-[#1B5E4F] bg-[#1B5E4F]/5 text-[#1B5E4F]"
                        : "border-gray-100 hover:border-[#B8976B]/30 text-gray-600"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={active ? "text-[#1B5E4F]" : "text-gray-400"}
                    />
                    {v.label}
                    {active && (
                      <CheckCircle
                        size={14}
                        className="mr-auto text-[#1B5E4F]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea
              className={`${inputCls} resize-none h-20`}
              placeholder="سبب التعديل..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave({ id: record.id, status, notes, record })}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle size={15} />
            )}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Attendance Row (unchanged) ───────────────────────────────────────────────

interface AttendanceRowProps {
  record: Attendance;
  currentUser: StoredUser;
  usersMap: Map<string, UserMapValue>;
  onEdit: () => void;
}
const AttendanceRow = ({
  record,
  currentUser,
  usersMap,
  onEdit,
}: AttendanceRowProps) => {
  const admin = isAdmin(currentUser);
  const isOwnRecord =
    record.userId === currentUser.userId || (!record.userId && !admin);

  const userInfo = isOwnRecord
    ? {
        name: currentUser.fullName || currentUser.name || "—",
        email: currentUser.email || "—",
      }
    : (usersMap.get(record.userId ?? "") ?? { name: "—", email: "—" });

  const displayName = userInfo.name;
  const displayEmail = userInfo.email;

  const subtitle = isOwnRecord
    ? displayEmail
    : (record.sectorName ?? record.userId ?? "—");

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hoursWorked =
    record.checkInTime && record.checkOutTime
      ? calcHoursWorked(record.checkInTime, record.checkOutTime)
      : (record.hoursWorked ?? 0);

  return (
    <tr className="hover:bg-[#F5F1E8]/40 transition-all group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials || "?"}
          </div>
          <div>
            <p className="font-semibold text-[#1B5E4F] text-sm">
              {displayName}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[180px]">
              {displayEmail !== "—" ? displayEmail : subtitle}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 font-medium">
        {fmtDate(record.date)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-500 font-mono" dir="ltr">
        {fmtTime(record.checkInTime)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-500 font-mono" dir="ltr">
        {fmtTime(record.checkOutTime)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-500 font-mono">
        {hoursWorked > 0 ? `${hoursWorked}h` : "—"}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={record.status} />
      </td>
      <td className="px-5 py-4 text-sm text-gray-400 max-w-[160px] truncate">
        {record.notes}
      </td>
      <td className="px-5 py-4">
        {(admin || isOwnRecord) && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-[#1B5E4F]/8 hover:bg-[#1B5E4F]/15 text-[#1B5E4F] rounded-lg text-xs font-semibold transition-all"
          >
            <Edit size={12} />
            تعديل
          </button>
        )}
      </td>
    </tr>
  );
};

// ─── Date Picker Strip (unchanged) ────────────────────────────────────────────

interface DateStripProps {
  selected: string;
  onChange: (date: string) => void;
}

const DateStrip = ({ selected, onChange }: DateStripProps) => {
  const days = useMemo(() => {
    const arr: { label: string; iso: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label =
        i === 0
          ? "اليوم"
          : i === 1
            ? "أمس"
            : d.toLocaleDateString("ar-SA", { weekday: "short" });
      arr.push({ label, iso });
    }
    return arr;
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap" dir="rtl">
      <button
        onClick={() => onChange("")}
        className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
          selected === ""
            ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
            : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]/30"
        }`}
      >
        الكل
      </button>
      {days.map(({ label, iso }) => (
        <button
          key={iso}
          onClick={() => onChange(iso === selected ? "" : iso)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
            selected === iso
              ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
              : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]/30"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const storedUser = getStoredUser();
  const userId = storedUser?.userId ?? "";
  const userName = storedUser?.fullName || storedUser?.name || "المستخدم";
  const userIsAdmin = isAdmin(storedUser);

  const qc = useQueryClient();

  const [filterDate, setFilterDate] = useState<string>(todayLocal());
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState<"status" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);

  const [localClockOut, setLocalClockOut] = useState<{
    id: string;
    checkOutTime: string;
    hoursWorked: number;
  } | null>(null);

  const { data: usersMap = new Map<string, UserMapValue>() } = useQuery<
    Map<string, UserMapValue>
  >({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchAllUsers,
    enabled: userIsAdmin,
    staleTime: 5 * 60_000,
  });

  const serverParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (filterDate) p.Date = `${filterDate}T00:00:00`;
    if (filterStatus) p.Status = filterStatus;
    if (!userIsAdmin && userId) p.UserId = userId;
    return p;
  }, [filterDate, filterStatus, userIsAdmin, userId]);

  const {
    data: rawAtt,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchAttendance(serverParams),
    staleTime: 30_000,
  });

  const records: Attendance[] = useMemo(() => {
    const base = normalize<Attendance>(rawAtt);
    if (!localClockOut) return base;
    return base.map((r) =>
      r.id === localClockOut.id
        ? {
            ...r,
            checkOutTime: localClockOut.checkOutTime,
            hoursWorked: localClockOut.hoursWorked,
          }
        : r,
    );
  }, [rawAtt, localClockOut]);

  const activeSession = useMemo((): Attendance | undefined => {
    const today = todayLocal();
    const entry = getTodayClockInEntry();

    if (entry?.id) {
      const byId = records.find((r) => r.id === entry.id);
      if (byId && !byId.checkOutTime) return byId;
    }

    return records
      .filter(
        (r) =>
          (r.userId === userId || (!r.userId && !userIsAdmin)) &&
          toLocalDate(r.date) === today &&
          r.checkInTime &&
          !r.checkOutTime,
      )
      .sort(
        (a, b) =>
          new Date(b.checkInTime!).getTime() -
          new Date(a.checkInTime!).getTime(),
      )[0];
  }, [records, userId, userIsAdmin]);

  useEffect(() => {
    if (activeSession?.id && !getTodayClockInEntry()) {
      saveClockInEntry(activeSession.id, activeSession.checkInTime ?? nowISO());
    }
  }, [activeSession]);

  useEffect(() => {
    if (localClockOut && activeSession?.checkOutTime) {
      setLocalClockOut(null);
      clearClockInEntry();
    }
  }, [activeSession?.checkOutTime, localClockOut]);

  const displayed = useMemo(() => {
    let result = records;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => {
        const name =
          usersMap.get(r.userId ?? "") ?? r.employeeFullName ?? r.userId ?? "";
        return name.toString().toLowerCase().includes(q);
      });
    }
    return [...result].sort(
      (a, b) =>
        new Date(b.checkInTime ?? b.date).getTime() -
        new Date(a.checkInTime ?? a.date).getTime(),
    );
  }, [records, search, usersMap]);

  const closeModal = () => {
    setModal(null);
    setSelectedRecord(null);
    setFormError(null);
  };

  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(
      (r) => resolveStatus(r.status) === "Present",
    ).length;
    const absent = records.filter(
      (r) => resolveStatus(r.status) === "Absent",
    ).length;
    const late = records.filter(
      (r) => resolveStatus(r.status) === "Late",
    ).length;
    return { total, present, absent, late };
  }, [records]);

  // ── Clock In mutation with device detection ────────────────────────────────
  const clockInMutation = useMutation({
    mutationFn: (notes?: string) => {
      if (!userId) throw new Error("لم يتم العثور على بيانات المستخدم");
      return apiClockIn(userId, notes);
    },
    onMutate: async (notes?: string) => {
      setClockError(null);
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });

      // Generate device info
      const checkInTime = nowISO();
      const tempId = `temp-${Date.now()}`;
      const temp: Attendance = {
        id: tempId,
        employeeFullName: userName,
        sectorId: null,
        sectorName: null,
        date: checkInTime,
        checkInTime,
        checkOutTime: null,
        hoursWorked: 0,
        hoursToWork: 0,
        status: "Present",
        isConfirmed: false,
        notes: notes,
        userId,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize<Attendance>(old),
        temp,
      ]);
      saveClockInEntry(tempId, checkInTime);
      return { prev, tempId, checkInTime, notes };
    },
    onSuccess: (realId: string, _vars, ctx) => {
      if (realId && ctx?.checkInTime) {
        saveClockInEntry(realId, ctx.checkInTime);
        qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
          normalize<Attendance>(old).map((r) =>
            r.id === ctx.tempId ? { ...r, id: realId, notes: ctx.notes } : r,
          ),
        );
      }
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev)
        ctx.prev.forEach(([key, val]: [QueryKey, unknown]) =>
          qc.setQueryData(key, val),
        );
      clearClockInEntry();
      setClockError(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Clock Out mutation (unchanged) ────────────────────────────────────────
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id || !activeSession?.checkInTime) {
        throw new Error("لا يوجد سجل حضور نشط اليوم لتسجيل الانصراف");
      }
      const checkOutTime = nowISO();
      const hoursWorked = calcHoursWorked(
        activeSession.checkInTime,
        checkOutTime,
      );
      await authFetch(
        `${API_BASE}/Api/V1/Attendance/${activeSession.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ checkOutTime }),
        },
      );
      return { id: activeSession.id, checkOutTime, hoursWorked };
    },
    onMutate: async () => {
      setClockError(null);
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const checkOutTime = nowISO();
      const hoursWorked = activeSession?.checkInTime
        ? calcHoursWorked(activeSession.checkInTime, checkOutTime)
        : 0;
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize<Attendance>(old).map((r) =>
          r.id === activeSession?.id ? { ...r, checkOutTime, hoursWorked } : r,
        ),
      );
      clearClockInEntry();
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val));
      }
      setClockError(e.message || "فشل في تسجيل الانصراف");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ── Status patch mutation (unchanged) ─────────────────────────────────────
  const patchMutation = useMutation({
    mutationFn: apiPatchStatus,
    onMutate: async ({ id, status, notes }: StatusPatchData) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize<Attendance>(old).map((r) =>
          r.id === id ? { ...r, status, notes } : r,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (e: Error, vars: StatusPatchData, ctx) => {
      if (ctx?.prev)
        ctx.prev.forEach(([key, val]: [QueryKey, unknown]) =>
          qc.setQueryData(key, val),
        );
      setFormError(e.message);
      setSelectedRecord(records.find((r) => r.id === vars.id) ?? null);
      setModal("status");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              الحضور والانصراف
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              متابعة حضور الموظفين اليومي
            </p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })}
            className="p-2.5 rounded-xl border-2 border-[#B8976B]/20 text-[#1B5E4F] hover:bg-[#F5F1E8] transition-all self-start sm:self-auto"
            title="تحديث"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {/* User Info */}
        {storedUser && <UserInfoCard user={storedUser} />}

        {/* Clock Card */}
        <ClockCard
          userName={userName}
          activeSession={activeSession}
          clockingIn={clockInMutation.isPending}
          clockingOut={clockOutMutation.isPending}
          onClockIn={() => {
            const deviceInfo = getDeviceInfo();
            const notes =
              deviceInfo.type === "mobile"
                ? "📱 جوال"
                : deviceInfo.type === "tablet"
                  ? "📲 جهاز لوحي"
                  : "💻 حاسوب";
            clockInMutation.mutate(notes);
          }}
          onClockOut={() => clockOutMutation.mutate()}
        />

        {/* Clock error */}
        {clockError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{clockError}</span>
            <button
              onClick={() => setClockError(null)}
              className="mr-auto p-1 hover:bg-red-100 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                {
                  label: "إجمالي السجلات",
                  value: stats.total,
                  color: "from-[#1B5E4F] to-[#0F4F3E]",
                  icon: ClipboardList,
                },
                {
                  label: "حاضر",
                  value: stats.present,
                  color: "from-emerald-500 to-emerald-600",
                  icon: CheckSquare,
                },
                {
                  label: "غائب",
                  value: stats.absent,
                  color: "from-red-500 to-red-600",
                  icon: XSquare,
                },
                {
                  label: "متأخر",
                  value: stats.late,
                  color: "from-amber-500 to-amber-600",
                  icon: AlertCircle,
                },
              ] as {
                label: string;
                value: number;
                color: string;
                icon: LucideIcon;
              }[]
            ).map(({ label, value, color, icon: Icon }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-[#B8976B]/10 p-4 flex items-center gap-3 shadow-sm"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}
                >
                  <Icon size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1B5E4F]">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Date Strip + Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/10 p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-[#1B5E4F]/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Calendar size={11} />
              اختر التاريخ
            </p>
            <DateStrip selected={filterDate} onChange={setFilterDate} />
          </div>

          <div className="flex gap-3 flex-wrap">
            {userIsAdmin && (
              <div className="flex-1 min-w-[200px] relative">
                <Search
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="بحث باسم الموظف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none transition-all text-sm text-[#1B5E4F]"
                />
              </div>
            )}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                showFilters
                  ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                  : "bg-white text-[#1B5E4F] border-[#B8976B]/20"
              }`}
            >
              <Filter size={16} />
              فلتر الحالة
              {filterStatus && (
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              )}
            </button>
            <div className="relative">
              <input
                type="date"
                dir="ltr"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2.5 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
              />
            </div>
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-[#B8976B]/10">
              <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-2">
                الحالة
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus("")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    filterStatus === ""
                      ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  الكل
                </button>
                {(
                  Object.entries(STATUS_CONFIG) as [
                    AttendanceStatus,
                    StatusCfg,
                  ][]
                ).map(([k, v]) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={k}
                      onClick={() => setFilterStatus((s) => (s === k ? "" : k))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        filterStatus === k
                          ? `${v.cls} border-current`
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      <Icon size={11} />
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={36} />
            <p className="text-gray-400 text-sm">جاري تحميل سجلات الحضور...</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertTriangle className="text-red-400" size={32} />
            <p className="text-gray-400 text-sm">{(error as Error)?.message}</p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })}
              className="px-5 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading &&
          !isError &&
          storedUser &&
          (displayed.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-[#B8976B]/10 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  <span className="font-bold text-[#1B5E4F]">
                    {displayed.length}
                  </span>{" "}
                  سجل
                  {filterDate && (
                    <span className="mr-2 text-[#B8976B]">
                      —{" "}
                      {new Date(filterDate + "T00:00:00").toLocaleDateString(
                        "ar-SA",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </span>
                  )}
                </p>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate("")}
                    className="text-xs text-[#1B5E4F]/60 hover:text-[#1B5E4F] flex items-center gap-1 transition-colors"
                  >
                    <X size={12} />
                    مسح الفلتر
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#B8976B]/10 bg-[#F5F1E8]/40">
                      {[
                        "الموظف",
                        "التاريخ",
                        "الحضور",
                        "الانصراف",
                        "ساعات العمل",
                        "الحالة",
                        "ملاحظات",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3.5 text-right text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayed.map((r) => (
                      <AttendanceRow
                        key={r.id}
                        record={r}
                        currentUser={storedUser}
                        usersMap={usersMap}
                        onEdit={() => {
                          setSelectedRecord(r);
                          setFormError(null);
                          setModal("status");
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-[#F5F1E8] flex items-center justify-center">
                <ClipboardList className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد سجلات
              </h3>
              <p className="text-gray-400 text-sm">
                {filterDate
                  ? "لا توجد سجلات حضور لهذا التاريخ"
                  : "لم يتم تسجيل أي حضور بعد"}
              </p>
              {filterDate && (
                <button
                  onClick={() => setFilterDate("")}
                  className="mt-4 px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
                >
                  عرض جميع السجلات
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Status Modal */}
      {modal === "status" && selectedRecord && (
        <StatusModal
          record={selectedRecord}
          saving={patchMutation.isPending}
          error={formError}
          onSave={(d) => {
            setFormError(null);
            patchMutation.mutate(d);
          }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
