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
  Calendar,
  Plus,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Clock,
  XCircle,
  PlayCircle,
  Target,
  Briefcase,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = "Call" | "Email" | "Meeting" | "Note" | "Task";
type ActivityStatus = "Planned" | "Completed" | "Cancelled";

interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  activityDate: string;
  status: ActivityStatus;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  dealId?: string;
  assignedToUserId?: string;
}

interface Customer {
  id: string;
  fullName?: string;
  company?: string;
}
interface Lead {
  id: string;
  title: string;
}
interface Deal {
  id: string;
  title: string;
}
interface SystemUser {
  id: string;
  name: string;
  email: string;
}

interface ActivityFormData {
  type: ActivityType;
  subject: string;
  description: string;
  activityDate: string;
  status: ActivityStatus;
  customerId: string;
  leadId: string;
  dealId: string;
  assignedToUserId: string;
}

const EMPTY_FORM: ActivityFormData = {
  type: "Call",
  subject: "",
  description: "",
  activityDate: new Date().toISOString(),
  status: "Planned",
  customerId: "",
  leadId: "",
  dealId: "",
  assignedToUserId: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["activities"] as const;
const CUSTOMERS_KEY = ["customers"] as const;
const LEADS_KEY = ["leads"] as const;
const DEALS_KEY = ["deals"] as const;
const USERS_KEY = ["system-users"] as const;

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
    throw new Error(t || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchActivities = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Activity/Get-All${qs ? `?${qs}` : ""}`);
};
const fetchCustomers = () => authFetch(`${API_BASE}/Api/V1/Customer/Get-All`);
const fetchLeads = () => authFetch(`${API_BASE}/Api/V1/Lead/Get-All`);
const fetchDeals = () => authFetch(`${API_BASE}/Api/V1/Deal/Get-All`);
const fetchUsers = () =>
  authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`);

// POST: no customerId
const apiAdd = (data: ActivityFormData) =>
  authFetch(`${API_BASE}/Api/V1/Activity/Add`, {
    method: "POST",
    body: JSON.stringify({
      type: data.type,
      subject: data.subject,
      description: data.description || null,
      activityDate: data.activityDate,
      status: data.status,
      leadId: data.leadId || null,
      dealId: data.dealId || null,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

// PUT: includes customerId
const apiUpdate = ({ id, data }: { id: string; data: ActivityFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Activity/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: data.type,
      subject: data.subject,
      description: data.description || null,
      activityDate: data.activityDate,
      status: data.status,
      customerId: data.customerId || null,
      leadId: data.leadId || null,
      dealId: data.dealId || null,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Activity/${id}`, { method: "DELETE" });

const norm = (raw: unknown): any[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<
  ActivityType,
  { label: string; Icon: any; bg: string; text: string; card: string }
> = {
  Call: {
    label: "مكالمة",
    Icon: Phone,
    bg: "bg-blue-100",
    text: "text-blue-600",
    card: "from-blue-500 to-blue-700",
  },
  Email: {
    label: "بريد إلكتروني",
    Icon: Mail,
    bg: "bg-violet-100",
    text: "text-violet-600",
    card: "from-violet-500 to-violet-700",
  },
  Meeting: {
    label: "اجتماع",
    Icon: Users,
    bg: "bg-amber-100",
    text: "text-amber-600",
    card: "from-amber-500 to-amber-700",
  },
  Note: {
    label: "ملاحظة",
    Icon: FileText,
    bg: "bg-teal-100",
    text: "text-teal-600",
    card: "from-teal-500 to-teal-700",
  },
  Task: {
    label: "مهمة",
    Icon: CheckSquare,
    bg: "bg-rose-100",
    text: "text-rose-600",
    card: "from-rose-500 to-rose-700",
  },
};

const STATUS_CFG: Record<
  ActivityStatus,
  { label: string; cls: string; dot: string; Icon: any }
> = {
  Planned: {
    label: "مخطط",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
    Icon: Clock,
  },
  Completed: {
    label: "مكتمل",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircle,
  },
  Cancelled: {
    label: "ملغي",
    cls: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
    Icon: XCircle,
  },
};

const TypeBadge = ({ type }: { type: ActivityType }) => {
  const cfg = TYPE_CFG[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: ActivityStatus }) => {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const ActivityModal = ({
  mode,
  initial,
  saving,
  error,
  customers,
  customersLoading,
  leads,
  leadsLoading,
  deals,
  dealsLoading,
  systemUsers,
  usersLoading,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: ActivityFormData;
  saving: boolean;
  error?: string | null;
  customers: Customer[];
  customersLoading: boolean;
  leads: Lead[];
  leadsLoading: boolean;
  deals: Deal[];
  dealsLoading: boolean;
  systemUsers: SystemUser[];
  usersLoading: boolean;
  onSave: (data: ActivityFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<ActivityFormData>(initial);
  const set = (k: keyof ActivityFormData, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "block text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";
  const selectCls = inputCls + " appearance-none";
  const typeCfg = TYPE_CFG[form.type];

  const LoadingSelect = ({ text }: { text: string }) => (
    <div className="w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-gray-50 flex items-center gap-2 text-gray-400 text-sm">
      <Loader2 size={14} className="animate-spin" /> {text}
    </div>
  );

  const LinkedSelect = ({
    label,
    value,
    onChange,
    loading,
    loadingText,
    children,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    loading: boolean;
    loadingText: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        {loading ? (
          <LoadingSelect text={loadingText} />
        ) : (
          <>
            <select
              className={selectCls}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              {children}
            </select>
            <ChevronDown
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
            />
          </>
        )}
      </div>
    </div>
  );

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
        <div
          className={`bg-gradient-to-l ${typeCfg.card} px-8 py-6 flex items-center justify-between shrink-0`}
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "إضافة نشاط جديد" : "تعديل النشاط"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add"
                ? "سجّل نشاطاً جديداً مع العميل"
                : "تحديث بيانات النشاط"}
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
              <AlertTriangle size={18} className="shrink-0" />{" "}
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> نوع النشاط
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {(
                Object.entries(TYPE_CFG) as [
                  ActivityType,
                  (typeof TYPE_CFG)[ActivityType],
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => set("type", key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all text-xs font-bold ${
                    form.type === key
                      ? `${cfg.bg} ${cfg.text} border-current shadow-sm`
                      : "border-[#B8976B]/20 text-gray-400 hover:border-[#B8976B]/40"
                  }`}
                >
                  <cfg.Icon size={20} /> {cfg.label}
                </button>
              ))}
            </div>
          </section>

          {/* Activity Details */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> تفاصيل النشاط
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>الموضوع</label>
                <input
                  className={inputCls}
                  placeholder="موضوع النشاط"
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="Planned">مخطط</option>
                    <option value="Completed">مكتمل</option>
                    <option value="Cancelled">ملغي</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>تاريخ النشاط</label>
                <input
                  type="datetime-local"
                  dir="ltr"
                  className={inputCls}
                  value={
                    form.activityDate ? form.activityDate.slice(0, 16) : ""
                  }
                  onChange={(e) =>
                    set(
                      "activityDate",
                      e.target.value ? `${e.target.value}:00.000Z` : "",
                    )
                  }
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الوصف</label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={3}
                  placeholder="تفاصيل النشاط..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Linked Entities */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> الربط والتعيين
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* customerId only on edit (PUT accepts it, POST doesn't) */}
              {mode === "edit" && (
                <div className="col-span-2">
                  <LinkedSelect
                    label="العميل (اختياري)"
                    value={form.customerId}
                    onChange={(v) => set("customerId", v)}
                    loading={customersLoading}
                    loadingText="جاري تحميل العملاء..."
                  >
                    <option value="">بدون ربط بعميل</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName ?? "—"}
                        {c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </LinkedSelect>
                </div>
              )}

              <LinkedSelect
                label="العميل المحتمل (اختياري)"
                value={form.leadId}
                onChange={(v) => set("leadId", v)}
                loading={leadsLoading}
                loadingText="جاري تحميل العملاء المحتملين..."
              >
                <option value="">بدون ربط بعميل محتمل</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </LinkedSelect>

              <LinkedSelect
                label="الصفقة (اختياري)"
                value={form.dealId}
                onChange={(v) => set("dealId", v)}
                loading={dealsLoading}
                loadingText="جاري تحميل الصفقات..."
              >
                <option value="">بدون ربط بصفقة</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </LinkedSelect>

              <div className="col-span-2">
                <LinkedSelect
                  label="المسؤول (اختياري)"
                  value={form.assignedToUserId}
                  onChange={(v) => set("assignedToUserId", v)}
                  loading={usersLoading}
                  loadingText="جاري تحميل المستخدمين..."
                >
                  <option value="">بدون تعيين</option>
                  {systemUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.email ? ` — ${u.email}` : ""}
                    </option>
                  ))}
                </LinkedSelect>
              </div>
            </div>
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
            className={`px-6 py-2.5 rounded-xl bg-gradient-to-l ${typeCfg.card} text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {mode === "add" ? "إضافة النشاط" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  subject,
  deleting,
  onConfirm,
  onClose,
}: {
  subject: string;
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
        هل أنت متأكد من حذف النشاط{" "}
        <span className="font-bold text-red-600">{subject}</span>؟
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

// ─── Activity Card ────────────────────────────────────────────────────────────

const ActivityCard = ({
  activity,
  leadTitle,
  dealTitle,
  assignedUserName,
  onEdit,
  onDelete,
  onView,
}: {
  activity: Activity;
  leadTitle?: string;
  dealTitle?: string;
  assignedUserName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const typeCfg = TYPE_CFG[activity.type];
  const TypeIcon = typeCfg.Icon;
  const isOverdue =
    activity.status === "Planned" &&
    new Date(activity.activityDate) < new Date();

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div className={`h-1.5 w-full bg-gradient-to-l ${typeCfg.card}`} />

      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl ${typeCfg.bg} flex items-center justify-center shrink-0`}
          >
            <TypeIcon className={typeCfg.text} size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#1B5E4F] leading-tight truncate">
              {activity.subject}
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <TypeBadge type={activity.type} />
              <StatusBadge status={activity.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                  <AlertTriangle size={9} /> متأخر
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
          >
            <MoreVertical className="text-gray-400" size={18} />
          </button>
          {open && (
            <div className="absolute left-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-[#B8976B]/10 overflow-hidden z-30">
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

      <div className="px-5 pb-3 space-y-2">
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar size={13} className="text-[#B8976B] shrink-0" />
          <span className="text-xs">
            {new Date(activity.activityDate).toLocaleString("ar-SA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>
        {leadTitle && (
          <div className="flex items-center gap-2">
            <Target size={13} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-[#1B5E4F] font-medium truncate">
              {leadTitle}
            </span>
          </div>
        )}
        {dealTitle && (
          <div className="flex items-center gap-2">
            <Briefcase size={13} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-[#1B5E4F] font-medium truncate">
              {dealTitle}
            </span>
          </div>
        )}
        {assignedUserName && (
          <div className="flex items-center gap-2">
            <User size={13} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              مسؤول: {assignedUserName}
            </span>
          </div>
        )}
        {activity.description && (
          <p className="text-xs text-gray-400 line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      <div className="border-t border-[#B8976B]/10 mt-auto">
        <button
          onClick={onView}
          className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold bg-gradient-to-l ${typeCfg.card} text-white hover:opacity-90 transition-opacity`}
        >
          <PlayCircle size={14} /> عرض التفاصيل
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ActivitiesPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<Activity | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterType) serverParams.Type = filterType;
  if (filterStatus) serverParams.Status = filterStatus;

  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchActivities(serverParams),
    staleTime: 30_000,
  });

  const { data: customersRaw, isLoading: customersLoading } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: fetchCustomers,
    staleTime: 60_000,
  });
  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: LEADS_KEY,
    queryFn: fetchLeads,
    staleTime: 60_000,
  });
  const { data: dealsRaw, isLoading: dealsLoading } = useQuery({
    queryKey: DEALS_KEY,
    queryFn: fetchDeals,
    staleTime: 60_000,
  });
  const { data: usersRaw, isLoading: usersLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const activities: Activity[] = norm(raw);
  const customers: Customer[] = norm(customersRaw);
  const leads: Lead[] = norm(leadsRaw);
  const deals: Deal[] = norm(dealsRaw);
  const systemUsers: SystemUser[] = norm(usersRaw);

  const leadMap = new Map<string, Lead>(leads.map((l) => [l.id, l]));
  const dealMap = new Map<string, Deal>(deals.map((d) => [d.id, d]));
  const userMap = new Map<string, SystemUser>(
    systemUsers.map((u) => [u.id, u]),
  );

  const displayed = search
    ? activities.filter(
        (a) =>
          a.subject?.toLowerCase().includes(search.toLowerCase()) ||
          a.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : activities;

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError(null);
  };

  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [
        ...norm(old),
        { id: `temp-${Date.now()}`, ...data },
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
        norm(old).map((a) => (a.id === id ? { ...a, ...data } : a)),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(activities.find((a) => a.id === vars.id) ?? null);
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
        norm(old).filter((a) => a.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toFormData = (a: Activity): ActivityFormData => ({
    type: a.type,
    subject: a.subject,
    description: a.description ?? "",
    activityDate: a.activityDate,
    status: a.status,
    customerId: a.customerId ?? "",
    leadId: a.leadId ?? "",
    dealId: a.dealId ?? "",
    assignedToUserId: a.assignedToUserId ?? "",
  });

  const handleSave = (data: ActivityFormData) => {
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  const isSaving = addMutation.isPending || editMutation.isPending;
  const plannedCount = activities.filter((a) => a.status === "Planned").length;
  const completedCount = activities.filter(
    (a) => a.status === "Completed",
  ).length;
  const overdueCount = activities.filter(
    (a) => a.status === "Planned" && new Date(a.activityDate) < new Date(),
  ).length;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              الأنشطة
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}،` : ","} إجمالي الأنشطة:{" "}
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
            <Plus size={18} /> إضافة نشاط
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "مخطط لها",
              count: plannedCount,
              cls: "from-blue-50 to-blue-100/50 border-blue-200/60",
              num: "text-blue-700",
              lbl: "text-blue-600",
              Icon: Clock,
            },
            {
              label: "مكتملة",
              count: completedCount,
              cls: "from-emerald-50 to-emerald-100/50 border-emerald-200/60",
              num: "text-emerald-700",
              lbl: "text-emerald-600",
              Icon: CheckCircle,
            },
            {
              label: "متأخرة",
              count: overdueCount,
              cls: "from-orange-50 to-orange-100/50 border-orange-200/60",
              num: "text-orange-700",
              lbl: "text-orange-600",
              Icon: AlertTriangle,
            },
          ].map(({ label, count, cls, num, lbl, Icon }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${cls} border rounded-2xl p-4`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={15} className={num} />
                <p className={`text-xs font-semibold ${lbl}`}>{label}</p>
              </div>
              <p className={`text-2xl font-bold ${num}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Type quick-filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType("")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${!filterType ? "bg-[#1B5E4F] text-white border-[#1B5E4F]" : "bg-white text-gray-500 border-[#B8976B]/20 hover:border-[#1B5E4F]/30"}`}
          >
            الكل
          </button>
          {(
            Object.entries(TYPE_CFG) as [
              ActivityType,
              (typeof TYPE_CFG)[ActivityType],
            ][]
          ).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilterType(filterType === key ? "" : key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${filterType === key ? `${cfg.bg} ${cfg.text} border-current` : "bg-white text-gray-500 border-[#B8976B]/20 hover:border-[#1B5E4F]/30"}`}
            >
              <cfg.Icon size={12} /> {cfg.label}
            </button>
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
                placeholder="بحث في الأنشطة..."
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
                  نوع النشاط
                </label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">جميع الأنواع</option>
                    <option value="Call">مكالمة</option>
                    <option value="Email">بريد إلكتروني</option>
                    <option value="Meeting">اجتماع</option>
                    <option value="Note">ملاحظة</option>
                    <option value="Task">مهمة</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
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
                    <option value="Planned">مخطط</option>
                    <option value="Completed">مكتمل</option>
                    <option value="Cancelled">ملغي</option>
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
              جاري تحميل الأنشطة...
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
              {displayed.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  leadTitle={
                    a.leadId ? leadMap.get(a.leadId)?.title : undefined
                  }
                  dealTitle={
                    a.dealId ? dealMap.get(a.dealId)?.title : undefined
                  }
                  assignedUserName={
                    a.assignedToUserId
                      ? userMap.get(a.assignedToUserId)?.name
                      : undefined
                  }
                  onEdit={() => {
                    setSelected(a);
                    setFormError(null);
                    setModal("edit");
                  }}
                  onDelete={() => {
                    setSelected(a);
                    setModal("delete");
                  }}
                  onView={() => {
                    setSelected(a);
                    setModal("view");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Calendar className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد أنشطة
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على أنشطة مطابقة
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <ActivityModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
          }
          saving={isSaving}
          error={formError}
          customers={customers}
          customersLoading={customersLoading}
          leads={leads}
          leadsLoading={leadsLoading}
          deals={deals}
          dealsLoading={dealsLoading}
          systemUsers={systemUsers}
          usersLoading={usersLoading}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          subject={selected.subject}
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
            <div
              className={`bg-gradient-to-br ${TYPE_CFG[selected.type].card} p-6 relative`}
            >
              <button
                onClick={closeModal}
                className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg"
              >
                <X className="text-white" size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  {(() => {
                    const Icon = TYPE_CFG[selected.type].Icon;
                    return <Icon className="text-white" size={26} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {selected.subject}
                  </h2>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <TypeBadge type={selected.type} />
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {[
                {
                  label: "تاريخ النشاط",
                  value: new Date(selected.activityDate).toLocaleString(
                    "ar-SA",
                    { dateStyle: "full", timeStyle: "short" },
                  ),
                  full: true,
                },
                {
                  label: "العميل المحتمل",
                  value: selected.leadId
                    ? (leadMap.get(selected.leadId)?.title ?? "—")
                    : "—",
                  full: true,
                },
                {
                  label: "الصفقة",
                  value: selected.dealId
                    ? (dealMap.get(selected.dealId)?.title ?? "—")
                    : "—",
                  full: false,
                },
                {
                  label: "المسؤول",
                  value: selected.assignedToUserId
                    ? (userMap.get(selected.assignedToUserId)?.name ?? "—")
                    : "—",
                  full: false,
                },
                {
                  label: "الوصف",
                  value: selected.description || "—",
                  full: true,
                },
              ].map(({ label, value, full }) => (
                <div key={label} className={full ? "col-span-2" : ""}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                    {label}
                  </p>
                  <p className="font-semibold text-[#1B5E4F]">{value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  closeModal();
                  setSelected(selected);
                  setModal("edit");
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-[#1B5E4F]/20 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] flex items-center justify-center gap-2"
              >
                <Edit size={15} /> تعديل
              </button>
              <button
                onClick={() => {
                  closeModal();
                  setSelected(selected);
                  setModal("delete");
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

export default ActivitiesPage;
