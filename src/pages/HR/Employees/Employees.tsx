import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, Mail, MapPin, Calendar, DollarSign, Briefcase,
  Building2, MoreVertical, Edit, Trash2, Eye, UserPlus, X,
  Loader2, AlertTriangle, Hash, ChevronDown, CheckCircle,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeeNumber: string;
  sectorId: string;
  sectorName?: string;
  jobTitle: string;
  baseSalary: number;
  hireDate: string;
  employmentType: "FullTime" | "PartTime" | "Contract";
  status: "Active" | "Inactive";
  location: string;
}

interface Sector {
  id: string;
  name: string;
}

interface EmployeeFormData {
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeeNumber: string;
  sectorId: string;
  jobTitle: string;
  baseSalary: number | string;
  hireDate: string;
  employmentType: "FullTime" | "PartTime" | "Contract";
  status: "Active" | "Inactive";
  location: string;
}

const EMPTY_FORM: EmployeeFormData = {
  employeeFirstName: "", employeeLastName: "", employeeEmail: "",
  employeeNumber: "", sectorId: "", jobTitle: "", baseSalary: "",
  hireDate: "", employmentType: "FullTime", status: "Active", location: "",
};

const API_BASE   = import.meta.env.VITE_API_URL;
const QUERY_KEY  = ["employees"] as const;

// ─── API ──────────────────────────────────────────────────────────────────────

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchEmployees = (params: Record<string, string>) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "")).toString();
  return authFetch(`${API_BASE}/Api/V1/Employee/Get-All${qs ? `?${qs}` : ""}`);
};

const fetchSectors = () => authFetch(`${API_BASE}/Api/V1/Sector/Get-All`);

const apiAdd    = (data: EmployeeFormData) =>
  authFetch(`${API_BASE}/Api/V1/Employee/Add`, {
    method: "POST",
    body: JSON.stringify({ ...data, baseSalary: Number(data.baseSalary) }),
  });

const apiUpdate = ({ id, data }: { id: string; data: EmployeeFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Employee/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, baseSalary: Number(data.baseSalary) }),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Employee/${id}`, { method: "DELETE" });

const normalize = (raw: unknown): Employee[] =>
  Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];

const normalizeSectors = (raw: unknown): Sector[] =>
  Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];

// ─── Badges ───────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    Active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-red-50 text-red-600 border-red-200",
  };
  const lbl: Record<string, string> = { Active: "نشط", Inactive: "غير نشط" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-red-500"}`} />
      {lbl[status] ?? status}
    </span>
  );
};

