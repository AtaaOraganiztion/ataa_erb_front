import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Phone,
  User,
  Shield,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  MoreVertical,
  Hash,
  Calendar,
  Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  age?: number;
  nid?: string;
  gender?: "Male" | "Female";
  roles?: string[];
}

interface UserFormData {
  name: string;
  email: string;
  phoneNumber: string;
  age: number | string;
  nid: string;
  gender: "Male" | "Female";
  password: string;
}

interface UserEditData {
  name: string;
  phoneNumber: string;
  email: string;
  nid: string;
  age: number | string;
  gender: "Male" | "Female";
}

const EMPTY_FORM: UserFormData = {
  name: "",
  email: "",
  phoneNumber: "",
  age: "",
  nid: "",
  gender: "Male",
  password: "",
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["system-users"] as const;

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

const fetchUsers = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/users/get${qs ? `?${qs}` : ""}`);
};

const apiRegister = (data: UserFormData) =>
  authFetch(`${API_BASE}/Api/V1/users/register`, {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber || null,
      age: data.age !== "" ? Number(data.age) : null,
      nid: data.nid || null,
      gender: data.gender,
      password: data.password,
    }),
  });

const apiUpdateUser = ({ id, data }: { id: string; data: UserEditData }) =>
  authFetch(`${API_BASE}/Api/V1/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      phoneNumber: data.phoneNumber || null,
      email: data.email,
      nid: data.nid || null,
      age: data.age !== "" ? Number(data.age) : null,
      gender: data.gender,
    }),
  });

const apiDeleteUser = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/users/${id}`, { method: "DELETE" });

const normalize = (raw: unknown): SystemUser[] =>
  Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? (raw as any)?.users ?? []);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENDER_MAP: Record<string, string> = { Male: "ذكر", Female: "أنثى" };

const GenderBadge = ({ gender }: { gender?: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      gender === "Male"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-pink-50 text-pink-700 border-pink-200"
    }`}
  >
    {GENDER_MAP[gender ?? ""] ?? "—"}
  </span>
);

