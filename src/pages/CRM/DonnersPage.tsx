import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
  Phone,
  FileText,
  User,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: "Active" | "Inactive" | "Blocked";
  notes: string;
  assignedToUserId?: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
}

interface CustomerFormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  status: "Active" | "Inactive" | "Blocked";
  notes: string;
  assignedToUserId: string;
}

const EMPTY_FORM: CustomerFormData = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  status: "Active",
  notes: "",
  assignedToUserId: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["customers"] as const;
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

const fetchCustomers = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Customer/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchUsers = () =>
  authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`);

const apiAdd = (data: CustomerFormData) =>
  authFetch(`${API_BASE}/Api/V1/Customer/Add`, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

const apiUpdate = ({ id, data }: { id: string; data: CustomerFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Customer/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      assignedToUserId: data.assignedToUserId || null,
    }),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Customer/${id}`, { method: "DELETE" });

const normalize = (raw: unknown): Customer[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

const normalizeUsers = (raw: unknown): SystemUser[] =>
  Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? (raw as any)?.users ?? []);

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Active: {
    label: "نشط",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: ShieldCheck,
  },
  Inactive: {
    label: "غير نشط",
    cls: "bg-gray-50 text-gray-500 border-gray-200",
    dot: "bg-gray-400",
    Icon: ShieldOff,
  },
  Blocked: {
    label: "داعم",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
    Icon: ShieldAlert,
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const CustomerModal = ({
  mode,
  initial,
  saving,
  error,
  users,
  usersLoading,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: CustomerFormData;
  saving: boolean;
  error?: string | null;
  users: SystemUser[];
  usersLoading: boolean;
  onSave: (data: CustomerFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<CustomerFormData>(initial);
  const set = (k: keyof CustomerFormData, v: string) =>
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
              {mode === "add" ? "إضافة عميل جديد" : "تعديل بيانات العميل"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add"
                ? "أدخل بيانات العميل الجديد"
                : "تحديث معلومات العميل"}
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

          {/* Personal Info */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> البيانات الشخصية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>الاسم الكامل</label>
                <input
                  className={inputCls}
                  placeholder="اسم العميل"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>البريد الإلكتروني</label>
                <input
                  type="email"
                  dir="ltr"
                  className={inputCls}
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <input
                  dir="ltr"
                  className={inputCls}
                  placeholder="+966 5xx xxx xxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Company Info */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> بيانات الشركة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الشركة</label>
                <input
                  className={inputCls}
                  placeholder="اسم الشركة"
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.status}
                    onChange={(e) =>
                      set(
                        "status",
                        e.target.value as CustomerFormData["status"],
                      )
                    }
                  >
                    <option value="Active">نشط</option>
                    <option value="Inactive">غير نشط</option>
                    <option value="Blocked">داعم</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>العنوان</label>
                <input
                  className={inputCls}
                  placeholder="المدينة، المنطقة، الدولة"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>ملاحظات</label>
                <textarea
                  className={inputCls + " resize-none"}
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Assignment */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> التعيين
            </h3>
            <div>
              <label className={labelCls}>المسؤول عن العميل</label>
              <div className="relative">
                {usersLoading ? (
                  <div className="w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-gray-50 flex items-center gap-2 text-gray-400 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    جاري تحميل المستخدمين...
                  </div>
                ) : (
                  <>
                    <select
                      className={inputCls + " appearance-none"}
                      value={form.assignedToUserId}
                      onChange={(e) => set("assignedToUserId", e.target.value)}
                    >
                      <option value="">بدون تعيين</option>
                      {users.map((u) => (
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
              <CheckCircle size={16} />
            )}
            {mode === "add" ? "إضافة العميل" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  name,
  deleting,
  onConfirm,
  onClose,
}: {
  name: string;
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
        هل أنت متأكد من حذف العميل{" "}
        <span className="font-bold text-red-600">{name}</span>؟
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

// ─── Customer Card ─────────────────────────────────────────────────────────────

const CustomerCard = ({
  customer,
  assignedUserName,
  onEdit,
  onDelete,
  onView,
}: {
  customer: Customer;
  assignedUserName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const initials =
    customer.fullName
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("") ?? "?";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
      <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#B8976B]/10 rounded-full" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white leading-tight truncate">
                {customer.fullName}
              </h3>
              <p className="text-white/60 text-xs mt-0.5 truncate">
                {customer.company || "—"}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={customer.status} />
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
        {customer.email && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Mail size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm truncate" dir="ltr">
              {customer.email}
            </span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Phone size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm truncate" dir="ltr">
              {customer.phone}
            </span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <MapPin size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm truncate">{customer.address}</span>
          </div>
        )}
        {assignedUserName && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <User size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs text-[#1B5E4F] font-medium truncate">
              {assignedUserName}
            </span>
          </div>
        )}
        {customer.notes && (
          <div className="flex items-start gap-2 text-[#4A4A4A]">
            <FileText size={14} className="text-[#B8976B] shrink-0 mt-0.5" />
            <span className="text-xs text-gray-400 line-clamp-2">
              {customer.notes}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onView}
          className="w-full py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <User size={15} />
          عرض الملف الكامل
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DonnersPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status = filterStatus;
  if (filterCompany) serverParams.Company = filterCompany;

  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchCustomers(serverParams),
    staleTime: 30_000,
  });

  const { data: usersRaw, isLoading: usersLoading } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const customers: Customer[] = normalize(raw);
  const systemUsers: SystemUser[] = normalizeUsers(usersRaw);

  // Lookup map for assigned user display
  const userMap = new Map<string, SystemUser>(
    systemUsers.map((u) => [u.id, u]),
  );

  const displayed = search
    ? customers.filter((c) =>
        [c.fullName, c.email, c.company, c.phone].some((f) =>
          f?.toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : customers;

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
      const temp: Customer = { id: `temp-${Date.now()}`, ...data };
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
        normalize(old).map((c) => (c.id === id ? { ...c, ...data } : c)),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(customers.find((c) => c.id === vars.id) ?? null);
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
        normalize(old).filter((c) => c.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toFormData = (c: Customer): CustomerFormData => ({
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    company: c.company,
    address: c.address,
    status: c.status,
    notes: c.notes,
    assignedToUserId: c.assignedToUserId ?? "",
  });

  const handleSave = (data: CustomerFormData) => {
    setFormError(null);
    if (modal === "add") addMutation.mutate(data);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data });
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  const activeCount = customers.filter((c) => c.status === "Active").length;
  const inactiveCount = customers.filter((c) => c.status === "Inactive").length;
  const blockedCount = customers.filter((c) => c.status === "Blocked").length;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              قاعدة العملاء
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}،` : ","} إجمالي العملاء:{" "}
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
            <UserPlus size={18} />
            إضافة عميل
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "نشط",
              count: activeCount,
              cls: "from-emerald-50 to-emerald-100/50 border-emerald-200/60",
              num: "text-emerald-700",
              lbl: "text-emerald-600",
            },
            {
              label: "غير نشط",
              count: inactiveCount,
              cls: "from-gray-50 to-gray-100/50 border-gray-200/60",
              num: "text-gray-600",
              lbl: "text-gray-500",
            },
            {
              label: "داعم",
              count: blockedCount,
              cls: "from-blue-50 to-blue-100/50 border-blue-200/60",
              num: "text-blue-600",
              lbl: "text-blue-500",
            },
          ].map(({ label, count, cls, num, lbl }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${cls} border rounded-2xl p-4 text-center`}
            >
              <p className={`text-2xl font-bold ${num}`}>{count}</p>
              <p className={`text-xs font-semibold mt-0.5 ${lbl}`}>{label}</p>
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
                placeholder="بحث بالاسم، البريد، الشركة..."
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
                    <option value="Active">نشط</option>
                    <option value="Inactive">غير نشط</option>
                    <option value="Blocked">داعم</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  الشركة
                </label>
                <input
                  className="w-full px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  placeholder="تصفية بالشركة..."
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
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
              جاري تحميل بيانات العملاء...
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
              {displayed.map((c) => {
                const assignedUser = c.assignedToUserId
                  ? userMap.get(c.assignedToUserId)
                  : undefined;
                return (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    assignedUserName={assignedUser?.name}
                    onEdit={() => {
                      setSelected(c);
                      setFormError(null);
                      setModal("edit");
                    }}
                    onDelete={() => {
                      setSelected(c);
                      setModal("delete");
                    }}
                    onView={() => {
                      setSelected(c);
                      setModal("view");
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Search className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد نتائج
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على عملاء مطابقين
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <CustomerModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
          }
          saving={isSaving}
          error={formError}
          users={systemUsers}
          usersLoading={usersLoading}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          name={selected.fullName}
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center text-white font-bold text-2xl">
                  {selected.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selected.fullName}
                  </h2>
                  <p className="text-white/60 text-sm">{selected.company}</p>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "البريد الإلكتروني", value: selected.email },
                { label: "رقم الهاتف", value: selected.phone },
                { label: "الشركة", value: selected.company },
                { label: "العنوان", value: selected.address },
                {
                  label: "المسؤول",
                  value: selected.assignedToUserId
                    ? (userMap.get(selected.assignedToUserId)?.name ?? "—")
                    : "—",
                },
                { label: "الملاحظات", value: selected.notes },
              ]
                .filter((f) => f.value)
                .map(({ label, value }) => (
                  <div
                    key={label}
                    className={
                      label === "الملاحظات" || label === "المسؤول"
                        ? "col-span-2"
                        : ""
                    }
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                      {label}
                    </p>
                    <p className="font-semibold text-[#1B5E4F] truncate">
                      {value}
                    </p>
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
                <Edit size={15} />
                تعديل
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

export default DonnersPage;
