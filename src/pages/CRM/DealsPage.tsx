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
  DollarSign,
  Calendar,
  Plus,
  TrendingUp,
  Trophy,
  PauseCircle,
  XCircle,
  BarChart2,
  Briefcase,
  User,
  Target,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type DealStatus = "Open" | "Won" | "Lost" | "OnHold";

interface Deal {
  id: string;
  title: string;
  value: number;
  status: DealStatus;
  closedDate?: string;
  notes?: string;
  leadId?: string;
  assignedToUserId?: string;
}

interface Lead {
  id: string;
  title: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
}

interface DealFormData {
  title: string;
  value: number | string;
  status: DealStatus;
  closedDate: string;
  notes: string;
  leadId: string;
  assignedToUserId: string;
}

const EMPTY_FORM: DealFormData = {
  title: "",
  value: "",
  status: "Open",
  closedDate: "",
  notes: "",
  leadId: "",
  assignedToUserId: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["deals"] as const;
const LEADS_QUERY_KEY = ["leads"] as const;
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
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchDeals = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Deal/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchLeads = () => authFetch(`${API_BASE}/Api/V1/Lead/Get-All`);

const fetchUsers = () =>
  authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`);

// POST includes leadId
const apiAdd = (data: DealFormData) =>
  authFetch(`${API_BASE}/Api/V1/Deal/Add`, {
    method: "POST",
    body: JSON.stringify({
      title: data.title,
      value: Number(data.value) || 0,
      status: data.status,
      closedDate: data.closedDate || null,
      notes: data.notes || null,
      leadId: data.leadId || null,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

// PUT does NOT include leadId
const apiUpdate = ({ id, data }: { id: string; data: DealFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Deal/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      title: data.title,
      value: Number(data.value) || 0,
      status: data.status,
      closedDate: data.closedDate || null,
      notes: data.notes || null,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Deal/${id}`, { method: "DELETE" });

const normalize = (raw: unknown): Deal[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

const normalizeLeads = (raw: unknown): Lead[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

const normalizeUsers = (raw: unknown): SystemUser[] =>
  Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? (raw as any)?.users ?? []);

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  DealStatus,
  { label: string; cls: string; dot: string; card: string; Icon: any }
> = {
  Open: {
    label: "مفتوح",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
    card: "from-blue-600 to-blue-800",
    Icon: Briefcase,
  },
  Won: {
    label: "مكتسب",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    card: "from-emerald-600 to-emerald-800",
    Icon: Trophy,
  },
  Lost: {
    label: "خسارة",
    cls: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
    card: "from-red-700 to-red-900",
    Icon: XCircle,
  },
  OnHold: {
    label: "معلق",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    card: "from-amber-600 to-amber-800",
    Icon: PauseCircle,
  },
};

const StatusBadge = ({ status }: { status: DealStatus }) => {
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

// ─── Value Tier ───────────────────────────────────────────────────────────────

const ValueTier = ({ value }: { value: number }) => {
  const tier =
    value >= 1_000_000
      ? {
          label: "كبيرة",
          cls: "text-purple-600 bg-purple-50 border-purple-200",
        }
      : value >= 100_000
        ? {
            label: "متوسطة",
            cls: "text-[#1B5E4F] bg-[#F5F1E8] border-[#B8976B]/30",
          }
        : { label: "صغيرة", cls: "text-gray-600 bg-gray-50 border-gray-200" };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.cls}`}
    >
      {tier.label}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const DealModal = ({
  mode,
  initial,
  saving,
  error,
  leads,
  leadsLoading,
  systemUsers,
  usersLoading,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: DealFormData;
  saving: boolean;
  error?: string | null;
  leads: Lead[];
  leadsLoading: boolean;
  systemUsers: SystemUser[];
  usersLoading: boolean;
  onSave: (data: DealFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<DealFormData>(initial);
  const set = (k: keyof DealFormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inputCls =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls =
    "block text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";
  const selectCls = inputCls + " appearance-none";

  const statusInfo = STATUS_CFG[form.status];

  const LoadingSelect = ({ text }: { text: string }) => (
    <div className="w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-gray-50 flex items-center gap-2 text-gray-400 text-sm">
      <Loader2 size={14} className="animate-spin" />
      {text}
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
          className={`bg-gradient-to-l ${statusInfo.card} px-8 py-6 flex items-center justify-between shrink-0`}
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "إضافة صفقة جديدة" : "تعديل الصفقة"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add"
                ? "أدخل بيانات الصفقة الجديدة"
                : "تحديث بيانات الصفقة"}
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

          {/* Deal Details */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> تفاصيل الصفقة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>عنوان الصفقة</label>
                <input
                  className={inputCls}
                  placeholder="وصف موجز للصفقة"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>قيمة الصفقة (ريال)</label>
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
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="Open">مفتوح</option>
                    <option value="Won">مكتسب</option>
                    <option value="Lost">خسارة</option>
                    <option value="OnHold">معلق</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>تاريخ الإغلاق</label>
                <input
                  type="date"
                  dir="ltr"
                  className={inputCls}
                  value={form.closedDate ? form.closedDate.split("T")[0] : ""}
                  onChange={(e) =>
                    set(
                      "closedDate",
                      e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
                    )
                  }
                />
              </div>
            </div>
          </section>

          {/* Lead & Assignment */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> الربط والتعيين
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* leadId only shown on Add — API's PUT doesn't accept it */}
              {mode === "add" && (
                <div className="col-span-2">
                  <label className={labelCls}>
                    <span className="flex items-center gap-1">
                      <Target size={11} /> العميل المحتمل
                    </span>
                  </label>
                  <div className="relative">
                    {leadsLoading ? (
                      <LoadingSelect text="جاري تحميل العملاء المحتملين..." />
                    ) : (
                      <>
                        <select
                          className={selectCls}
                          value={form.leadId}
                          onChange={(e) => set("leadId", e.target.value)}
                        >
                          <option value="">بدون ربط بعميل محتمل</option>
                          {leads.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
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
              )}

              <div className="col-span-2">
                <label className={labelCls}>
                  <span className="flex items-center gap-1">
                    <User size={11} /> المسؤول عن الصفقة
                  </span>
                </label>
                <div className="relative">
                  {usersLoading ? (
                    <LoadingSelect text="جاري تحميل المستخدمين..." />
                  ) : (
                    <>
                      <select
                        className={selectCls}
                        value={form.assignedToUserId}
                        onChange={(e) =>
                          set("assignedToUserId", e.target.value)
                        }
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
              placeholder="تفاصيل الصفقة، شروط، ملاحظات..."
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
            className={`px-6 py-2.5 rounded-xl bg-gradient-to-l ${statusInfo.card} text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {mode === "add" ? "إضافة الصفقة" : "حفظ التعديلات"}
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
        هل أنت متأكد من حذف صفقة{" "}
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
          )}{" "}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── Deal Card ────────────────────────────────────────────────────────────────