const RoleBadge = ({ role }: { role: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1B5E4F]/10 text-[#1B5E4F] border border-[#1B5E4F]/20">
    <Shield size={9} />
    {role}
  </span>
);

// ─── Add User Modal ───────────────────────────────────────────────────────────

const AddUserModal = ({
  saving,
  error,
  onSave,
  onClose,
}: {
  saving: boolean;
  error?: string | null;
  onSave: (d: UserFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof UserFormData, v: any) =>
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
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">إضافة مستخدم جديد</h2>
            <p className="text-white/60 text-sm mt-0.5">
              إنشاء حساب مستخدم في النظام
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

          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> البيانات الشخصية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>الاسم الكامل</label>
                <input
                  className={inputCls}
                  placeholder="الاسم الكامل"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>البريد الإلكتروني</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="example@company.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>رقم الهاتف</label>
                <input
                  className={inputCls}
                  placeholder="+966 5xx xxx xxx"
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>العمر</label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="0"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>الرقم الوطني (NID)</label>
                <input
                  className={inputCls}
                  placeholder="1xxxxxxxxx"
                  value={form.nid}
                  onChange={(e) => set("nid", e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className={labelCls}>الجنس</label>
                <div className="relative">
                  <select
                    className={inputCls + " appearance-none"}
                    value={form.gender}
                    onChange={(e) =>
                      set("gender", e.target.value as UserFormData["gender"])
                    }
                  >
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> بيانات الدخول
            </h3>
            <div>
              <label className={labelCls}>كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className={inputCls + " pl-12"}
                  placeholder="كلمة مرور قوية"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] hover:text-[#1B5E4F] transition-colors text-xs font-bold"
                >
                  {showPass ? "إخفاء" : "إظهار"}
                </button>
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
              <CheckCircle2 size={16} />
            )}
            إضافة المستخدم
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit User Modal ──────────────────────────────────────────────────────────

const EditUserModal = ({
  initial,
  saving,
  error,
  onSave,
  onClose,
}: {
  initial: UserEditData;
  saving: boolean;
  error?: string | null;
  onSave: (d: UserEditData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<UserEditData>(initial);
  const set = (k: keyof UserEditData, v: any) =>
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
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              تعديل بيانات المستخدم
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              تحديث المعلومات الأساسية
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>الاسم الكامل</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>البريد الإلكتروني</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>رقم الهاتف</label>
              <input
                className={inputCls}
                value={form.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>العمر</label>
              <input
                type="number"
                className={inputCls}
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>الرقم الوطني</label>
              <input
                className={inputCls}
                value={form.nid}
                onChange={(e) => set("nid", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelCls}>الجنس</label>
              <div className="relative">
                <select
                  className={inputCls + " appearance-none"}
                  value={form.gender}
                  onChange={(e) =>
                    set("gender", e.target.value as UserEditData["gender"])
                  }
                >
                  <option value="Male">ذكر</option>
                  <option value="Female">أنثى</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                />
              </div>
            </div>
          </div>
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
            حفظ التعديلات
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
        هل أنت متأكد من حذف المستخدم{" "}
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
          )}{" "}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── User Card ────────────────────────────────────────────────────────────────

const UserCard = ({
  user,
  onEdit,
  onDelete,
  onView,
}: {
  user: SystemUser;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "U";

  return (
    <div className="bg-white rounded-2xl shadow-md border border-[#B8976B]/15 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
      {/* Header */}
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
                {user.name}
              </h3>
              <p className="text-white/60 text-xs mt-0.5 truncate" dir="ltr">
                {user.email}
              </p>
              {user.gender && (
                <div className="mt-1.5">
                  <GenderBadge gender={user.gender} />
                </div>
              )}
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

      {/* Body */}
      <div className="p-5 space-y-3 flex-1">
        {user.phoneNumber && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Phone size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm" dir="ltr">
              {user.phoneNumber}
            </span>
          </div>
        )}
        {user.nid && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Hash size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-xs font-mono text-gray-400" dir="ltr">
              {user.nid}
            </span>
          </div>
        )}
        {user.age && (
          <div className="flex items-center gap-2 text-[#4A4A4A]">
            <Calendar size={14} className="text-[#B8976B] shrink-0" />
            <span className="text-sm">{user.age} سنة</span>
          </div>
        )}

        {user.roles && user.roles.length > 0 && (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-[#B8976B]/20 to-transparent" />
            <div>
              <div className="flex items-center gap-1 text-[#B8976B] mb-2">
                <Shield size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  الصلاحيات
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((r) => (
                  <RoleBadge key={r} role={r} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer CTA */}
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

const UsersPage = () => {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "view">(
    null,
  );
  const [selected, setSelected] = useState<SystemUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const serverParams: Record<string, string> = {
    PageIndex: String(page),
    PageSize: "20",
    ...(search ? { Name: search } : {}),
  };

  const {
    data: rawUsers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchUsers(serverParams),
    staleTime: 30_000,
  });

  const users: SystemUser[] = normalize(rawUsers);

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormError(null);
  };

  // ── Add mutation ──────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: apiRegister,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: SystemUser = {
        id: `temp-${Date.now()}`,
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber || undefined,
        age: data.age !== "" ? Number(data.age) : undefined,
        nid: data.nid || undefined,
        gender: data.gender,
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

  // ── Edit mutation ─────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: apiUpdateUser,
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).map((u) =>
          u.id === id
            ? {
                ...u,
                name: data.name,
                email: data.email,
                phoneNumber: data.phoneNumber || undefined,
                age: data.age !== "" ? Number(data.age) : undefined,
                nid: data.nid || undefined,
                gender: data.gender,
              }
            : u,
        ),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
      setFormError((_e as Error).message);
      setSelected(users.find((u) => u.id === vars.id) ?? null);
      setModal("edit");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: apiDeleteUser,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).filter((u) => u.id !== id),
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([k, v]: any) => qc.setQueryData(k, v));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toEditData = (u: SystemUser): UserEditData => ({
    name: u.name,
    email: u.email,
    phoneNumber: u.phoneNumber ?? "",
    age: u.age ?? "",
    nid: u.nid ?? "",
    gender: u.gender ?? "Male",
  });

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              إدارة المستخدمين
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              إجمالي المستخدمين:{" "}
              <span className="font-bold text-[#1B5E4F]">{users.length}</span>
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
            إضافة مستخدم
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]"
                size={17}
              />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
              />
            </div>
          </div>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm">جاري تحميل المستخدمين...</p>
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
          (users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  onEdit={() => {
                    setSelected(u);
                    setFormError(null);
                    setModal("edit");
                  }}
                  onDelete={() => {
                    setSelected(u);
                    setModal("delete");
                  }}
                  onView={() => {
                    setSelected(u);
                    setModal("view");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Users className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا يوجد مستخدمون
              </h3>
              <p className="text-gray-400 text-sm">
                لم يتم العثور على مستخدمين
              </p>
            </div>
          ))}
      </div>

      {/* Modals */}
      {modal === "add" && (
        <AddUserModal
          saving={addMutation.isPending}
          error={formError}
          onSave={(data) => {
            setFormError(null);
            addMutation.mutate(data);
          }}
          onClose={closeModal}
        />
      )}

      {modal === "edit" && selected && (
        <EditUserModal
          initial={toEditData(selected)}
          saving={editMutation.isPending}
          error={formError}
          onSave={(data) => {
            setFormError(null);
            editMutation.mutate({ id: selected.id, data });
          }}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          name={selected.name}
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
            <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6">
              <button
                onClick={closeModal}
                className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg"
              >
                <X className="text-white" size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {selected.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selected.name}
                  </h2>
                  <p className="text-white/60 text-sm" dir="ltr">
                    {selected.email}
                  </p>
                  {selected.gender && (
                    <div className="mt-1">
                      <GenderBadge gender={selected.gender} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["رقم الهاتف", selected.phoneNumber ?? "—"],
                  ["الرقم الوطني", selected.nid ?? "—"],
                  ["العمر", selected.age ? `${selected.age} سنة` : "—"],
                  ["الجنس", GENDER_MAP[selected.gender ?? ""] ?? "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                      {label}
                    </p>
                    <p className="font-semibold text-[#1B5E4F]">{value}</p>
                  </div>
                ))}
              </div>
              {selected.roles && selected.roles.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-2">
                    الصلاحيات
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.roles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))}
                  </div>
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

export default UsersPage;
