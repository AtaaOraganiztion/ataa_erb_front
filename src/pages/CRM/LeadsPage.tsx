import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  Plus,
  Layers,
  Clock,
  Award,
  User,
  UserPlus,
  Phone,
  Mail,
  Building2,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost" | "Won";
type LeadStage =
  | "Prospecting"
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "ClosedWon"
  | "ClosedLost";

interface Lead {
  id: string;
  title: string;
  value?: number;
  status: LeadStatus;
  stage: LeadStage;
  expectedCloseDate?: string;
  notes?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  assignedToUserId?: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
}

interface LeadFormData {
  title: string;
  fullName: string;
  value: number | string;
  status: LeadStatus;
  stage: LeadStage;
  expectedCloseDate: string;
  notes: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  assignedToUserId: string;
}

const EMPTY_FORM: LeadFormData = {
  title: "",
  fullName: "",
  value: "",
  status: "New",
  stage: "Prospecting",
  expectedCloseDate: "",
  notes: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  assignedToUserId: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["leads"] as const;
const USERS_QUERY_KEY = ["system-users"] as const;

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
    let msg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          msg =
            json?.message || json?.title || json?.error || JSON.stringify(json);
        } catch {
          msg = text;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchLeads = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Lead/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchUsers = () =>
  authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`);

// Build request body — no customerId, empty strings become null
const buildLeadBody = (data: LeadFormData) => ({
  title: data.title,
  fullName: data.fullName || null,
  value: data.value !== "" ? Number(data.value) : null,
  status: data.status,
  stage: data.stage,
  expectedCloseDate: data.expectedCloseDate || null,
  notes: data.notes || null,
  email: data.email || null,
  phone: data.phone || null,
  company: data.company || null,
  address: data.address || null,
  assignedToUserId: data.assignedToUserId || null,
});

const apiAdd = (data: LeadFormData) =>
  authFetch(`${API_BASE}/Api/V1/Lead/Add`, {
    method: "POST",
    body: JSON.stringify(buildLeadBody(data)),
  });

const apiUpdate = ({ id, data }: { id: string; data: LeadFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Lead/${id}`, {
    method: "PUT",
    body: JSON.stringify(buildLeadBody(data)),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Lead/${id}`, { method: "DELETE" });

// Convert lead to customer using all available lead contact data
const apiConvertToCustomer = (lead: Lead) =>
  authFetch(`${API_BASE}/Api/V1/Customer/Add`, {
    method: "POST",
    body: JSON.stringify({
      fullName: lead.fullName || lead.title,
      email: lead.email || null,
      phone: lead.phone || null,
      company: lead.company || null,
      address: lead.address || null,
      status: "Active",
      notes: lead.notes || null,
      assignedToUserId: lead.assignedToUserId || null,
    }),
  });

const normalize = (raw: unknown): Lead[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

const normalizeUsers = (raw: unknown): SystemUser[] =>
  Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? (raw as any)?.users ?? []);

// ─── Config Maps ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  LeadStatus,
  { label: string; cls: string; dot: string }
> = {
  New: {
    label: "جديد",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
  },
  Contacted: {
    label: "تم التواصل",
    cls: "bg-purple-50 text-purple-600 border-purple-200",
    dot: "bg-purple-500",
  },
  Qualified: {
    label: "مؤهل",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  Lost: {
    label: "خسارة",
    cls: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
  },
  Won: {
    label: "مكسب",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const STAGE_CFG: Record<LeadStage, { label: string; step: number }> = {
  Prospecting: { label: "استكشاف", step: 1 },
  Qualification: { label: "تأهيل", step: 2 },
  Proposal: { label: "عرض", step: 3 },
  Negotiation: { label: "تفاوض", step: 4 },
  ClosedWon: { label: "مغلق / فوز", step: 5 },
  ClosedLost: { label: "مغلق / خسارة", step: 5 },
};

const StatusBadge = ({ status }: { status: LeadStatus }) => {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StagePill = ({ stage }: { stage: LeadStage }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F5F1E8] text-[#1B5E4F] text-xs font-semibold rounded-lg border border-[#B8976B]/20">
    <Layers size={10} />
    {STAGE_CFG[stage].label}
  </span>
);

// ─── Pipeline Progress Bar ────────────────────────────────────────────────────

const PipelineBar = ({ stage }: { stage: LeadStage }) => {
  const steps = ["Prospecting", "Qualification", "Proposal", "Negotiation"];
  const isClosed = stage === "ClosedWon" || stage === "ClosedLost";
  const current = isClosed ? 5 : STAGE_CFG[stage].step;

  return (
    <div className="flex gap-1 mt-2">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-all ${
            i < current - 1
              ? stage === "ClosedLost"
                ? "bg-red-300"
                : "bg-[#1B5E4F]"
              : i === current - 1
                ? stage === "ClosedLost"
                  ? "bg-red-400"
                  : "bg-[#B8976B]"
                : "bg-gray-200"
          }`}
        />
      ))}
      {isClosed && (
        <div
          className={`h-1 flex-1 rounded-full ${stage === "ClosedWon" ? "bg-emerald-500" : "bg-red-400"}`}
        />
      )}
    </div>
  );
};