const DealCard = ({
  deal,
  leadTitle,
  assignedUserName,
  onEdit,
  onDelete,
  onView,
}: {
  deal: Deal;
  leadTitle?: string;
  assignedUserName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[deal.status];
  const StatusIcon = cfg.Icon;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      <div
        className={`bg-gradient-to-br ${cfg.card} p-5 relative overflow-hidden`}
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-lg backdrop-blur-sm">
              <StatusIcon className="text-white" size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                {deal.title}
              </h3>
              <div className="mt-1.5">
                <StatusBadge status={deal.status} />
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
      </div>

      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-base font-bold text-[#1B5E4F]">
              {deal.value?.toLocaleString("ar-SA")} ريال
            </span>
          </div>
          <ValueTier value={deal.value} />
        </div>
        {leadTitle && (
          <div className="flex items-center gap-2">
            <Target size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-[#1B5E4F] font-medium truncate">
              {leadTitle}
            </span>
          </div>
        )}
        {deal.closedDate && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm">
              {new Date(deal.closedDate).toLocaleDateString("ar-SA")}
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
        {deal.notes && (
          <p className="text-xs text-gray-400 line-clamp-2 pt-1">
            {deal.notes}
          </p>
        )}
      </div>

      <div className="border-t border-[#B8976B]/10">
        <button
          onClick={onView}
          className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors bg-gradient-to-l ${cfg.card} text-white hover:opacity-90`}
        >
          <BarChart2 size={14} />
          عرض التفاصيل
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DealsPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<Deal | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status = filterStatus;
  if (minValue) serverParams.MinValue = minValue;
  if (maxValue) serverParams.MaxValue = maxValue;

  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchDeals(serverParams),
    staleTime: 30_000,
  });

  const { data: leadsRaw, isLoading: leadsLoading } = useQuery({
    queryKey: LEADS_QUERY_KEY,
    queryFn: fetchLeads,
    staleTime: 60_000,
  });

  const { data: usersRaw, isLoading: usersLoading } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const deals: Deal[] = normalize(raw);
  const leads: Lead[] = normalizeLeads(leadsRaw);
  const systemUsers: SystemUser[] = normalizeUsers(usersRaw);

  const leadMap = new Map<string, Lead>(leads.map((l) => [l.id, l]));
  const userMap = new Map<string, SystemUser>(
    systemUsers.map((u) => [u.id, u]),
  );

  const displayed = search
    ? deals.filter((d) => d.title?.toLowerCase().includes(search.toLowerCase()))
    : deals;

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
      const temp: Deal = {
        id: `temp-${Date.now()}`,
        ...data,
        value: Number(data.value) || 0,
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
        normalize(old).map((d) =>
          d.id === id ? { ...d, ...data, value: Number(data.value) || 0 } : d,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(deals.find((d) => d.id === vars.id) ?? null);
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
        normalize(old).filter((d) => d.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toFormData = (d: Deal): DealFormData => ({
    title: d.title,
    value: d.value,
    status: d.status,
    closedDate: d.closedDate ?? "",
    notes: d.notes ?? "",
    leadId: d.leadId ?? "",
    assignedToUserId: d.assignedToUserId ?? "",
  });

  const handleSave = (data: DealFormData) => {
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  const totalValue = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const wonValue = deals
    .filter((d) => d.status === "Won")
    .reduce((s, d) => s + (d.value ?? 0), 0);
  const openCount = deals.filter((d) => d.status === "Open").length;
  const wonCount = deals.filter((d) => d.status === "Won").length;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              الصفقات
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}،` : ","} إجمالي الصفقات:{" "}
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
            <Plus size={18} /> إضافة صفقة
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "إجمالي القيمة",
              value: totalValue.toLocaleString("ar-SA"),
              sub: "ريال",
              cls: "from-[#1B5E4F]/5 to-[#0F4F3E]/10 border-[#1B5E4F]/20",
              val: "text-[#1B5E4F]",
              lbl: "text-[#1B5E4F]/60",
            },
            {
              label: "قيمة المكتسبة",
              value: wonValue.toLocaleString("ar-SA"),
              sub: "ريال",
              cls: "from-emerald-50 to-emerald-100/50 border-emerald-200/60",
              val: "text-emerald-700",
              lbl: "text-emerald-600",
            },
            {
              label: "صفقات مفتوحة",
              value: openCount,
              sub: "صفقة",
              cls: "from-blue-50 to-blue-100/50 border-blue-200/60",
              val: "text-blue-700",
              lbl: "text-blue-600",
            },
            {
              label: "صفقات مكتسبة",
              value: wonCount,
              sub: "صفقة",
              cls: "from-amber-50 to-amber-100/50 border-amber-200/60",
              val: "text-amber-700",
              lbl: "text-amber-600",
            },
          ].map(({ label, value, sub, cls, val, lbl }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${cls} border rounded-2xl p-4`}
            >
              <p className={`text-xs font-semibold ${lbl} mb-1`}>{label}</p>
              <p className={`text-xl font-bold ${val}`}>{value}</p>
              <p className={`text-xs ${lbl}`}>{sub}</p>
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
                placeholder="بحث في الصفقات..."
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
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <option value="Open">مفتوح</option>
                    <option value="Won">مكتسب</option>
                    <option value="Lost">خسارة</option>
                    <option value="OnHold">معلق</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  الحد الأدنى للقيمة
                </label>
                <input
                  type="number"
                  dir="ltr"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  الحد الأقصى للقيمة
                </label>
                <input
                  type="number"
                  dir="ltr"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  placeholder="∞"
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm font-medium">
              جاري تحميل الصفقات...
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
              {displayed.map((d) => (
                <DealCard
                  key={d.id}
                  deal={d}
                  leadTitle={
                    d.leadId ? leadMap.get(d.leadId)?.title : undefined
                  }
                  assignedUserName={
                    d.assignedToUserId
                      ? userMap.get(d.assignedToUserId)?.name
                      : undefined
                  }
                  onEdit={() => {
                    setSelected(d);
                    setFormError(null);
                    setModal("edit");
                  }}
                  onDelete={() => {
                    setSelected(d);
                    setModal("delete");
                  }}
                  onView={() => {
                    setSelected(d);
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
                لا توجد صفقات
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على صفقات مطابقة
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <DealModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
          }
          saving={isSaving}
          error={formError}
          leads={leads}
          leadsLoading={leadsLoading}
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
              className={`bg-gradient-to-br ${STATUS_CFG[selected.status].card} p-6 relative`}
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
                    const Icon = STATUS_CFG[selected.status].Icon;
                    return <Icon className="text-white" size={26} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {selected.title}
                  </h2>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={selected.status} />
                    <ValueTier value={selected.value} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {[
                {
                  label: "قيمة الصفقة",
                  value: `${selected.value?.toLocaleString("ar-SA")} ريال`,
                },
                {
                  label: "تاريخ الإغلاق",
                  value: selected.closedDate
                    ? new Date(selected.closedDate).toLocaleDateString("ar-SA")
                    : "—",
                },
                {
                  label: "العميل المحتمل",
                  value: selected.leadId
                    ? (leadMap.get(selected.leadId)?.title ?? "—")
                    : "—",
                },
                {
                  label: "المسؤول",
                  value: selected.assignedToUserId
                    ? (userMap.get(selected.assignedToUserId)?.name ?? "—")
                    : "—",
                },
                { label: "الملاحظات", value: selected.notes || "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={
                    ["الملاحظات", "العميل المحتمل", "المسؤول"].includes(label)
                      ? "col-span-2"
                      : ""
                  }
                >
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

export default DealsPage;