const ContractBadge = ({ type }: { type: string }) => {
  const m: Record<string, string> = { FullTime: "دوام كامل", PartTime: "دوام جزئي", Contract: "عقد" };
  return (
    <span className="inline-block px-2.5 py-0.5 bg-[#F5F1E8] text-[#1B5E4F] text-xs font-semibold rounded-lg border border-[#B8976B]/20">
      {m[type] ?? type}
    </span>
  );
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

const EmployeeModal = ({
  mode, initial, sectors, saving, error, onSave, onClose,
}: {
  mode: "add" | "edit"; initial: EmployeeFormData; sectors: Sector[];
  saving: boolean; error?: string | null;
  onSave: (d: EmployeeFormData) => void; onClose: () => void;
}) => {
  const [form, setForm] = useState<EmployeeFormData>(initial);
  const set = (k: keyof EmployeeFormData, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls = "block text-xs font-bold text-[#1B5E4F]/70 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{mode === "add" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}</h2>
            <p className="text-white/60 text-sm mt-0.5">{mode === "add" ? "أدخل بيانات الموظف الجديد" : "تحديث المعلومات الأساسية"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-6 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={18} className="shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Personal */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> البيانات الشخصية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الاسم الأول</label>
                <input className={inputCls} placeholder="الاسم الأول" value={form.employeeFirstName} onChange={e => set("employeeFirstName", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الاسم الأخير</label>
                <input className={inputCls} placeholder="الاسم الأخير" value={form.employeeLastName} onChange={e => set("employeeLastName", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>البريد الإلكتروني</label>
                <input type="email" className={inputCls} placeholder="example@company.com" value={form.employeeEmail} onChange={e => set("employeeEmail", e.target.value)} dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>رقم الموظف</label>
                <input className={inputCls} placeholder="EMP-001" value={form.employeeNumber} onChange={e => set("employeeNumber", e.target.value)} dir="ltr" />
              </div>
            </div>
          </section>

          {/* Job */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> بيانات الوظيفة
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>المسمى الوظيفي</label>
                <input className={inputCls} placeholder="المسمى الوظيفي" value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>القطاع</label>
                <div className="relative">
                  <select className={inputCls + " appearance-none"} value={form.sectorId} onChange={e => set("sectorId", e.target.value)}>
                    <option value="">-- اختر القطاع --</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>نوع التوظيف</label>
                <div className="relative">
                  <select className={inputCls + " appearance-none"} value={form.employmentType} onChange={e => set("employmentType", e.target.value as EmployeeFormData["employmentType"])}>
                    <option value="FullTime">دوام كامل</option>
                    <option value="PartTime">دوام جزئي</option>
                    <option value="Contract">عقد</option>
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>الحالة</label>
                <div className="relative">
                  <select className={inputCls + " appearance-none"} value={form.status} onChange={e => set("status", e.target.value as EmployeeFormData["status"])}>
                    <option value="Active">نشط</option>
                    <option value="Inactive">غير نشط</option>
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>الراتب الأساسي (ريال)</label>
                <input type="number" className={inputCls} placeholder="0" value={form.baseSalary} onChange={e => set("baseSalary", e.target.value)} dir="ltr" />
              </div>
              <div>
                <label className={labelCls}>تاريخ التعيين</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.hireDate ? form.hireDate.split("T")[0] : ""}
                  onChange={e => set("hireDate", e.target.value ? `${e.target.value}T00:00:00.000Z` : "")}
                  dir="ltr"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الموقع / المدينة</label>
                <input className={inputCls} placeholder="الرياض، المملكة العربية السعودية" value={form.location} onChange={e => set("location", e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-[#B8976B]/10 flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border-2 border-[#B8976B]/30 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] transition-all">إلغاء</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {mode === "add" ? "إضافة الموظف" : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────

const DeleteModal = ({
  name, deleting, onConfirm, onClose,
}: {
  name: string; deleting: boolean; onConfirm: () => void; onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
      <p className="text-gray-500 text-sm mb-6">
        هل أنت متأكد من حذف الموظف <span className="font-bold text-red-600">{name}</span>؟
        <br /><span className="text-xs">هذا الإجراء لا يمكن التراجع عنه.</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">إلغاء</button>
        <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-60">
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── Employee Card ────────────────────────────────────────────────────────────

const EmployeeCard = ({
  employee, onEdit, onDelete, onView,
}: {
  employee: Employee; onEdit: () => void; onDelete: () => void; onView: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const initials = (employee.employeeFirstName?.[0] ?? "") + (employee.employeeLastName?.[0] ?? "");

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
                {employee.employeeFirstName} {employee.employeeLastName}
              </h3>
              <p className="text-white/60 text-xs mt-0.5 truncate">{employee.jobTitle}</p>
              <div className="mt-1.5"><StatusBadge status={employee.status} /></div>
            </div>
          </div>
          <div className="relative shrink-0">
            <button onClick={() => setOpen(o => !o)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
              <MoreVertical className="text-white/70" size={18} />
            </button>
            {open && (
              <div className="absolute left-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-[#B8976B]/10 overflow-hidden z-30">
                {[
                  { icon: Eye,    label: "عرض التفاصيل", color: "text-[#1B5E4F]", action: onView   },
                  { icon: Edit,   label: "تعديل",         color: "text-blue-600",  action: onEdit   },
                  { icon: Trash2, label: "حذف",           color: "text-red-500",   action: onDelete },
                ].map(({ icon: Icon, label, color, action }) => (
                  <button key={label} onClick={() => { action(); setOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-all text-right ${color}`}>
                    <Icon size={15} /><span className="text-sm font-semibold">{label}</span>
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
          <span className="text-sm truncate">{employee.sectorName ?? employee.sectorId}</span>
        </div>
        <div className="flex items-center gap-2 text-[#4A4A4A]">
          <Mail size={14} className="text-[#B8976B] shrink-0" />
          <span className="text-sm truncate" dir="ltr">{employee.employeeEmail}</span>
        </div>
        <div className="flex items-center gap-2 text-[#4A4A4A]">
          <MapPin size={14} className="text-[#B8976B] shrink-0" />
          <span className="text-sm truncate">{employee.location}</span>
        </div>
        <div className="flex items-center gap-2 text-[#4A4A4A]">
          <Hash size={14} className="text-[#B8976B] shrink-0" />
          <span className="text-xs font-mono text-gray-400" dir="ltr">{employee.employeeNumber}</span>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#B8976B]/20 to-transparent my-3" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1 text-[#B8976B] mb-1">
              <Calendar size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">التعيين</span>
            </div>
            <p className="text-xs font-semibold text-[#1B5E4F]">
              {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("ar-SA") : "—"}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[#B8976B] mb-1">
              <DollarSign size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wide">الراتب</span>
            </div>
            <p className="text-xs font-semibold text-[#1B5E4F]">
              {employee.baseSalary?.toLocaleString("ar-SA")} ريال
            </p>
          </div>
        </div>

        <div className="pt-1"><ContractBadge type={employee.employmentType} /></div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={onView}
          className="w-full py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Briefcase size={15} />عرض الملف الكامل
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EmployeesPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [modal,        setModal]        = useState<null | "add" | "edit" | "delete" | "view">(null);
  const [selected,     setSelected]     = useState<Employee | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);

  // Server-side filter params (status + employment type)
  const serverParams: Record<string, string> = {};
  if (filterStatus) serverParams.Status         = filterStatus;
  if (filterType)   serverParams.EmploymentType = filterType;

  const { data: empRaw, isLoading, isError, error } = useQuery({
    queryKey: [...QUERY_KEY, serverParams],
    queryFn: () => fetchEmployees(serverParams),
    staleTime: 30_000,
  });

  const { data: secRaw } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 60_000,
  });

  const employees: Employee[] = normalize(empRaw);
  const sectors: Sector[]     = normalizeSectors(secRaw);

  // Client-side text search on top of server results
  const displayed = search
    ? employees.filter(e =>
        `${e.employeeFirstName} ${e.employeeLastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeEmail.toLowerCase().includes(search.toLowerCase()) ||
        e.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeNumber.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  const closeModal = () => { setModal(null); setSelected(null); setFormError(null); };

  // ── Optimistic ADD ────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: Employee = {
        id: `temp-${Date.now()}`,
        ...data,
        baseSalary: Number(data.baseSalary),
        sectorName: sectors.find(s => s.id === data.sectorId)?.name,
      };
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => [...normalize(old), temp]);
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: any) => qc.setQueryData(key, val));
      setFormError((_e as Error).message);
      setModal("add");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Optimistic EDIT ───────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: apiUpdate,
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).map(e =>
          e.id === id
            ? { ...e, ...data, baseSalary: Number(data.baseSalary), sectorName: sectors.find(s => s.id === data.sectorId)?.name }
            : e
        )
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: any) => qc.setQueryData(key, val));
      setFormError((_e as Error).message);
      setSelected(employees.find(e => e.id === vars.id) ?? null);
      setModal("edit");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  // ── Optimistic DELETE ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).filter(e => e.id !== id)
      );
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: any) => qc.setQueryData(key, val));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const openAdd    = ()            => { setSelected(null); setFormError(null); setModal("add");    };
  const openEdit   = (e: Employee) => { setSelected(e);    setFormError(null); setModal("edit");   };
  const openDelete = (e: Employee) => { setSelected(e);                        setModal("delete"); };
  const openView   = (e: Employee) => { setSelected(e);                        setModal("view");   };

  const toFormData = (e: Employee): EmployeeFormData => ({
    employeeFirstName: e.employeeFirstName, employeeLastName: e.employeeLastName,
    employeeEmail: e.employeeEmail, employeeNumber: e.employeeNumber,
    sectorId: e.sectorId, jobTitle: e.jobTitle, baseSalary: e.baseSalary,
    hireDate: e.hireDate, employmentType: e.employmentType,
    status: e.status, location: e.location,
  });

  const handleSave = (data: EmployeeFormData) => {
    setFormError(null);
    if (modal === "add")                   addMutation.mutate(data);
    else if (modal === "edit" && selected) editMutation.mutate({ id: selected.id, data });
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">إدارة الموظفين</h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}،` : ","} إجمالي الموظفين:{" "}
              <span className="font-bold text-[#1B5E4F]">{displayed.length}</span>
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all self-start sm:self-auto"
          >
            <UserPlus size={18} />إضافة موظف
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-5">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]" size={17} />
              <input
                type="text"
                placeholder="بحث بالاسم، البريد، الوظيفة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
              />
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${showFilters ? "bg-[#1B5E4F] text-white border-[#1B5E4F]" : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]"}`}
            >
              <Filter size={16} />تصفية
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">الحالة</label>
                <div className="relative">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]">
                    <option value="">جميع الحالات</option>
                    <option value="Active">نشط</option>
                    <option value="Inactive">غير نشط</option>
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">نوع التوظيف</label>
                <div className="relative">
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]">
                    <option value="">جميع الأنواع</option>
                    <option value="FullTime">دوام كامل</option>
                    <option value="PartTime">دوام جزئي</option>
                    <option value="Contract">عقد</option>
                  </select>
                  <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm font-medium">جاري تحميل بيانات الموظفين...</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
            <p className="text-gray-500 text-sm">فشل تحميل البيانات: {(error as Error)?.message}</p>
            <button onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })} className="px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold">إعادة المحاولة</button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && (
          displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map(emp => (
                <EmployeeCard key={emp.id} employee={emp} onEdit={() => openEdit(emp)} onDelete={() => openDelete(emp)} onView={() => openView(emp)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Search className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">لا توجد نتائج</h3>
              <p className="text-gray-400 text-sm">لم يتم العثور على موظفين مطابقين</p>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <EmployeeModal
          mode={modal}
          initial={modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM}
          sectors={sectors}
          saving={addMutation.isPending || editMutation.isPending}
          error={formError}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {modal === "delete" && selected && (
        <DeleteModal
          name={`${selected.employeeFirstName} ${selected.employeeLastName}`}
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          onClose={closeModal}
        />
      )}

      {modal === "view" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6 relative">
              <button onClick={closeModal} className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg">
                <X className="text-white" size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] flex items-center justify-center text-white font-bold text-2xl">
                  {selected.employeeFirstName[0]}{selected.employeeLastName[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selected.employeeFirstName} {selected.employeeLastName}</h2>
                  <p className="text-white/60 text-sm">{selected.jobTitle}</p>
                  <div className="mt-1"><StatusBadge status={selected.status} /></div>
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "البريد الإلكتروني", value: selected.employeeEmail },
                { label: "رقم الموظف",        value: selected.employeeNumber },
                { label: "القطاع",            value: selected.sectorName ?? selected.sectorId },
                { label: "الموقع",            value: selected.location },
                { label: "الراتب",            value: `${selected.baseSalary?.toLocaleString("ar-SA")} ريال` },
                { label: "تاريخ التعيين",     value: new Date(selected.hireDate).toLocaleDateString("ar-SA") },
                { label: "نوع التوظيف",       value: { FullTime: "دوام كامل", PartTime: "دوام جزئي", Contract: "عقد" }[selected.employmentType] ?? selected.employmentType },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">{label}</p>
                  <p className="font-semibold text-[#1B5E4F] truncate">{value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { closeModal(); openEdit(selected); }} className="flex-1 py-2.5 rounded-xl border-2 border-[#1B5E4F]/20 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] transition-all flex items-center justify-center gap-2">
                <Edit size={15} />تعديل
              </button>
              <button onClick={() => { closeModal(); openDelete(selected); }} className="py-2.5 px-4 rounded-xl border-2 border-red-100 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;