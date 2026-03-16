import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign, Plus, Search, Filter, Edit, Trash2, X, Loader2,
  AlertTriangle, CheckCircle, ChevronDown, RefreshCw, TrendingUp,
  TrendingDown, Award, Clock, User, Calendar, CheckSquare, XSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Salary {
  id:             string;
  employeeId:     string;
  baseSalary:     number;
  allowances:     number;
  deductions:     number;
  overtimeAmount: number;
  bonusAmount:    number;
  netSalary:      number;
  hoursWorked:    number;
  month:          number;
  year:           number;
  isConfirmed:    boolean;
}

interface Employee {
  id:                string;
  employeeFirstName: string;
  employeeLastName:  string;
  jobTitle:          string;
  sectorId:          string;
}

/** All numeric fields kept as string|number so inputs stay controlled */
interface SalaryFormData {
  employeeId:     string;
  baseSalary:     number | string;
  allowances:     number | string;
  deductions:     number | string;
  overtimeAmount: number | string;
  bonusAmount:    number | string;
  netSalary:      number | string;
  hoursWorked:    number | string;
  month:          number | string;
  year:           number | string;
  isConfirmed:    boolean;
}

type ModalType = "add" | "edit" | "delete" | null;

// ─── Field descriptor used in the form + card ────────────────────────────────

interface SalaryField {
  k:     keyof SalaryFormData;
  label: string;
  icon:  LucideIcon;
  color: string;
}

interface SalaryRowField {
  label: string;
  value: number;
  icon:  LucideIcon;
  cls:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR  = new Date().getFullYear();

const EMPTY_FORM: SalaryFormData = {
  employeeId:     "",
  baseSalary:     "",
  allowances:     0,
  deductions:     0,
  overtimeAmount: 0,
  bonusAmount:    0,
  netSalary:      0,
  hoursWorked:    0,
  month:          CURRENT_MONTH,
  year:           CURRENT_YEAR,
  isConfirmed:    false,
};

const MONTHS: string[] = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

const FORM_FIELDS: SalaryField[] = [
  { k: "baseSalary",     label: "الراتب الأساسي", icon: DollarSign,   color: "text-gray-500"    },
  { k: "allowances",     label: "البدلات",        icon: TrendingUp,   color: "text-emerald-500" },
  { k: "overtimeAmount", label: "ساعات إضافية",   icon: Clock,        color: "text-blue-500"    },
  { k: "bonusAmount",    label: "المكافأة",        icon: Award,        color: "text-purple-500"  },
  { k: "deductions",     label: "الخصومات",       icon: TrendingDown, color: "text-red-400"     },
  { k: "hoursWorked",    label: "ساعات العمل",    icon: Clock,        color: "text-[#B8976B]"   },
];

const API_BASE  = import.meta.env.VITE_API_URL as string;
const QUERY_KEY = ["salaries"] as const;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const calcNet = (f: SalaryFormData): number =>
  Number(f.baseSalary) + Number(f.allowances) +
  Number(f.overtimeAmount) + Number(f.bonusAmount) - Number(f.deductions);

const toFormData = (s: Salary): SalaryFormData => ({
  employeeId:     s.employeeId,
  baseSalary:     s.baseSalary,
  allowances:     s.allowances,
  deductions:     s.deductions,
  overtimeAmount: s.overtimeAmount,
  bonusAmount:    s.bonusAmount,
  netSalary:      s.netSalary,
  hoursWorked:    s.hoursWorked,
  month:          s.month,
  year:           s.year,
  isConfirmed:    s.isConfirmed,
});

/** POST body – includes employeeId */
const toAddBody = (d: SalaryFormData) => ({
  employeeId:     d.employeeId,
  baseSalary:     Number(d.baseSalary),
  allowances:     Number(d.allowances),
  deductions:     Number(d.deductions),
  overtimeAmount: Number(d.overtimeAmount),
  bonusAmount:    Number(d.bonusAmount),
  netSalary:      calcNet(d),
  hoursWorked:    Number(d.hoursWorked),
  month:          Number(d.month),
  year:           Number(d.year),
  isConfirmed:    d.isConfirmed,
});

/** PUT body – no employeeId per API spec */
const toPutBody = (d: SalaryFormData) => ({
  baseSalary:     Number(d.baseSalary),
  allowances:     Number(d.allowances),
  deductions:     Number(d.deductions),
  overtimeAmount: Number(d.overtimeAmount),
  bonusAmount:    Number(d.bonusAmount),
  netSalary:      calcNet(d),
  hoursWorked:    Number(d.hoursWorked),
  month:          Number(d.month),
  year:           Number(d.year),
  isConfirmed:    d.isConfirmed,
});

const normalize = <T,>(raw: unknown): T[] =>
  Array.isArray(raw)
    ? (raw as T[])
    : (((raw as any)?.data ?? (raw as any)?.items ?? []) as T[]);

// ─── API ──────────────────────────────────────────────────────────────────────

const authFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
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
  return text ? (JSON.parse(text) as unknown) : null;
};

