import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  User,
  RefreshCw,
  ClipboardList,
  CheckSquare,
  XSquare,
  AlertCircle,
  Plane,
  Monitor,
  FileText,
} from "lucide-react";
import type { QueryKey } from "@tanstack/react-query";
// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "OnLeave"
  | "WorkFromHome";

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  hoursToWork?: number;
  status: AttendanceStatus;
  notes?: string | null;
}

interface Employee {
  id: string;
  employeeFirstName: string;
  employeeLastName: string;
  jobTitle: string;
  sectorId: string;
}

interface Sector {
  id: string;
  name: string;
}

interface AttendanceFormData {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  hoursToWork: number | string;
  status: AttendanceStatus;
  notes: string;
}

interface StatusPatchData {
  id: string;
  status: AttendanceStatus;
  notes: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

interface StatusCfg {
  label: string;
  cls: string;
  icon: LucideIcon; // ← correct type, no React.FC<any>
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
  label: "",
  cls: "bg-gray-100 text-gray-600 border-gray-200",
  icon: FileText,
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: AttendanceFormData = {
  employeeId: "",
  date: "",
  checkInTime: "",
  checkOutTime: "",
  hoursToWork: 8,
  status: "Present",
  notes: "",
};

const API_BASE = import.meta.env.VITE_API_URL as string;
const QUERY_KEY = ["attendance"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Trailing comma on <T,> disambiguates generic from JSX in .tsx files
const normalize = <T,>(raw: unknown): T[] =>
  Array.isArray(raw)
    ? (raw as T[])
    : (((raw as any)?.data ?? (raw as any)?.items ?? []) as T[]);

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

const fetchEmployees = (): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Employee/Get-All`);

const fetchSectors = (): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Sector/Get-All`);

const apiAdd = (data: AttendanceFormData): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Attendance/Add`, {
    method: "POST",
    body: JSON.stringify({
      employeeId: data.employeeId,
      date: data.date || undefined,
      checkInTime: data.checkInTime || undefined,
      checkOutTime: data.checkOutTime || undefined,
      hoursToWork: Number(data.hoursToWork),
      status: data.status,
      notes: data.notes || undefined,
    }),
  });

const apiPatchStatus = ({
  id,
  status,
  notes,
}: StatusPatchData): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Attendance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes: notes || undefined }),
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: AttendanceStatus }) => {
  const cfg = STATUS_CONFIG[status] ?? FALLBACK_CFG;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <Icon size={11} />
      {cfg.label || status}
    </span>
  );
};

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddModalProps {
  employees: Employee[];
  saving: boolean;
  error?: string | null;
  onSave: (d: AttendanceFormData) => void;
  onClose: () => void;
}

const AddModal = ({
  employees,
  saving,
  error,
  onSave,
  onClose,
}: AddModalProps) => {
  const [form, setForm] = useState<AttendanceFormData>({ ...EMPTY_FORM });

  const set = (k: keyof AttendanceFormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/25 rounded-xl bg-white " +
    "focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none " +
    "transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "block text-[10px] font-bold text-[#1B5E4F]/60 mb-1.5 uppercase tracking-widest";

  const selectedEmp = employees.find((e) => e.id === form.employeeId);
  const showTimes =
    form.status === "Present" ||
    form.status === "Late" ||
    form.status === "WorkFromHome";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تسجيل حضور جديد</h2>
              <p className="text-white/50 text-xs mt-0.5">
                أدخل بيانات الحضور والانصراف
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="text-white/70" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee */}
          <div>
            <label className={labelCls}>الموظف *</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none pl-8`}
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
              >
                <option value="">-- اختر الموظف --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeFirstName} {e.employeeLastName} — {e.jobTitle}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
              />
              <User
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]/40 pointer-events-none"
              />
            </div>
            {selectedEmp && (
              <p className="text-xs text-[#1B5E4F]/50 mt-1.5 flex items-center gap-1">
                <User size={11} />
                <span className="font-bold text-[#1B5E4F]/70">
                  {selectedEmp.employeeFirstName} {selectedEmp.employeeLastName}
                </span>
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>التاريخ *</label>
            <input
              type="date"
              className={inputCls}
              dir="ltr"
              value={form.date ? form.date.split("T")[0] : ""}
              onChange={(e) =>
                set(
                  "date",
                  e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                )
              }
            />
          </div>

          {/* Status */}
          <div>
            <label className={labelCls}>الحالة *</label>
            <div className="relative">
              <select
                className={`${inputCls} appearance-none`}
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as AttendanceStatus)
                }
              >
                {(
                  Object.entries(STATUS_CONFIG) as [
                    AttendanceStatus,
                    StatusCfg,
                  ][]
                ).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
              />
            </div>
          </div>

          {/* Check-in / Check-out / Hours – only for time-based statuses */}
          {showTimes && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>وقت الحضور</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  dir="ltr"
                  value={form.checkInTime ? form.checkInTime.slice(0, 16) : ""}
                  onChange={(e) =>
                    set(
                      "checkInTime",
                      e.target.value ? `${e.target.value}:00.000Z` : "",
                    )
                  }
                />
              </div>
              <div>
                <label className={labelCls}>وقت الانصراف</label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  dir="ltr"
                  value={
                    form.checkOutTime ? form.checkOutTime.slice(0, 16) : ""
                  }
                  onChange={(e) =>
                    set(
                      "checkOutTime",
                      e.target.value ? `${e.target.value}:00.000Z` : "",
                    )
                  }
                />
              </div>
              <div>
                <label className={labelCls}>ساعات العمل المطلوبة</label>
                <input
                  type="number"
                  className={inputCls}
                  dir="ltr"
                  min={1}
                  max={24}
                  value={form.hoursToWork}
                  onChange={(e) => set("hoursToWork", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>ملاحظات</label>
            <textarea
              className={`${inputCls} resize-none h-20`}
              placeholder="ملاحظات إضافية..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50/80 border-t border-[#B8976B]/10 flex gap-3 justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border-2 border-[#B8976B]/25 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.employeeId || !form.date}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CheckCircle size={15} />
            )}
            تسجيل الحضور
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status Patch Modal ───────────────────────────────────────────────────────

interface StatusModalProps {
  record: Attendance;
  employeeName: string;
  saving: boolean;
  error?: string | null;
  onSave: (d: StatusPatchData) => void;
  onClose: () => void;
}

const StatusModal = ({
  record,
  employeeName,
  saving,
  error,
  onSave,
  onClose,
}: StatusModalProps) => {
  const [status, setStatus] = useState<AttendanceStatus>(record.status);
  const [notes, setNotes] = useState(record.notes ?? "");

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/25 rounded-xl bg-white " +
    "focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none " +
    "transition-all text-[#1B5E4F] text-sm";
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
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              تعديل حالة الحضور
            </h2>
            <p className="text-white/50 text-xs mt-0.5">{employeeName}</p>
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
            onClick={() => onSave({ id: record.id, status, notes })}
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

// ─── Attendance Row ───────────────────────────────────────────────────────────

interface AttendanceRowProps {
  record: Attendance;
  employeeName: string;
  sectorName: string;
  onEdit: () => void;
}

const AttendanceRow = ({
  record,
  employeeName,
  sectorName,
  onEdit,
}: AttendanceRowProps) => {
  const dateStr = record.date
    ? new Date(record.date).toLocaleDateString("ar-SA")
    : "—";
  const checkIn = record.checkInTime
    ? new Date(record.checkInTime).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const checkOut = record.checkOutTime
    ? new Date(record.checkOutTime).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const initials = employeeName
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="hover:bg-[#F5F1E8]/40 transition-all group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-[#1B5E4F] text-sm">
              {employeeName}
            </p>
            <p className="text-xs text-gray-400">{sectorName}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 font-medium">{dateStr}</td>
      <td className="px-5 py-4 text-sm text-gray-500 font-mono" dir="ltr">
        {checkIn}
      </td>
      <td className="px-5 py-4 text-sm text-gray-500 font-mono" dir="ltr">
        {checkOut}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={record.status} />
      </td>
      <td className="px-5 py-4 text-sm text-gray-400 max-w-[160px] truncate">
        {record.notes ?? "—"}
      </td>
      <td className="px-5 py-4">
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-[#1B5E4F]/8 hover:bg-[#1B5E4F]/15 text-[#1B5E4F] rounded-lg text-xs font-semibold transition-all"
        >
          <Edit size={12} />
          تعديل
        </button>
      </td>
    </tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const qc = useQueryClient();

  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "status" | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (filterDate) p.Date = filterDate;
    if (filterStatus) p.Status = filterStatus;
    if (filterEmployee) p.EmployeeId = filterEmployee;
    if (filterSector) p.SectorId = filterSector;
    return p;
  }, [filterDate, filterStatus, filterEmployee, filterSector]);

  // ── Queries
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

  const { data: rawEmp } = useQuery({
    queryKey: ["employees-all"],
    queryFn: fetchEmployees,
    staleTime: 60_000,
  });

  const { data: rawSec } = useQuery({
    queryKey: ["sectors-all"],
    queryFn: fetchSectors,
    staleTime: 60_000,
  });

  const records: Attendance[] = normalize<Attendance>(rawAtt);
  const employees: Employee[] = normalize<Employee>(rawEmp);
  const sectors: Sector[] = normalize<Sector>(rawSec);

  const empMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );
  const secMap = useMemo(
    () => new Map(sectors.map((s) => [s.id, s.name])),
    [sectors],
  );

  const getEmpName = (id: string): string => {
    const e = empMap.get(id);
    return e ? `${e.employeeFirstName} ${e.employeeLastName}` : id;
  };

  const getSecName = (id: string): string => {
    const e = empMap.get(id);
    return e ? (secMap.get(e.sectorId) ?? "—") : "—";
  };

  const displayed = useMemo(
    () =>
      search
        ? records.filter((r) =>
            getEmpName(r.employeeId)
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
        : records,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, search, empMap],
  );

  const closeModal = () => {
    setModal(null);
    setSelectedRecord(null);
    setFormError(null);
  };

  // ── Stats
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    return { total, present, absent, late };
  }, [records]);

  // ── Optimistic ADD
  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data: AttendanceFormData) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: Attendance = {
        id: `temp-${Date.now()}`,
        employeeId: data.employeeId,
        date: data.date,
        checkInTime: data.checkInTime || null,
        checkOutTime: data.checkOutTime || null,
        hoursToWork: Number(data.hoursToWork),
        status: data.status,
        notes: data.notes || null,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize<Attendance>(old),
        temp,
      ]);
      closeModal();
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev)
        ctx?.prev.forEach(([key, val]: [QueryKey, unknown]) =>
          qc.setQueryData(key, val),
        );
      setFormError(e.message);
      setModal("add");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Optimistic PATCH status
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
        ctx?.prev.forEach(([key, val]: [QueryKey, unknown]) =>
          qc.setQueryData(key, val),
        );
      setFormError(e.message);
      setSelectedRecord(records.find((r) => r.id === vars.id) ?? null);
      setModal("status");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Render
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
          <div className="flex gap-3">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })}
              className="p-2.5 rounded-xl border-2 border-[#B8976B]/20 text-[#1B5E4F] hover:bg-[#F5F1E8] transition-all"
              title="تحديث"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setModal("add");
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
            >
              <Plus size={17} />
              تسجيل حضور
            </button>
          </div>
        </div>

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

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/10 p-5">
          <div className="flex gap-3 flex-wrap">
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
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                showFilters
                  ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                  : "bg-white text-[#1B5E4F] border-[#B8976B]/20"
              }`}
            >
              <Filter size={16} />
              تصفية
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">
                  التاريخ
                </label>
                <input
                  type="date"
                  dir="ltr"
                  value={filterDate ? filterDate.split("T")[0] : ""}
                  onChange={(e) =>
                    setFilterDate(
                      e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                    )
                  }
                  className="w-full px-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">
                  الحالة
                </label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none pl-7 pr-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    {(
                      Object.entries(STATUS_CONFIG) as [
                        AttendanceStatus,
                        StatusCfg,
                      ][]
                    ).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>

              {/* Employee */}
              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">
                  الموظف
                </label>
                <div className="relative">
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="w-full appearance-none pl-7 pr-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeFirstName} {e.employeeLastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">
                  القطاع
                </label>
                <div className="relative">
                  <select
                    value={filterSector}
                    onChange={(e) => setFilterSector(e.target.value)}
                    className="w-full appearance-none pl-7 pr-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
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
          (displayed.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#B8976B]/10 bg-[#F5F1E8]/40">
                      {[
                        "الموظف",
                        "التاريخ",
                        "الحضور",
                        "الانصراف",
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
                        employeeName={getEmpName(r.employeeId)}
                        sectorName={getSecName(r.employeeId)}
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
              <p className="text-gray-400 text-sm mb-6">
                لم يتم تسجيل أي حضور بعد
              </p>
              <button
                onClick={() => {
                  setFormError(null);
                  setModal("add");
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg text-sm"
              >
                <Plus size={16} />
                تسجيل الحضور
              </button>
            </div>
          ))}
      </div>

      {/* Modals */}
      {modal === "add" && (
        <AddModal
          employees={employees}
          saving={addMutation.isPending}
          error={formError}
          onSave={(d) => {
            setFormError(null);
            addMutation.mutate(d);
          }}
          onClose={closeModal}
        />
      )}

      {modal === "status" && selectedRecord && (
        <StatusModal
          record={selectedRecord}
          employeeName={getEmpName(selectedRecord.employeeId)}
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
