import { useState } from "react";
import { useAuth } from "../../context/AuthContext"; // adjust path if needed
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Tag,
  Building2,
  Hash,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  sectorId: string;
  sectorName?: string;
  projectId?: string;
  expenseAmount: number;
  sectorNumber?: number;
  amount: number;
  expenseType: "Employee" | "Purchase" | "Supplies" | "Service" | "Equipment";
  expenseDate: string;
  description?: string;
  category?: string;
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "Paid";
  requestedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  receiptNumber?: string;
  isConfirmed: boolean;
  confirmedBy?: string;
  confirmedDate?: string;
  isPaid: boolean;
  paidDate?: string;
  hoursWorked?: number;
  confirm: boolean;
  notes?: string;
}

interface Sector {
  id: string;
  name: string;
}

interface ExpenseFormData {
  sectorId: string;
  projectId: string;
  expenseAmount: number | string;
  sectorNumber: number | string;
  amount: number | string;
  expenseType: Expense["expenseType"];
  expenseDate: string;
  description: string;
  category: string;
  status: Expense["status"];
  requestedBy: string;
  approvedBy: string;
  approvedDate: string;
  rejectionReason: string;
  receiptNumber: string;
  isConfirmed: boolean;
  confirmedBy: string;
  confirmedDate: string;
  isPaid: boolean;
  paidDate: string;
  hoursWorked: number | string;
  confirm: boolean;
  notes: string;
}

// ── Fix: required ULID fields must never be empty/null ───────────────────────
// approvedBy / confirmedBy require a valid ULID — pass the logged-in user's id.
const makeEmptyForm = (userId: string): ExpenseFormData => ({
  sectorId: "",
  projectId: "",
  expenseAmount: "",
  sectorNumber: "",
  amount: "",
  expenseType: "Employee",
  expenseDate: "",
  description: "",
  category: "",
  status: "Draft",
  requestedBy: "",
  approvedBy: userId,
  approvedDate: "",
  rejectionReason: "N/A",
  receiptNumber: "AUTO",
  isConfirmed: false,
  confirmedBy: userId,
  confirmedDate: "",
  isPaid: false,
  paidDate: "",
  hoursWorked: "",
  confirm: false,
  notes: "",
});

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["expenses"] as const;

// ─── API ──────────────────────────────────────────────────────────────────────