// ─── Lead Form Modal ──────────────────────────────────────────────────────────

const LeadModal = ({
  mode,
  initial,
  saving,
  error,
  systemUsers,
  usersLoading,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: LeadFormData;
  saving: boolean;
  error?: string | null;
  systemUsers: SystemUser[];
  usersLoading: boolean;
  onSave: (data: LeadFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<LeadFormData>(initial);
  const set = (k: keyof LeadFormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "block text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";
  const selectCls = inputCls + " appearance-none";

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
              {mode === "add" ? "إضافة عميل محتمل" : "تعديل العميل المحتمل"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add"
                ? "أدخل بيانات العميل المحتمل الجديد"
                : "تحديث بيانات الفرصة"}
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

          {/* Opportunity Info */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> معلومات الفرصة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>
                  عنوان الفرصة <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="عنوان وصفي للعميل المحتمل"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الاسم الكامل</label>
                <input
                  className={inputCls}
                  placeholder="اسم العميل المحتمل"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>القيمة المتوقعة (ريال)</label>
                <input
                  type="number"
                  dir="ltr"
                  className={inputCls}
                  placeholder="0"
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>تاريخ الإغلاق المتوقع</label>
                <input
                  type="date"
                  dir="ltr"
                  className={inputCls}
                  value={
                    form.expectedCloseDate
                      ? form.expectedCloseDate.split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    set(
                      "expectedCloseDate",
                      e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                    )
                  }
                />
              </div>
            </div>
          </section>

          {/* Contact Info */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> بيانات التواصل
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>البريد الإلكتروني</label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8976B]"
                  />
                  <input
                    type="email"
                    dir="ltr"
                    className={inputCls + " pr-9"}
                    placeholder="example@domain.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8976B]"
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    className={inputCls + " pr-9"}
                    placeholder="+966 5x xxx xxxx"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>الشركة</label>
                <div className="relative">
                  <Building2
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8976B]"
                  />
                  <input
                    className={inputCls + " pr-9"}
                    placeholder="اسم الشركة"
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>العنوان</label>
                <div className="relative">
                  <MapPin
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8976B]"
                  />
                  <input
                    className={inputCls + " pr-9"}
                    placeholder="المدينة / العنوان"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Status & Stage */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> الحالة والمرحلة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="New">جديد</option>
                    <option value="Contacted">تم التواصل</option>
                    <option value="Qualified">مؤهل</option>
                    <option value="Lost">خسارة</option>
                    <option value="Won">مكسب</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>المرحلة</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.stage}
                    onChange={(e) => set("stage", e.target.value)}
                  >
                    <option value="Prospecting">استكشاف</option>
                    <option value="Qualification">تأهيل</option>
                    <option value="Proposal">عرض سعر</option>
                    <option value="Negotiation">تفاوض</option>
                    <option value="ClosedWon">مغلق / فوز</option>
                    <option value="ClosedLost">مغلق / خسارة</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>معاينة المرحلة</label>
                <div className="bg-[#F5F1E8]/50 rounded-xl p-3 border border-[#B8976B]/20">
                  <PipelineBar stage={form.stage as LeadStage} />
                  <p className="text-xs text-[#1B5E4F]/60 mt-1.5 text-center">
                    {STAGE_CFG[form.stage as LeadStage]?.label}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Assignment */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> التعيين
            </h3>
            <div>
              <label className={labelCls}>المسؤول عن الفرصة</label>
              <div className="relative">
                {usersLoading ? (
                  <div className="w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-gray-50 flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    جاري تحميل المستخدمين...
                  </div>
                ) : (
                  <>
                    <select
                      className={selectCls}
                      value={form.assignedToUserId}
                      onChange={(e) => set("assignedToUserId", e.target.value)}
                    >
                      <option value="">بدون تعيين</option>
                      {systemUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {u.email ? ` — ${u.email}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                    />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> ملاحظات
            </h3>
            <textarea
              className={inputCls + " resize-none"}
              rows={3}
              placeholder="أي ملاحظات أو تفاصيل إضافية..."
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
            disabled={saving || !form.title.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {mode === "add" ? "إضافة العميل المحتمل" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  title,
  deleting,
  onConfirm,
  onClose,
}: {
  title: string;
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
        هل أنت متأكد من حذف{" "}
        <span className="font-bold text-red-600">{title}</span>؟
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
          )}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── Convert Modal ────────────────────────────────────────────────────────────

const ConvertModal = ({
  lead,
  converting,
  error,
  onConfirm,
  onClose,
}: {
  lead: Lead;
  converting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    dir="rtl"
  >
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      onClick={!converting ? onClose : undefined}
    />
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
        <UserPlus className="text-emerald-600" size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">تحويل إلى عميل</h3>
      <p className="text-gray-500 text-sm mb-4">
        هل تريد تحويل الفرصة{" "}
        <span className="font-bold text-[#1B5E4F]">{lead.title}</span> إلى عميل
        جديد؟
      </p>

      {/* Data preview */}
      <div className="bg-[#F5F1E8]/60 rounded-2xl p-4 mb-5 text-right space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-[#1B5E4F]">
          <User size={12} className="text-[#B8976B] shrink-0" />
          <span className="font-semibold">{lead.fullName || lead.title}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-[#1B5E4F]">
            <Mail size={12} className="text-[#B8976B] shrink-0" />
            <span>{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-[#1B5E4F]">
            <Phone size={12} className="text-[#B8976B] shrink-0" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-2 text-xs text-[#1B5E4F]">
            <Building2 size={12} className="text-[#B8976B] shrink-0" />
            <span>{lead.company}</span>
          </div>
        )}
        {!lead.email && !lead.phone && !lead.company && (
          <p className="text-xs text-gray-400">
            لا توجد بيانات تواصل — أضفها عبر تعديل الفرصة أولاً.
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs mb-4 text-right">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={converting}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={converting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
        >
          {converting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          تحويل
        </button>
      </div>
    </div>
  </div>
);

// ─── Lead Card ────────────────────────────────────────────────────────────────

const LeadCard = ({
  lead,
  assignedUserName,
  onEdit,
  onDelete,
  onView,
  onConvert,
}: {
  lead: Lead;
  assignedUserName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onConvert: () => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#B8976B]/10 rounded-full" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center shrink-0 shadow-lg">
              <Target className="text-white" size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                {lead.title}
              </h3>
              {lead.fullName && lead.fullName !== lead.title && (
                <p className="text-white/50 text-xs mt-0.5 truncate">
                  {lead.fullName}
                </p>
              )}
              <div className="mt-1.5">
                <StatusBadge status={lead.status} />
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
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-[#B8976B]/10 overflow-hidden z-30">
                {[
                  {
                    icon: Eye,
                    label: "عرض التفاصيل",
                    color: "text-[#1B5E4F]",
                    action: onView,
                  },
                  {
                    icon: Edit,
                    label: "تعديل",
                    color: "text-blue-600",
                    action: onEdit,
                  },
                  {
                    icon: UserPlus,
                    label: "تحويل إلى عميل",
                    color: "text-emerald-600",
                    action: onConvert,
                  },
                  {
                    icon: Trash2,
                    label: "حذف",
                    color: "text-red-500",
                    action: onDelete,
                  },
                ].map(({ icon: Icon, label, color, action }) => (
                  <button
                    key={label}
                    onClick={() => {
                      action();
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-right ${color}`}
                  >
                    <Icon size={15} />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative z-10 mt-3">
          <PipelineBar stage={lead.stage} />
        </div>
      </div>

      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#B8976B] shrink-0" />
          <StagePill stage={lead.stage} />
        </div>
        {lead.value !== undefined && lead.value !== null && (
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm font-semibold text-[#1B5E4F]">
              {lead.value.toLocaleString("ar-SA")} ريال
            </span>
          </div>
        )}
        {lead.expectedCloseDate && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm">
              {new Date(lead.expectedCloseDate).toLocaleDateString("ar-SA")}
            </span>
          </div>
        )}
        {lead.company && (
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              {lead.company}
            </span>
          </div>
        )}
        {assignedUserName && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              مسؤول: {assignedUserName}
            </span>
          </div>
        )}
        {lead.notes && (
          <p className="text-xs text-gray-400 line-clamp-2 pt-1">
            {lead.notes}
          </p>
        )}
      </div>

      <div className="border-t border-[#B8976B]/10 flex">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[#1B5E4F] text-xs font-semibold hover:bg-[#F5F1E8] transition-colors"
        >
          <TrendingUp size={14} /> عرض التفاصيل
        </button>
        <span className="w-px bg-[#B8976B]/15 self-stretch" />
        <button
          onClick={onConvert}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-emerald-600 text-xs font-semibold hover:bg-emerald-50 transition-colors"
        >
          <UserPlus size={14} /> تحويل لعميل
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LeadsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<
    null | "add" | "edit" | "delete" | "view" | "convert"
  >(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status = filterStatus;
  if (filterStage) serverParams.Stage = filterStage;

  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchLeads(serverParams),
    staleTime: 30_000,
  });

  const { data: usersRaw, isLoading: usersLoading } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const leads: Lead[] = normalize(raw);
  const systemUsers: SystemUser[] = normalizeUsers(usersRaw);
  const userMap = new Map<string, SystemUser>(
    systemUsers.map((u) => [u.id, u]),
  );

  const displayed = search
    ? leads.filter((l) => l.title?.toLowerCase().includes(search.toLowerCase()))
    : leads;

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError(null);
    setConvertError(null);
  };

  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: Lead = {
        id: `temp-${Date.now()}`,
        ...data,
        value: data.value !== "" ? Number(data.value) : undefined,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...normalize(old),
        temp,
      ]);
      closeModal();
      return { prev };
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
        normalize(old).map((l) =>
          l.id === id
            ? {
                ...l,
                ...data,
                value: data.value !== "" ? Number(data.value) : undefined,
              }
            : l,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(leads.find((l) => l.id === vars.id) ?? null);
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
        normalize(old).filter((l) => l.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const convertMutation = useMutation({
    mutationFn: apiConvertToCustomer,
    onSuccess: (_, lead) => {
      closeModal();
      setConvertSuccess(`تم تحويل "${lead.title}" إلى عميل بنجاح`);
      setTimeout(() => setConvertSuccess(null), 5000);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => {
      // Keep the convert modal open, show error inside it
      setConvertError((e as Error).message);
    },
  });

  const toFormData = (l: Lead): LeadFormData => ({
    title: l.title,
    fullName: l.fullName ?? "",
    value: l.value ?? "",
    status: l.status,
    stage: l.stage,
    expectedCloseDate: l.expectedCloseDate ?? "",
    notes: l.notes ?? "",
    email: l.email ?? "",
    phone: l.phone ?? "",
    company: l.company ?? "",
    address: l.address ?? "",
    assignedToUserId: l.assignedToUserId ?? "",
  });

  const handleSave = (data: LeadFormData) => {
    if (!data.title.trim()) {
      setFormError("عنوان الفرصة مطلوب");
      return;
    }
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  const isSaving = addMutation.isPending || editMutation.isPending;
  const totalValue = leads.reduce((s, l) => s + (l.value ?? 0), 0);
  const wonCount = leads.filter((l) => l.status === "Won").length;
  const newCount = leads.filter((l) => l.status === "New").length;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              العملاء المحتملين
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}،` : ","} إجمالي الفرص:{" "}
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
            <Plus size={18} /> إضافة عميل محتمل
          </button>
        </div>

        {/* Success Toast */}
        {convertSuccess && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-semibold shadow-sm">
            <CheckCircle size={18} className="shrink-0" />
            {convertSuccess}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "إجمالي القيمة",
              value: `${totalValue.toLocaleString("ar-SA")} ريال`,
              Icon: DollarSign,
              cls: "from-[#1B5E4F]/5 to-[#0F4F3E]/10 border-[#1B5E4F]/20",
              val: "text-[#1B5E4F]",
              lbl: "text-[#1B5E4F]/60",
            },
            {
              label: "فرص مكتسبة",
              value: wonCount,
              Icon: Award,
              cls: "from-emerald-50 to-emerald-100/50 border-emerald-200/60",
              val: "text-emerald-700",
              lbl: "text-emerald-600",
            },
            {
              label: "فرص جديدة",
              value: newCount,
              Icon: Clock,
              cls: "from-blue-50 to-blue-100/50 border-blue-200/60",
              val: "text-blue-700",
              lbl: "text-blue-600",
            },
          ].map(({ label, value, Icon, cls, val, lbl }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${cls} border rounded-2xl p-4`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={val} />
                <p className={`text-xs font-semibold ${lbl}`}>{label}</p>
              </div>
              <p className={`text-xl font-bold ${val}`}>{value}</p>
            </div>
          ))}
        </div>

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
                placeholder="بحث في العملاء المحتملين..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
              />
            </div>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${showFilters ? "bg-[#1B5E4F] text-white border-[#1B5E4F]" : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]"}`}
            >
              <Filter size={16} /> تصفية
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
                    <option value="New">جديد</option>
                    <option value="Contacted">تم التواصل</option>
                    <option value="Qualified">مؤهل</option>
                    <option value="Won">مكسب</option>
                    <option value="Lost">خسارة</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  المرحلة
                </label>
                <div className="relative">
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">جميع المراحل</option>
                    <option value="Prospecting">استكشاف</option>
                    <option value="Qualification">تأهيل</option>
                    <option value="Proposal">عرض سعر</option>
                    <option value="Negotiation">تفاوض</option>
                    <option value="ClosedWon">مغلق / فوز</option>
                    <option value="ClosedLost">مغلق / خسارة</option>
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

        {/* Loading / Error */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm font-medium">
              جاري تحميل العملاء المحتملين...
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
              {displayed.map((l) => {
                const assignedUser = l.assignedToUserId
                  ? userMap.get(l.assignedToUserId)
                  : undefined;
                return (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    assignedUserName={assignedUser?.name}
                    onEdit={() => {
                      setSelected(l);
                      setFormError(null);
                      setModal("edit");
                    }}
                    onDelete={() => {
                      setSelected(l);
                      setModal("delete");
                    }}
                    onView={() => {
                      setSelected(l);
                      setModal("view");
                    }}
                    onConvert={() => {
                      setSelected(l);
                      setConvertError(null);
                      setModal("convert");
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Target className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد فرص
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على عملاء محتملين مطابقين
              </p>
            </div>
          ))}
      </div>

      {/* ── Modals ── */}
      {(modal === "add" || modal === "edit") && (
        <LeadModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
          }
          saving={isSaving}
          error={formError}
          systemUsers={systemUsers}
          usersLoading={usersLoading}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          title={selected.title}
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          onClose={closeModal}
        />
      )}

      {modal === "convert" && selected && (
        <ConvertModal
          lead={selected}
          converting={convertMutation.isPending}
          error={convertError}
          onConfirm={() => {
            setConvertError(null);
            convertMutation.mutate(selected);
          }}
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
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6 relative shrink-0">
              <button
                onClick={closeModal}
                className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg"
              >
                <X className="text-white" size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center shadow-lg">
                  <Target className="text-white" size={26} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {selected.title}
                  </h2>
                  {selected.fullName &&
                    selected.fullName !== selected.title && (
                      <p className="text-white/60 text-sm">
                        {selected.fullName}
                      </p>
                    )}
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={selected.status} />
                    <StagePill stage={selected.stage} />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <PipelineBar stage={selected.stage} />
              </div>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 text-sm overflow-y-auto flex-1">
              {[
                {
                  label: "المسؤول",
                  value: selected.assignedToUserId
                    ? (userMap.get(selected.assignedToUserId)?.name ?? "—")
                    : "—",
                  span: true,
                },
                {
                  label: "القيمة المتوقعة",
                  value:
                    selected.value != null
                      ? `${selected.value.toLocaleString("ar-SA")} ريال`
                      : "—",
                  span: false,
                },
                {
                  label: "تاريخ الإغلاق",
                  value: selected.expectedCloseDate
                    ? new Date(selected.expectedCloseDate).toLocaleDateString(
                        "ar-SA",
                      )
                    : "—",
                  span: false,
                },
                {
                  label: "البريد الإلكتروني",
                  value: selected.email || "—",
                  span: false,
                },
                {
                  label: "رقم الهاتف",
                  value: selected.phone || "—",
                  span: false,
                },
                {
                  label: "الشركة",
                  value: selected.company || "—",
                  span: false,
                },
                {
                  label: "العنوان",
                  value: selected.address || "—",
                  span: false,
                },
                {
                  label: "الملاحظات",
                  value: selected.notes || "—",
                  span: true,
                },
              ].map(({ label, value, span }) => (
                <div key={label} className={span ? "col-span-2" : ""}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    {label}
                  </p>
                  <p className="font-semibold text-[#1B5E4F]">{value}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 flex gap-3 shrink-0">
              <button
                onClick={() => {
                  closeModal();
                  setTimeout(() => {
                    setSelected(selected);
                    setModal("edit");
                  }, 0);
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#1B5E4F]/20 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] flex items-center justify-center gap-2"
              >
                <Edit size={15} /> تعديل
              </button>
              <button
                onClick={() => {
                  closeModal();
                  setTimeout(() => {
                    setSelected(selected);
                    setConvertError(null);
                    setModal("convert");
                  }, 0);
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-emerald-200 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 flex items-center justify-center gap-2"
              >
                <UserPlus size={15} /> تحويل لعميل
              </button>
              <button
                onClick={() => {
                  closeModal();
                  setTimeout(() => {
                    setSelected(selected);
                    setModal("delete");
                  }, 0);
                }}
                className="py-2.5 px-4 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50"
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

export default LeadsPage;