const fetchSalaries = (params: Record<string, string>): Promise<unknown> => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Salary/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchEmployees = (): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Employee/Get-All`);

const apiAdd = (data: SalaryFormData): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Salary/Add`, {
    method: "POST",
    body:   JSON.stringify(toAddBody(data)),
  });

const apiUpdate = ({ id, data }: { id: string; data: SalaryFormData }): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Salary/${id}`, {
    method: "PUT",
    body:   JSON.stringify(toPutBody(data)),
  });

const apiDelete = (id: string): Promise<unknown> =>
  authFetch(`${API_BASE}/Api/V1/Salary/${id}`, { method: "DELETE" });

// ─── Salary Form Modal ────────────────────────────────────────────────────────

interface SalaryModalProps {
  mode:      "add" | "edit";
  initial:   SalaryFormData;
  employees: Employee[];
  empName?:  string;
  saving:    boolean;
  error?:    string | null;
  onSave:    (d: SalaryFormData) => void;
  onClose:   () => void;
}

const SalaryModal = ({
  mode, initial, employees, empName, saving, error, onSave, onClose,
}: SalaryModalProps) => {
  const [form, setForm] = useState<SalaryFormData>({ ...initial });

  const set = (k: keyof SalaryFormData, v: string | number | boolean) => {
    setForm(prev => {
      const next: SalaryFormData = { ...prev, [k]: v };
      if (["baseSalary","allowances","deductions","overtimeAmount","bonusAmount"].includes(k)) {
        next.netSalary = calcNet(next);
      }
      return next;
    });
  };

  const selectedEmp = employees.find(e => e.id === form.employeeId);
  const net         = Number(form.netSalary);

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/25 rounded-xl bg-white " +
    "focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none " +
    "transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls = "block text-[10px] font-bold text-[#1B5E4F]/60 mb-1.5 uppercase tracking-widest";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "add" ? "إضافة راتب جديد" : "تعديل بيانات الراتب"}
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                {mode === "edit" && empName
                  ? empName
                  : mode === "add" ? "أدخل تفاصيل الراتب" : "تحديث مكونات الراتب"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X className="text-white/70" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-6 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee + Period */}
          <section>
            <h3 className="text-xs font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" />بيانات الموظف والفترة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {mode === "add" && (
                <div className="col-span-2">
                  <label className={labelCls}>الموظف *</label>
                  <div className="relative">
                    <select
                      className={`${inputCls} appearance-none pl-8`}
                      value={form.employeeId}
                      onChange={e => set("employeeId", e.target.value)}
                    >
                      <option value="">-- اختر الموظف --</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.employeeFirstName} {e.employeeLastName} — {e.jobTitle}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                    <User      size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]/40 pointer-events-none" />
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
              )}

              <div>
                <label className={labelCls}>الشهر</label>
                <div className="relative">
                  <select
                    className={`${inputCls} appearance-none`}
                    value={Number(form.month)}
                    onChange={e => set("month", Number(e.target.value))}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className={labelCls}>السنة</label>
                <input
                  type="number"
                  className={inputCls}
                  dir="ltr"
                  value={form.year}
                  min={2000}
                  max={2100}
                  onChange={e => set("year", e.target.value)}
                  placeholder={String(CURRENT_YEAR)}
                />
              </div>
            </div>
          </section>

          {/* Salary Components */}
          <section>
            <h3 className="text-xs font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" />مكونات الراتب (ريال)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {FORM_FIELDS.map(({ k, label, icon: Icon, color }) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      className={`${inputCls} pl-8`}
                      dir="ltr"
                      min={0}
                      value={form[k] as string | number}
                      onChange={e => set(k, e.target.value)}
                    />
                    <Icon size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${color}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Net Salary */}
          <div className={`p-5 rounded-2xl border-2 ${net >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                  صافي الراتب (محسوب تلقائياً)
                </p>
                <p className={`text-2xl font-bold ${net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {net.toLocaleString("ar-SA")} ريال
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                <DollarSign size={22} className={net >= 0 ? "text-emerald-600" : "text-red-500"} />
              </div>
            </div>
          </div>

          {/* Confirmation Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-[#1B5E4F]">تأكيد الراتب</p>
              <p className="text-xs text-gray-400 mt-0.5">الراتب المؤكد لا يمكن تعديله لاحقاً</p>
            </div>
            <button
              type="button"
              onClick={() => set("isConfirmed", !form.isConfirmed)}
              aria-label="تأكيد الراتب"
              className={`w-12 h-6 rounded-full transition-all duration-300 relative shrink-0 ${
                form.isConfirmed ? "bg-[#1B5E4F]" : "bg-gray-200"
              }`}
            >
              <div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all duration-300"
                style={{ left: form.isConfirmed ? "26px" : "2px" }}
              />
            </button>
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
            disabled={saving || (mode === "add" && !form.employeeId)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            {mode === "add" ? "إضافة الراتب" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  empName:   string;
  month:     number;
  year:      number;
  deleting:  boolean;
  onConfirm: () => void;
  onClose:   () => void;
}

const DeleteModal = ({ empName, month, year, deleting, onConfirm, onClose }: DeleteModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
    <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={28} />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        هل أنت متأكد من حذف راتب{" "}
        <span className="font-bold text-red-600">{empName}</span>
        <br />
        لشهر <span className="font-bold">{MONTHS[month - 1]} {year}</span>؟
        <br />
        <span className="text-xs text-gray-400">هذا الإجراء لا يمكن التراجع عنه.</span>
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
        >
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── Salary Card ──────────────────────────────────────────────────────────────

interface SalaryCardProps {
  salary:   Salary;
  empName:  string;
  onEdit:   () => void;
  onDelete: () => void;
}

const CARD_ROWS: Omit<SalaryRowField, "value">[] = [
  { label: "الأساسي", icon: DollarSign,   cls: "text-gray-600"    },
  { label: "البدلات", icon: TrendingUp,   cls: "text-emerald-600" },
  { label: "إضافي",  icon: Clock,        cls: "text-blue-600"    },
  { label: "مكافأة", icon: Award,        cls: "text-purple-600"  },
  { label: "خصومات", icon: TrendingDown, cls: "text-red-500"     },
];

const SalaryCard = ({ salary, empName, onEdit, onDelete }: SalaryCardProps) => {
  const initials = empName
    .split(" ")
    .map(n => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rowValues: number[] = [
    salary.baseSalary,
    salary.allowances,
    salary.overtimeAmount,
    salary.bonusAmount,
    salary.deductions,
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#B8976B]/15 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <div className={`h-1 w-full ${salary.isConfirmed
        ? "bg-gradient-to-l from-emerald-500 to-emerald-600"
        : "bg-gradient-to-l from-[#B8976B] to-[#9A7D5B]"
      }`} />

      <div className="p-5">
        {/* Head */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center text-white font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1B5E4F] text-sm truncate">{empName}</p>
              <p className="text-xs text-gray-400">{MONTHS[salary.month - 1]} {salary.year}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
            salary.isConfirmed
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {salary.isConfirmed
              ? <><CheckSquare size={10} />مؤكد</>
              : <><XSquare    size={10} />غير مؤكد</>
            }
          </span>
        </div>

        {/* Net salary */}
        <div className="bg-[#F5F1E8]/60 rounded-xl p-3 mb-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B] mb-1">صافي الراتب</p>
          <p className="text-2xl font-bold text-[#1B5E4F]">
            {salary.netSalary.toLocaleString("ar-SA")}
            <span className="text-sm font-semibold text-gray-400 mr-1">ريال</span>
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 mb-4">
          {CARD_ROWS.map(({ label, icon: Icon, cls }, idx) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon size={11} className={cls} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <span className={`text-xs font-semibold ${cls}`}>
                {rowValues[idx].toLocaleString("ar-SA")}
              </span>
            </div>
          ))}
        </div>

        <div className="h-px bg-gradient-to-l from-transparent via-[#B8976B]/15 to-transparent mb-4" />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 py-2 rounded-xl border-2 border-[#1B5E4F]/15 text-[#1B5E4F] text-xs font-semibold hover:bg-[#F5F1E8] transition-all flex items-center justify-center gap-1.5"
          >
            <Edit size={12} />تعديل
          </button>
          <button
            onClick={onDelete}
            className="py-2 px-3 rounded-xl border-2 border-red-100 text-red-500 text-xs font-semibold hover:bg-red-50 transition-all flex items-center justify-center"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string | number;
  icon:  LucideIcon;
  color: string;
}

export default function SalaryPage() {
  const qc = useQueryClient();

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear,  setFilterYear]  = useState<string>("");
  const [filterConf,  setFilterConf]  = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [search,      setSearch]      = useState("");
  const [modal,       setModal]       = useState<ModalType>(null);
  const [selected,    setSelected]    = useState<Salary | null>(null);
  const [formError,   setFormError]   = useState<string | null>(null);

  const serverParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (filterMonth) p.Month       = filterMonth;
    if (filterYear)  p.Year        = filterYear;
    if (filterConf)  p.IsConfirmed = filterConf;
    return p;
  }, [filterMonth, filterYear, filterConf]);

  // ── Queries
  const { data: rawSal, isLoading, isError, error } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn:  () => fetchSalaries(serverParams),
    staleTime: 30_000,
  });

  const { data: rawEmp } = useQuery({
    queryKey: ["employees-all"],
    queryFn:  fetchEmployees,
    staleTime: 60_000,
  });

  const salaries:  Salary[]   = normalize<Salary>(rawSal);
  const employees: Employee[] = normalize<Employee>(rawEmp);

  const empMap = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );

  const getEmpName = (id: string): string => {
    const e = empMap.get(id);
    return e ? `${e.employeeFirstName} ${e.employeeLastName}` : id;
  };

  const displayed = useMemo(
    () => search
      ? salaries.filter(s =>
          getEmpName(s.employeeId).toLowerCase().includes(search.toLowerCase()),
        )
      : salaries,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [salaries, search, empMap],
  );

  const totalNet  = salaries.reduce((a, s) => a + s.netSalary,  0);
  const totalBase = salaries.reduce((a, s) => a + s.baseSalary, 0);
  const confirmed = salaries.filter(s => s.isConfirmed).length;

  const statCards: StatCard[] = [
    { label: "إجمالي صافي الرواتب", value: `${totalNet.toLocaleString("ar-SA")} ﷼`,  icon: DollarSign,  color: "from-[#1B5E4F] to-[#0F4F3E]"   },
    { label: "إجمالي الأساسي",       value: `${totalBase.toLocaleString("ar-SA")} ﷼`, icon: TrendingUp,  color: "from-[#B8976B] to-[#9A7D5B]"    },
    { label: "سجلات مؤكدة",         value: confirmed,                                  icon: CheckSquare, color: "from-emerald-500 to-emerald-600" },
    { label: "إجمالي السجلات",       value: salaries.length,                           icon: Calendar,    color: "from-[#4A4A4A] to-[#2A2A2A]"    },
  ];

  // ── Modal helpers
  const closeModal  = () => { setModal(null); setSelected(null); setFormError(null); };
  const openAdd     = () => { setSelected(null); setFormError(null); setModal("add");    };
  const openEdit    = (s: Salary)  => { setSelected(s);    setFormError(null); setModal("edit");   };
  const openDelete  = (s: Salary)  => { setSelected(s);                        setModal("delete"); };

  // ── Optimistic ADD
  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data: SalaryFormData) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: Salary = { id: `temp-${Date.now()}`, ...toAddBody(data) };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize<Salary>(old), temp,
      ]);
      closeModal();
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: [unknown, unknown]) => qc.setQueryData(key, val));
      setFormError(e.message);
      setModal("add");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Optimistic EDIT
  const editMutation = useMutation({
    mutationFn: apiUpdate,
    onMutate: async ({ id, data }: { id: string; data: SalaryFormData }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize<Salary>(old).map(s => s.id === id ? { ...s, ...toPutBody(data) } : s),
      );
      closeModal();
      return { prev };
    },
    onError: (e: Error, vars, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: [unknown, unknown]) => qc.setQueryData(key, val));
      setFormError(e.message);
      setSelected(salaries.find(s => s.id === vars.id) ?? null);
      setModal("edit");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Optimistic DELETE
  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize<Salary>(old).filter(s => s.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: [unknown, unknown]) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const handleSave = (data: SalaryFormData) => {
    setFormError(null);
    if (modal === "add")                   addMutation.mutate(data);
    else if (modal === "edit" && selected) editMutation.mutate({ id: selected.id, data });
  };

  // ── Render
  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              إدارة الرواتب
            </h1>
            <p className="text-gray-400 text-sm mt-1">متابعة رواتب وحوافز الموظفين</p>
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
              onClick={openAdd}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
            >
              <Plus size={17} />إضافة راتب
            </button>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#B8976B]/10 p-4 flex items-center gap-3 shadow-sm">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={17} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1B5E4F] truncate">{String(value)}</p>
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
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]" size={16} />
              <input
                type="text"
                placeholder="بحث باسم الموظف..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
              />
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                showFilters
                  ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                  : "text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]"
              }`}
            >
              <Filter size={16} />تصفية
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">الشهر</label>
                <div className="relative">
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="w-full appearance-none pl-7 pr-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">السنة</label>
                <input
                  type="number"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  dir="ltr"
                  placeholder={String(CURRENT_YEAR)}
                  min={2000}
                  max={2100}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#1B5E4F]/60 uppercase tracking-widest mb-1.5">حالة التأكيد</label>
                <div className="relative">
                  <select
                    value={filterConf}
                    onChange={e => setFilterConf(e.target.value)}
                    className="w-full appearance-none pl-7 pr-3 py-2 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    <option value="true">مؤكد</option>
                    <option value="false">غير مؤكد</option>
                  </select>
                  <ChevronDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={36} />
            <p className="text-gray-400 text-sm">جاري تحميل سجلات الرواتب...</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <p className="text-gray-400 text-sm">{(error as Error)?.message ?? "فشل تحميل البيانات"}</p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })}
              className="px-5 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && (
          displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map(s => (
                <SalaryCard
                  key={s.id}
                  salary={s}
                  empName={getEmpName(s.employeeId)}
                  onEdit={() => openEdit(s)}
                  onDelete={() => openDelete(s)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-[#F5F1E8] flex items-center justify-center">
                <DollarSign className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">لا توجد سجلات رواتب</h3>
              <p className="text-gray-400 text-sm mb-6">ابدأ بإضافة راتب الموظف الأول</p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg text-sm"
              >
                <Plus size={16} />إضافة راتب
              </button>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <SalaryModal
          mode={modal}
          initial={modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM}
          employees={employees}
          empName={modal === "edit" && selected ? getEmpName(selected.employeeId) : undefined}
          saving={addMutation.isPending || editMutation.isPending}
          error={formError}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          empName={getEmpName(selected.employeeId)}
          month={selected.month}
          year={selected.year}
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}