const authFetch = async (url: string, options: RequestInit = {}) => {
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
    // Log full error so dev can see exactly which field the API rejected
    console.error(`[API ${res.status}] ${url}`, t);
    let pretty = t;
    try {
      const parsed = JSON.parse(t);
      // Surface validation errors array if present
      if (parsed?.errors) {
        pretty = parsed.errors
          .map((e: any) => e.code ?? e.description ?? JSON.stringify(e))
          .join(" | ");
      } else if (parsed?.title) {
        pretty = parsed.title;
      }
    } catch {}
    throw new Error(pretty || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const toNum = (v: number | string) => (v === "" ? 0 : Number(v));
const toStr = (v: string) => (v.trim() === "" ? null : v.trim());
const toDate = (v: string) => (v.trim() === "" ? null : v.trim());

// ── Expense payload ──────────────────────────────────────────────────────────
// approvedBy / confirmedBy are seeded from the auth context in makeEmptyForm()
// so they always arrive as valid ULIDs — toPayload just passes them through.
const toPayload = (d: ExpenseFormData) => {
  const payload: Record<string, unknown> = {
    sectorId: toStr(d.sectorId) ?? "",
    amount: toNum(d.amount),
    expenseType: d.expenseType,
    expenseDate: toDate(d.expenseDate),
    description: toStr(d.description),
    category: toStr(d.category),
    status: d.status,
    rejectionReason: toStr(d.rejectionReason) ?? "N/A",
    receiptNumber: toStr(d.receiptNumber) ?? "AUTO",
    approvedBy: d.approvedBy, // ULID — seeded from currentUserId
    confirmedBy: d.confirmedBy, // ULID — seeded from currentUserId
    isConfirmed: d.isConfirmed,
    isPaid: d.isPaid,
    confirm: d.confirm,
    notes: toStr(d.notes),
  };

  if (d.projectId.trim()) payload.projectId = d.projectId.trim();
  if (d.requestedBy.trim()) payload.requestedBy = d.requestedBy.trim();
  if (d.approvedDate.trim()) payload.approvedDate = d.approvedDate.trim();
  if (d.confirmedDate.trim()) payload.confirmedDate = d.confirmedDate.trim();
  if (d.paidDate.trim()) payload.paidDate = d.paidDate.trim();
  if (d.hoursWorked !== "") payload.hoursWorked = toNum(d.hoursWorked);

  return payload;
};

const fetchExpenses = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Expense/Get-All${qs ? `?${qs}` : ""}`);
};
// After POST the API returns only the new ULID string — fetch the full item so
// we can cache it with a real id and enable Edit / Delete immediately.
const fetchExpenseById = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Expense/${id}`);

const fetchSectors = () => authFetch(`${API_BASE}/Api/V1/Sector/Get-All`);
const apiAdd = (data: ExpenseFormData) =>
  authFetch(`${API_BASE}/Api/V1/Expense/Add`, {
    method: "POST",
    body: JSON.stringify(toPayload(data)),
  });
const apiUpdate = ({ id, data }: { id: string; data: ExpenseFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Expense/${id}`, {
    method: "PUT",
    body: JSON.stringify(toPayload(data)),
  });
const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Expense/${id}`, { method: "DELETE" });

// ⚠️  GET-All does NOT return `id` — backend limitation.
// For newly-added items we fetch by id after POST and inject the real ULID.
// For pre-existing items loaded from GET-All we synthesise a fallback key so
// React lists render without warnings; Edit/Delete are disabled for those.
const hasRealId = (id: string) => Boolean(id) && !id.startsWith("fallback-");

const normalize = (raw: unknown): Expense[] => {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? []);
  return arr.map((e, i) => ({
    ...e,
    id: e.id ?? e.expenseId ?? e.Id ?? `fallback-${i}`,
  }));
};
const normSectors = (raw: unknown): Sector[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

// ─── Config maps ──────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> =
  {
    Draft: {
      label: "مسودة",
      cls: "bg-gray-100 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
    },
    Pending: {
      label: "قيد المراجعة",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    Approved: {
      label: "معتمد",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
    Rejected: {
      label: "مرفوض",
      cls: "bg-red-50 text-red-600 border-red-200",
      dot: "bg-red-500",
    },
    Paid: {
      label: "مدفوع",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
  };

const TYPE_MAP: Record<string, string> = {
  Employee: "موظف",
  Purchase: "مشتريات",
  Supplies: "مستلزمات",
  Service: "خدمات",
  Equipment: "معدات",
};

const TYPE_COLORS: Record<string, string> = {
  Employee: "bg-purple-50 text-purple-700 border-purple-200",
  Purchase: "bg-blue-50 text-blue-700 border-blue-200",
  Supplies: "bg-amber-50 text-amber-700 border-amber-200",
  Service: "bg-teal-50 text-teal-700 border-teal-200",
  Equipment: "bg-orange-50 text-orange-700 border-orange-200",
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    cls: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
  >
    <Tag size={10} />
    {TYPE_MAP[type] ?? type}
  </span>
);

// ─── Expense Form Modal ───────────────────────────────────────────────────────

const ExpenseModal = ({
  mode,
  initial,
  sectors,
  saving,
  error,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: ExpenseFormData;
  sectors: Sector[];
  saving: boolean;
  error?: string | null;
  onSave: (d: ExpenseFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<ExpenseFormData>(initial);
  const set = (k: keyof ExpenseFormData, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "block text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "إضافة مصروف جديد" : "تعديل المصروف"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add" ? "أدخل بيانات المصروف" : "تحديث بيانات المصروف"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-6 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> البيانات الأساسية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>القطاع</label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.sectorId}
                    onChange={(e) => set("sectorId", e.target.value)}
                  >
                    <option value="">-- اختر القطاع --</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>نوع المصروف</label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.expenseType}
                    onChange={(e) =>
                      set(
                        "expenseType",
                        e.target.value as Expense["expenseType"],
                      )
                    }
                  >
                    {Object.entries(TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>المبلغ</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>تاريخ المصروف</label>
                <input
                  type="date"
                  className={inputCls}
                  dir="ltr"
                  value={form.expenseDate ? form.expenseDate.split("T")[0] : ""}
                  onChange={(e) =>
                    set(
                      "expenseDate",
                      e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                    )
                  }
                />
              </div>
              <div>
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.status}
                    onChange={(e) =>
                      set("status", e.target.value as Expense["status"])
                    }
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
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
              <div>
                <label className={labelCls}>الفئة</label>
                <input
                  className={inputCls}
                  placeholder="الفئة"
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>رقم الإيصال</label>
                <input
                  className={inputCls}
                  placeholder="RCP-001"
                  value={form.receiptNumber}
                  onChange={(e) => set("receiptNumber", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الوصف</label>
                <textarea
                  className={inputCls + " resize-none h-20"}
                  placeholder="وصف المصروف..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Hours Worked — only for Employee type */}
          {form.expenseType === "Employee" && (
            <section>
              <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-[#B8976B]" /> بيانات الموظف
              </h3>
              <div>
                <label className={labelCls}>ساعات العمل</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="0"
                  value={form.hoursWorked}
                  onChange={(e) => set("hoursWorked", e.target.value)}
                  dir="ltr"
                />
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> ملاحظات
            </h3>
            <textarea
              className={inputCls + " resize-none h-20"}
              placeholder="ملاحظات إضافية..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </section>
        </div>

        <div className="px-8 py-5 bg-gray-50 border-t border-[#B8976B]/10 flex gap-3 justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border-2 border-[#B8976B]/30 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {mode === "add" ? "إضافة المصروف" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  description,
  deleting,
  onConfirm,
  onClose,
}: {
  description: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    dir="rtl"
  >
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
      <p className="text-gray-500 text-sm mb-6">
        هل أنت متأكد من حذف المصروف{" "}
        <span className="font-bold text-red-600">{description}</span>؟
        <br />
        <span className="text-xs">هذا الإجراء لا يمكن التراجع عنه.</span>
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}{" "}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── Expense Card ─────────────────────────────────────────────────────────────

const ExpenseCard = ({
  expense,
  onEdit,
  onDelete,
  onView,
}: {
  expense: Expense;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const canMutate = hasRealId(expense.id);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
      {/* No-ID warning banner */}
      {!canMutate && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-700 font-semibold">
            التعديل/الحذف غير متاح — الـ API لا يُعيد ID لهذا المصروف
          </span>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#B8976B]/10 rounded-full" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center shadow-lg shrink-0">
              <CreditCard className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/60 mb-0.5">
                {TYPE_MAP[expense.expenseType] ?? expense.expenseType}
              </p>
              <p className="text-xl font-bold text-white leading-tight">
                {(expense.amount ?? expense.expenseAmount)?.toLocaleString(
                  "ar-SA",
                )}
                <span className="text-white/60 text-sm font-normal mr-1">
                  ريال
                </span>
              </p>
              <div className="mt-1.5">
                <StatusBadge status={expense.status} />
              </div>
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setOpen((o) => !o)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
            >
              <MoreVertical className="text-white/70" size={18} />
            </button>
            {open && (
              <div className="absolute left-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-[#B8976B]/10 overflow-hidden z-30">
                {[
                  {
                    icon: Eye,
                    label: "عرض التفاصيل",
                    color: "text-[#1B5E4F]",
                    action: onView,
                    disabled: false,
                  },
                  {
                    icon: Edit,
                    label: "تعديل",
                    color: "text-blue-600",
                    action: onEdit,
                    disabled: !canMutate,
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    color: "text-red-500",
                    action: onDelete,
                    disabled: !canMutate,
                  },
                ].map(({ icon: Icon, label, color, action, disabled }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (disabled) return;
                      action();
                      setOpen(false);
                    }}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                      disabled
                        ? "opacity-40 cursor-not-allowed"
                        : `hover:bg-gray-50 ${color}`
                    } ${!disabled ? color : "text-gray-400"}`}
                  >
                    <Icon size={15} />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-center gap-2 text-[#4A4A4A]">
          <Building2 size={14} className="text-[#B8976B] shrink-0" />
          <span className="text-sm truncate">
            {expense.sectorName ?? expense.sectorId}
          </span>
        </div>
        {expense.description && (
          <div className="flex items-start gap-2 text-[#4A4A4A]">
            <FileText size={14} className="text-[#B8976B] shrink-0 mt-0.5" />
            <span className="text-sm line-clamp-2">{expense.description}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[#4A4A4A]">
          <Calendar size={14} className="text-[#B8976B] shrink-0" />
          <span className="text-sm">
            {expense.expenseDate
              ? new Date(expense.expenseDate).toLocaleDateString("ar-SA")
              : "—"}
          </span>
        </div>
        {expense.receiptNumber && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Hash size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs font-mono text-gray-400" dir="ltr">
              {expense.receiptNumber}
            </span>
          </div>
        )}

        <div className="h-px bg-gradient-to-r from-transparent via-[#B8976B]/20 to-transparent" />

        <div className="flex flex-wrap gap-2">
          <TypeBadge type={expense.expenseType} />
          {expense.isPaid && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <CheckCircle2 size={10} />
              مدفوع
            </span>
          )}
          {expense.isConfirmed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={10} />
              مؤكد
            </span>
          )}
        </div>

        {expense.category && (
          <p className="text-xs text-gray-400">
            الفئة:{" "}
            <span className="font-semibold text-[#1B5E4F]">
              {expense.category}
            </span>
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onView}
          className="w-full py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <DollarSign size={15} />
          عرض التفاصيل كاملة
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ExpensesPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  // The backend requires a valid ULID for approvedBy / confirmedBy
  const currentUserId = user?.userId ?? "";

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<Expense | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status = filterStatus;
  if (filterType) serverParams.ExpenseType = filterType;

  const {
    data: rawExpenses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchExpenses(serverParams),
    staleTime: 30_000,
  });

  const { data: rawSectors } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 60_000,
  });

  const expenses: Expense[] = normalize(rawExpenses);
  const sectors: Sector[] = normSectors(rawSectors);

  const displayed = search
    ? expenses.filter(
        (e) =>
          (e.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (e.sectorName ?? e.sectorId)
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (e.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (e.receiptNumber ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : expenses;

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError(null);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      // Optimistic temp item — replaced by the real one in onSuccess
      const temp: Expense = {
        id: `temp-${Date.now()}`,
        ...(toPayload(data) as any),
        sectorName: sectors.find((s) => s.id === data.sectorId)?.name,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize(old),
        temp,
      ]);
      closeModal();
      return { prev, tempId: temp.id };
    },
    onSuccess: async (newId: string, data, ctx: any) => {
      // POST returns the real ULID string — fetch the full item and replace temp
      try {
        const full = await fetchExpenseById(newId);
        const item: Expense = {
          ...full,
          id: newId,
          sectorName: sectors.find((s) => s.id === data.sectorId)?.name,
        };
        qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
          normalize(old).map((e) => (e.id === ctx.tempId ? item : e)),
        );
      } catch {
        // If individual fetch fails, a full refetch will happen in onSettled
      }
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setModal("add");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const editMutation = useMutation({
    mutationFn: apiUpdate,
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).map((e) =>
          e.id === id
            ? {
                ...e,
                ...toPayload(data),
                sectorName: sectors.find((s) => s.id === data.sectorId)?.name,
              }
            : e,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(expenses.find((e) => e.id === vars.id) ?? null);
      setModal("edit");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).filter((e) => e.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toFormData = (e: Expense): ExpenseFormData => ({
    sectorId: e.sectorId,
    projectId: e.projectId ?? "",
    expenseAmount: e.expenseAmount,
    sectorNumber: e.sectorNumber ?? "",
    amount: e.amount,
    expenseType: e.expenseType,
    expenseDate: e.expenseDate,
    description: e.description ?? "",
    category: e.category ?? "",
    status: e.status,
    requestedBy: e.requestedBy ?? "",
    approvedBy: e.approvedBy || currentUserId, // ← real ULID from auth
    approvedDate: e.approvedDate ?? "",
    rejectionReason: e.rejectionReason ?? "N/A",
    receiptNumber: e.receiptNumber ?? "AUTO",
    isConfirmed: e.isConfirmed,
    confirmedBy: e.confirmedBy || currentUserId, // ← real ULID from auth
    confirmedDate: e.confirmedDate ?? "",
    isPaid: e.isPaid,
    paidDate: e.paidDate ?? "",
    hoursWorked: e.hoursWorked ?? "",
    confirm: e.confirm ?? false,
    notes: e.notes ?? "",
  });

  const handleSave = (data: ExpenseFormData) => {
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  // Totals
  const totalAmount = displayed.reduce(
    (s, e) => s + (e.amount ?? e.expenseAmount ?? 0),
    0,
  );
  const paidAmount = displayed
    .filter((e) => e.isPaid)
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingCount = displayed.filter((e) => e.status === "Pending").length;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              إدارة المصروفات
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              إجمالي المصروفات:{" "}
              <span className="font-bold text-[#1B5E4F]">
                {displayed.length}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              setSelected(null);
              setFormError(null);
              setModal("add");
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all self-start sm:self-auto"
          >
            <Plus size={18} />
            إضافة مصروف
          </button>
        </div>

        {/* Summary */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "إجمالي المصروفات",
                value: totalAmount.toLocaleString("ar-SA") + " ريال",
                color: "from-[#1B5E4F] to-[#0F4F3E]",
                icon: DollarSign,
              },
              {
                label: "المدفوع",
                value: paidAmount.toLocaleString("ar-SA") + " ريال",
                color: "from-emerald-600 to-emerald-700",
                icon: CheckCircle2,
              },
              {
                label: "قيد المراجعة",
                value: `${pendingCount} مصروف`,
                color: "from-amber-600 to-amber-700",
                icon: AlertTriangle,
              },
            ].map(({ label, value, color, icon: Icon }) => (
              <div
                key={label}
                className={`bg-gradient-to-l ${color} rounded-2xl p-5 text-white shadow-md`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-sm font-semibold">{label}</p>
                  <Icon size={20} className="text-white/50" />
                </div>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px] relative">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]"
                size={17}
              />
              <input
                type="text"
                placeholder="بحث بالوصف، القطاع، الفئة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
              />
            </div>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${showFilters ? "bg-[#1B5E4F] text-white border-[#1B5E4F]" : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]"}`}
            >
              <Filter size={16} />
              تصفية
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  الحالة
                </label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">جميع الحالات</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
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
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  نوع المصروف
                </label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">جميع الأنواع</option>
                    {Object.entries(TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm font-medium">
              جاري تحميل المصروفات...
            </p>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
            <p className="text-gray-500 text-sm">
              فشل تحميل البيانات: {(error as Error)?.message}
            </p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })}
              className="px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading &&
          !isError &&
          (displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map((e) => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  onEdit={() => {
                    setSelected(e);
                    setFormError(null);
                    setModal("edit");
                  }}
                  onDelete={() => {
                    setSelected(e);
                    setModal("delete");
                  }}
                  onView={() => {
                    setSelected(e);
                    setModal("view");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <CreditCard className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد مصروفات
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على مصروفات مطابقة
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <ExpenseModal
          mode={modal}
          initial={
            modal === "edit" && selected
              ? toFormData(selected)
              : makeEmptyForm(currentUserId)
          }
          sectors={sectors}
          saving={addMutation.isPending || editMutation.isPending}
          error={formError}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          description={
            selected.description ??
            `مصروف ${(selected.amount ?? selected.expenseAmount)?.toLocaleString("ar-SA")} ريال`
          }
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          onClose={closeModal}
        />
      )}

      {modal === "view" && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6 relative">
              <button
                onClick={closeModal}
                className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg"
              >
                <X className="text-white" size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center shadow-lg">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {(
                      selected.amount ?? selected.expenseAmount
                    )?.toLocaleString("ar-SA")}{" "}
                    <span className="text-white/60 text-base font-normal">
                      ريال
                    </span>
                  </p>
                  <p className="text-white/60 text-sm">
                    {TYPE_MAP[selected.expenseType]}
                  </p>
                  <div className="mt-1.5 flex gap-2 flex-wrap">
                    <StatusBadge status={selected.status} />
                    {selected.isPaid && (
                      <span className="text-xs bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-full font-semibold">
                        مدفوع
                      </span>
                    )}
                    {selected.isConfirmed && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        مؤكد
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm max-h-96 overflow-y-auto">
              {(
                [
                  ["القطاع", selected.sectorName ?? selected.sectorId],
                  [
                    "التاريخ",
                    selected.expenseDate
                      ? new Date(selected.expenseDate).toLocaleDateString(
                          "ar-SA",
                        )
                      : "—",
                  ],
                  ["الفئة", selected.category ?? "—"],
                  ["رقم الإيصال", selected.receiptNumber ?? "—"],
                  [
                    "ساعات العمل",
                    selected.hoursWorked ? String(selected.hoursWorked) : "—",
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    {label}
                  </p>
                  <p className="font-semibold text-[#1B5E4F]">{value}</p>
                </div>
              ))}
              {selected.description && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    الوصف
                  </p>
                  <p className="text-sm text-gray-600">
                    {selected.description}
                  </p>
                </div>
              )}
              {selected.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    ملاحظات
                  </p>
                  <p className="text-sm text-gray-600">{selected.notes}</p>
                </div>
              )}
              {selected.rejectionReason &&
                selected.rejectionReason !== "N/A" && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-0.5">
                      سبب الرفض
                    </p>
                    <p className="text-sm text-red-600">
                      {selected.rejectionReason}
                    </p>
                  </div>
                )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  closeModal();
                  setSelected(selected);
                  setFormError(null);
                  setModal("edit");
                }}
                disabled={!hasRealId(selected.id)}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#1B5E4F]/20 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Edit size={15} />
                تعديل
              </button>
              <button
                onClick={() => {
                  closeModal();
                  setSelected(selected);
                  setModal("delete");
                }}
                disabled={!hasRealId(selected.id)}
                className="py-2.5 px-4 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
