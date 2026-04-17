import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle2,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  FileText,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  sectorId: string;
  sectorName?: string;
  year: number;
  estimatedBudget: number;
  isConfirmed: boolean;
  limit: number;
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  budgetLimit: number;
  status: "Draft" | "Submitted" | "Approved" | "Active" | "Exceeded";
  confirmedBy?: string;
  confirmedDate?: string;
  notes?: string;
}

interface Sector {
  id: string;
  name: string;
}

interface BudgetFormData {
  sectorId: string;
  year: number | string;
  estimatedBudget: number | string;
  isConfirmed: boolean;
  limit: number | string;
  totalBudget: number | string;
  allocatedAmount: number | string;
  spentAmount: number | string;
  remainingAmount: number | string;
  budgetLimit: number | string;
  status: Budget["status"];
  confirmedBy: string;
  confirmedDate: string;
  notes: string;
}

const EMPTY_FORM: BudgetFormData = {
  sectorId: "",
  year: new Date().getFullYear(),
  estimatedBudget: "",
  isConfirmed: false,
  limit: "",
  totalBudget: "",
  allocatedAmount: "",
  spentAmount: "",
  remainingAmount: "",
  budgetLimit: "",
  status: "Draft",
  confirmedBy: "",
  confirmedDate: "",
  notes: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["budgets"] as const;

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
    console.error(`[API ${res.status}] ${url}`, t);
    let pretty = t;
    try {
      const parsed = JSON.parse(t);
      if (parsed?.errors) {
        if (Array.isArray(parsed.errors)) {
          pretty = parsed.errors
            .map((e: any) => e.code ?? e.description ?? JSON.stringify(e))
            .join(" | ");
        } else {
          pretty = Object.entries(parsed.errors)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join(" | ");
        }
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

const toDate = (v: string): string | null => {
  if (!v || v.trim() === "") return null;
  const s = v.trim();
  return s.includes("T") ? s : `${s}T00:00:00.000Z`;
};

const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

const getUserId = () => getUser()?.userId ?? null;

const BUDGET_STATUS_ENUM: Record<string, number> = {
  Draft: 1,
  Submitted: 2,
  Approved: 3,
  Active: 4,
  Exceeded: 5,
};

const BUDGET_STATUS_STR: Record<number, Budget["status"]> = {
  1: "Draft",
  2: "Submitted",
  3: "Approved",
  4: "Active",
  5: "Exceeded",
};

const toPayload = (d: BudgetFormData) => ({
  sectorId: toStr(d.sectorId) ?? "",
  year: toNum(d.year),
  estimatedBudget: toNum(d.estimatedBudget),
  isConfirmed: d.isConfirmed,
  limit: toNum(d.limit),
  totalBudget: toNum(d.totalBudget),
  allocatedAmount: toNum(d.allocatedAmount),
  spentAmount: toNum(d.spentAmount),
  remainingAmount: toNum(d.remainingAmount),
  budgetLimit: toNum(d.budgetLimit),
  status: BUDGET_STATUS_ENUM[d.status] ?? 0,
  confirmedBy: getUserId() ?? toStr(d.confirmedBy),
  confirmedDate:
    toDate(d.confirmedDate) ??
    (d.isConfirmed ? new Date().toISOString() : null),
  notes: toStr(d.notes),
});

const fetchBudgets = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Budget/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchBudgetById = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Budget/${id}`);

const fetchSectors = () => authFetch(`${API_BASE}/Api/V1/Sector/Get-All`);

const apiAdd = (data: BudgetFormData) =>
  authFetch(`${API_BASE}/Api/V1/Budget/Add`, {
    method: "POST",
    body: JSON.stringify(toPayload(data)),
  });

const apiUpdate = ({ id, data }: { id: string; data: BudgetFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Budget/${id}`, {
    method: "PUT",
    body: JSON.stringify(toPayload(data)),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Budget/${id}`, { method: "DELETE" });

const hasRealId = (id: string) => Boolean(id) && !id.startsWith("fallback-");

const normalize = (raw: unknown, sectors: Sector[] = []): Budget[] => {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? []);
  return arr.map((b, i) => ({
    ...b,
    id: b.id ?? b.budgetId ?? b.Id ?? `fallback-${i}`,
    status:
      typeof b.status === "number"
        ? (BUDGET_STATUS_STR[b.status] ?? "Draft")
        : b.status,
    sectorName:
      b.sectorName ??
      sectors.find((s) => s.id === b.sectorId)?.name ??
      b.sectorId,
  }));
};

const normSectors = (raw: unknown): Sector[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> =
  {
    Draft: {
      label: "مسودة",
      cls: "bg-gray-100 text-gray-600 border-gray-200",
      dot: "bg-gray-400",
    },
    Submitted: {
      label: "مُقدَّم",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
    Approved: {
      label: "معتمد",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    Active: {
      label: "نشط",
      cls: "bg-[#F5F1E8] text-[#1B5E4F] border-[#B8976B]/30",
      dot: "bg-[#1B5E4F]",
    },
    Exceeded: {
      label: "تجاوز",
      cls: "bg-red-50 text-red-600 border-red-200",
      dot: "bg-red-500",
    },
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

const ProgressBar = ({
  value,
  max,
  color = "#1B5E4F",
}: {
  value: number;
  max: number;
  color?: string;
}) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

// ─── Field hint tooltip ───────────────────────────────────────────────────────

const FieldHint = ({ text }: { text: string }) => (
  <span className="group relative inline-flex items-center mr-1.5 cursor-help">
    <Info
      size={12}
      className="text-[#B8976B]/60 hover:text-[#B8976B] transition-colors"
    />
    <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 w-52 rounded-xl bg-[#1B5E4F] px-3 py-2 text-[11px] text-white leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50 whitespace-normal">
      {text}
      <span className="absolute top-full right-3 border-4 border-transparent border-t-[#1B5E4F]" />
    </span>
  </span>
);

// ─── Budget Form Modal ────────────────────────────────────────────────────────

const BudgetModal = ({
  mode,
  initial,
  sectors,
  saving,
  error,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: BudgetFormData;
  sectors: Sector[];
  saving: boolean;
  error?: string | null;
  onSave: (d: BudgetFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<BudgetFormData>(initial);
  const set = (k: keyof BudgetFormData, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Auto-calculate remainingAmount ────────────────────────────────────────
  useEffect(() => {
    const total = Number(form.totalBudget) || 0;
    const spent = Number(form.spentAmount) || 0;
    setForm((f) => ({ ...f, remainingAmount: String(total - spent) }));
  }, [form.totalBudget, form.spentAmount]);

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "flex items-center text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";

  // Amount fields config: [key, arabic label, hint text]
  const amountFields: [keyof BudgetFormData, string, string][] = [
    [
      "estimatedBudget",
      "الميزانية التقديرية",
      "المبلغ المتوقع إنفاقه في بداية السنة المالية قبل الاعتماد الرسمي",
    ],
    [
      "totalBudget",
      "إجمالي الميزانية",
      "المبلغ الإجمالي المعتمد رسمياً والمخصص لهذا القطاع خلال السنة",
    ],
    [
      "allocatedAmount",
      "المبلغ المخصص",
      "ما تم توزيعه وتخصيصه فعلياً على المشاريع والبنود التفصيلية",
    ],
    [
      "spentAmount",
      "المبلغ المنفق",
      "إجمالي ما تم صرفه وإنفاقه فعلياً حتى تاريخ اليوم",
    ],
    [
      "budgetLimit",
      "حد الميزانية",
      "أقصى مبلغ مسموح بالإنفاق منه — يُستخدم كتنبيه عند الاقتراب من الحد",
    ],
    [
      "limit",
      "الحد الأقصى العام",
      "السقف الكلي للميزانية شاملاً الاحتياطيات والطوارئ — لا يجوز تجاوزه",
    ],
  ];

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
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "إضافة ميزانية جديدة" : "تعديل الميزانية"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add"
                ? "أدخل بيانات الميزانية الجديدة"
                : "تحديث بيانات الميزانية"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-6 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> البيانات الأساسية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  القطاع
                  <FieldHint text="اختر القطاع الذي تنتمي إليه هذه الميزانية" />
                </label>
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
                <label className={labelCls}>
                  السنة المالية
                  <FieldHint text="السنة التي تغطيها هذه الميزانية (مثال: 2025)" />
                </label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="2025"
                  value={form.year}
                  onChange={(e) => set("year", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>
                  الحالة
                  <FieldHint text="الحالة الحالية للميزانية في دورة الاعتماد" />
                </label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.status}
                    onChange={(e) =>
                      set("status", e.target.value as Budget["status"])
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
              <div className="flex items-center gap-3 mt-5">
                <input
                  type="checkbox"
                  id="isConfirmed"
                  checked={form.isConfirmed}
                  onChange={(e) => set("isConfirmed", e.target.checked)}
                  className="w-4 h-4 accent-[#1B5E4F]"
                />
                <label
                  htmlFor="isConfirmed"
                  className="text-sm font-semibold text-[#1B5E4F]"
                >
                  مؤكد
                </label>
                <FieldHint text="ضع علامة هنا إذا تم اعتماد الميزانية رسمياً من الجهة المختصة" />
              </div>

              {/* Confirmed date — only shown when isConfirmed is checked */}
              {form.isConfirmed && (
                <div className="col-span-2">
                  <label className={labelCls}>
                    تاريخ التأكيد
                    <FieldHint text="التاريخ الذي تم فيه اعتماد الميزانية رسمياً — إذا تُرك فارغاً سيُعيَّن تاريخ اليوم تلقائياً" />
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={
                      form.confirmedDate ? form.confirmedDate.split("T")[0] : ""
                    }
                    onChange={(e) => set("confirmedDate", e.target.value)}
                    dir="ltr"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    إذا تركته فارغاً سيتم تعيين تاريخ اليوم تلقائياً
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Amounts */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> المبالغ المالية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {amountFields.map(([k, label, hint]) => (
                <div key={k}>
                  <label className={labelCls}>
                    {label}
                    <FieldHint text={hint} />
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={form[k] as any}
                    onChange={(e) => set(k, e.target.value)}
                    dir="ltr"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    {hint}
                  </p>
                </div>
              ))}

              {/* remainingAmount — read-only, auto-calculated */}
              <div className="col-span-2">
                <label className={labelCls}>
                  المبلغ المتبقي
                  <span className="mr-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full normal-case font-semibold tracking-normal border border-emerald-200">
                    ⟳ يُحسب تلقائياً
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={
                      "w-full px-4 py-2.5 border-2 border-emerald-200 rounded-xl bg-emerald-50 text-emerald-700 font-bold cursor-not-allowed outline-none text-sm"
                    }
                    value={form.remainingAmount}
                    readOnly
                    dir="ltr"
                  />
                  {/* Live equation display inside the field */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-medium pointer-events-none">
                    {Number(form.totalBudget) || 0} −{" "}
                    {Number(form.spentAmount) || 0}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  يُحسب تلقائياً من:{" "}
                  <strong className="text-[#1B5E4F]">إجمالي الميزانية</strong> −{" "}
                  <strong className="text-[#1B5E4F]">المبلغ المنفق</strong> — لا
                  يمكن تعديله يدوياً
                </p>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> ملاحظات
            </h3>
            <label className={labelCls}>
              ملاحظات إضافية
              <FieldHint text="أي معلومات إضافية أو تعليقات تتعلق بهذه الميزانية" />
            </label>
            <textarea
              className={inputCls + " resize-none h-24"}
              placeholder="أضف ملاحظات إضافية..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </section>
        </div>

        {/* Footer */}
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
            {mode === "add" ? "إضافة الميزانية" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  year,
  sector,
  deleting,
  onConfirm,
  onClose,
}: {
  year: number;
  sector: string;
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
        هل أنت متأكد من حذف ميزانية{" "}
        <span className="font-bold text-red-600">
          {sector} – {year}
        </span>
        ؟
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

// ─── Budget Card ──────────────────────────────────────────────────────────────

const BudgetCard = ({
  budget,
  onEdit,
  onDelete,
  onView,
}: {
  budget: Budget;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const canMutate = hasRealId(budget.id);
  const spentPct =
    budget.totalBudget > 0
      ? Math.min((budget.spentAmount / budget.totalBudget) * 100, 100)
      : 0;
  const isOver = spentPct >= 100;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
      {!canMutate && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-700 font-semibold">
            التعديل/الحذف غير متاح — الـ API لا يُعيد ID لهذه الميزانية
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
              <TrendingUp className="text-white" size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white leading-tight truncate">
                {budget.sectorName}
              </h3>
              <p className="text-white/60 text-xs mt-0.5">
                السنة المالية {budget.year}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={budget.status} />
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
                        ? "opacity-40 cursor-not-allowed text-gray-400"
                        : `hover:bg-gray-50 ${color}`
                    }`}
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
      <div className="p-5 space-y-4 flex-1">
        {/* Spend progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>نسبة الإنفاق</span>
            <span
              className={`font-bold ${isOver ? "text-red-500" : "text-[#1B5E4F]"}`}
            >
              {spentPct.toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            value={budget.spentAmount}
            max={budget.totalBudget}
            color={isOver ? "#ef4444" : "#1B5E4F"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#B8976B] mb-0.5 flex items-center gap-1">
              <DollarSign size={10} />
              إجمالي الميزانية
            </p>
            <p className="font-bold text-[#1B5E4F]">
              {budget.totalBudget?.toLocaleString("ar-SA")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#B8976B] mb-0.5 flex items-center gap-1">
              <DollarSign size={10} />
              المنفق
            </p>
            <p
              className={`font-bold ${isOver ? "text-red-500" : "text-[#1B5E4F]"}`}
            >
              {budget.spentAmount?.toLocaleString("ar-SA")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#B8976B] mb-0.5 flex items-center gap-1">
              <DollarSign size={10} />
              المتبقي
            </p>
            <p className="font-bold text-emerald-600">
              {budget.remainingAmount?.toLocaleString("ar-SA")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#B8976B] mb-0.5 flex items-center gap-1">
              <Calendar size={10} />
              مؤكد
            </p>
            <p className="font-semibold text-[#1B5E4F]">
              {budget.isConfirmed ? "نعم" : "لا"}
            </p>
          </div>
        </div>

        {budget.notes && (
          <div className="flex items-start gap-2 p-3 bg-[#F5F1E8] rounded-xl">
            <FileText size={13} className="text-[#B8976B] shrink-0 mt-0.5" />
            <p className="text-xs text-[#4A4A4A] leading-relaxed line-clamp-2">
              {budget.notes}
            </p>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onView}
          className="w-full py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <TrendingUp size={15} />
          عرض الميزانية كاملة
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const BudgetsPage = () => {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<Budget | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status = filterStatus;

  const {
    data: rawBudgets,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchBudgets(serverParams),
    staleTime: 30_000,
  });

  const { data: rawSectors } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 60_000,
  });

  const sectors: Sector[] = normSectors(rawSectors);
  const budgets: Budget[] = normalize(rawBudgets, sectors);

  const displayed = search
    ? budgets.filter(
        (b) =>
          (b.sectorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          String(b.year).includes(search) ||
          b.status.toLowerCase().includes(search.toLowerCase()),
      )
    : budgets;

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
      const temp: Budget = {
        id: `temp-${Date.now()}`,
        ...(toPayload(data) as any),
        sectorName:
          sectors.find((s) => s.id === data.sectorId)?.name ?? data.sectorId,
        status: data.status,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize(old, sectors),
        temp,
      ]);
      closeModal();
      return { prev, tempId: temp.id };
    },
    onSuccess: async (newId: string, data, ctx: any) => {
      try {
        const full = await fetchBudgetById(newId);
        const item: Budget = {
          ...full,
          id: newId,
          status:
            typeof full.status === "number"
              ? (BUDGET_STATUS_STR[full.status] ?? "Draft")
              : full.status,
          sectorName:
            full.sectorName ??
            sectors.find((s) => s.id === data.sectorId)?.name ??
            data.sectorId,
        };
        qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
          normalize(old, sectors).map((b) => (b.id === ctx.tempId ? item : b)),
        );
      } catch {
        // fallback: full refetch via onSettled
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
        normalize(old, sectors).map((b) =>
          b.id === id
            ? {
                ...b,
                ...toPayload(data),
                status: data.status,
                sectorName:
                  sectors.find((s) => s.id === data.sectorId)?.name ??
                  b.sectorName,
              }
            : b,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(budgets.find((b) => b.id === vars.id) ?? null);
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
        normalize(old, sectors).filter((b) => b.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toFormData = (b: Budget): BudgetFormData => ({
    sectorId: b.sectorId,
    year: b.year,
    estimatedBudget: b.estimatedBudget,
    isConfirmed: b.isConfirmed,
    limit: b.limit,
    totalBudget: b.totalBudget,
    allocatedAmount: b.allocatedAmount,
    spentAmount: b.spentAmount,
    remainingAmount: b.remainingAmount,
    budgetLimit: b.budgetLimit,
    status: b.status,
    confirmedBy: b.confirmedBy ?? "",
    confirmedDate: b.confirmedDate ? b.confirmedDate.split("T")[0] : "",
    notes: b.notes ?? "",
  });

  const handleSave = (data: BudgetFormData) => {
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  // Summary totals
  const totalBudget = displayed.reduce((s, b) => s + (b.totalBudget ?? 0), 0);
  const totalSpent = displayed.reduce((s, b) => s + (b.spentAmount ?? 0), 0);
  const totalRemain = displayed.reduce(
    (s, b) => s + (b.remainingAmount ?? 0),
    0,
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              إدارة الميزانيات
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              إجمالي الميزانيات:{" "}
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
            إضافة ميزانية
          </button>
        </div>

        {/* Summary Cards */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "إجمالي الميزانيات",
                value: totalBudget,
                color: "from-[#1B5E4F] to-[#0F4F3E]",
                icon: DollarSign,
              },
              {
                label: "إجمالي المنفق",
                value: totalSpent,
                color: "from-amber-600 to-amber-700",
                icon: TrendingUp,
              },
              {
                label: "إجمالي المتبقي",
                value: totalRemain,
                color: "from-emerald-600 to-emerald-700",
                icon: CheckCircle2,
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
                <p className="text-2xl font-bold">
                  {value.toLocaleString("ar-SA")}
                </p>
                <p className="text-white/50 text-xs mt-0.5">ريال</p>
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
                placeholder="بحث بالقطاع أو السنة..."
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
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10">
              <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                الحالة
              </label>
              <div className="relative w-60">
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
          )}
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm font-medium">
              جاري تحميل الميزانيات...
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
              {displayed.map((b) => (
                <BudgetCard
                  key={b.id}
                  budget={b}
                  onEdit={() => {
                    setSelected(b);
                    setFormError(null);
                    setModal("edit");
                  }}
                  onDelete={() => {
                    setSelected(b);
                    setModal("delete");
                  }}
                  onView={() => {
                    setSelected(b);
                    setModal("view");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <TrendingUp className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد ميزانيات
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على ميزانيات مطابقة
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <BudgetModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
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
          year={selected.year}
          sector={selected.sectorName ?? selected.sectorId}
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
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selected.sectorName}
                  </h2>
                  <p className="text-white/60 text-sm">
                    السنة المالية {selected.year}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm max-h-96 overflow-y-auto">
              {(
                [
                  [
                    "إجمالي الميزانية",
                    (selected.totalBudget?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  [
                    "الميزانية التقديرية",
                    (selected.estimatedBudget?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  [
                    "المخصص",
                    (selected.allocatedAmount?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  [
                    "المنفق",
                    (selected.spentAmount?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  [
                    "المتبقي",
                    (selected.remainingAmount?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  [
                    "حد الميزانية",
                    (selected.budgetLimit?.toLocaleString("ar-SA") ?? "—") +
                      " ريال",
                  ],
                  ["مؤكد", selected.isConfirmed ? "نعم" : "لا"],
                  [
                    "تاريخ التأكيد",
                    selected.confirmedDate
                      ? new Date(selected.confirmedDate).toLocaleDateString(
                          "ar-SA",
                        )
                      : "—",
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
              {selected.notes && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    ملاحظات
                  </p>
                  <p className="text-sm text-gray-600">{selected.notes}</p>
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

export default BudgetsPage;
