import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, Search, MoreVertical, Edit, Trash2, Eye, X,
  Loader2, AlertTriangle, ChevronDown, CheckCircle, FolderTree,
  User, RefreshCw, Layers, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sector {
  id: string;
  name: string;
  description?: string;
  parentSectorId?: string | null;
  managerUserId?: string | null;
  employeeCount?: number;
}

interface Employee {
  id: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeeNumber: string;
  sectorId: string;
  jobTitle: string;
  baseSalary: number;
  hireDate: string;
  employmentType: string;
  status: string;
  location: string;
}

interface SectorFormData {
  name: string;
  description: string;
  parentId: string;
  managerUserId: string;
}

// Enriched view of a sector with resolved display names
interface EnrichedSector extends Sector {
  parentSectorName: string | null;
  managerName: string | null;
}

const EMPTY_FORM: SectorFormData = { name: "", description: "", parentId: "", managerUserId: "" };
const API_BASE  = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["sectors"] as const;

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

const fetchSectors   = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "")).toString();
  return authFetch(`${API_BASE}/Api/V1/Sector/Get-All${qs ? `?${qs}` : ""}`);
};
const fetchSectorById = (id: string) => authFetch(`${API_BASE}/Api/V1/Sector/${id}`);
const fetchEmployees  = () => authFetch(`${API_BASE}/Api/V1/Employee/Get-All`);

const apiAdd = (data: SectorFormData) =>
  authFetch(`${API_BASE}/Api/V1/Sector/Add`, {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      description: data.description || undefined,
      parentId: data.parentId || undefined,
      managerUserId: data.managerUserId || undefined,
    }),
  });

const apiUpdate = ({ id, data }: { id: string; data: SectorFormData }) =>
  authFetch(`${API_BASE}/Api/V1/Sector/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      description: data.description || undefined,
      parentId: data.parentId || undefined,
      managerUserId: data.managerUserId || undefined,
    }),
  });

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Sector/${id}`, { method: "DELETE" });

const normalize  = (raw: unknown): Sector[]   => Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];
const normalizeE = (raw: unknown): Employee[] => Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];

// ─── Enrichment helper ────────────────────────────────────────────────────────
// Resolves parentSectorId → name from sectors list
// Resolves managerUserId  → employee full name from employees list

const enrich = (sector: Sector, allSectors: Sector[], allEmployees: Employee[]): EnrichedSector => {
  const parentSectorName = sector.parentSectorId
    ? allSectors.find(s => s.id === sector.parentSectorId)?.name ?? sector.parentSectorId
    : null;

  const managerEmp = sector.managerUserId
    ? allEmployees.find(e => e.id === sector.managerUserId)
    : null;
  const managerName = managerEmp
    ? `${managerEmp.employeeFirstName} ${managerEmp.employeeLastName}`
    : sector.managerUserId ?? null;

  return { ...sector, parentSectorName, managerName };
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

const SectorModal = ({
  mode, initial, sectors, employees, editingId, saving, error, onSave, onClose,
}: {
  mode: "add" | "edit";
  initial: SectorFormData;
  sectors: Sector[];
  employees: Employee[];
  editingId?: string;
  saving: boolean;
  error?: string | null;
  onSave: (d: SectorFormData) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<SectorFormData>(initial);
  const set = (k: keyof SectorFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = "w-full px-4 py-2.5 border-2 border-[#B8976B]/25 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const labelCls = "block text-[10px] font-bold text-[#1B5E4F]/60 mb-1.5 uppercase tracking-widest";

  const parentOptions  = sectors.filter(s => s.id !== editingId);
  const selectedParent = parentOptions.find(s => s.id === form.parentId);
  const selectedEmp    = employees.find(e => e.id === form.managerUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Layers size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "add" ? "إضافة قطاع جديد" : "تعديل بيانات القطاع"}
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                {mode === "add" ? "أدخل تفاصيل القطاع" : "تحديث معلومات القطاع"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <X className="text-white/70" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm">
              <AlertTriangle size={16} className="shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className={labelCls}>اسم القطاع *</label>
            <input
              className={inputCls}
              placeholder="مثال: قطاع الموارد البشرية"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>الوصف</label>
            <textarea
              className={inputCls + " resize-none h-24"}
              placeholder="وصف موجز لمهام ونطاق عمل هذا القطاع..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {/* Parent Sector — dropdown showing names */}
          <div>
            <label className={labelCls}>القطاع الأب (اختياري)</label>
            <div className="relative">
              <select
                className={inputCls + " appearance-none pl-8"}
                value={form.parentId}
                onChange={e => set("parentId", e.target.value)}
              >
                <option value="">-- لا يوجد (قطاع رئيسي) --</option>
                {parentOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
              <FolderTree size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]/40 pointer-events-none" />
            </div>
            {selectedParent && (
              <p className="text-xs text-[#1B5E4F]/50 mt-1.5 flex items-center gap-1">
                <ChevronRight size={12} />
                تابع لـ: <span className="font-bold text-[#1B5E4F]/70">{selectedParent.name}</span>
              </p>
            )}
          </div>

          {/* Manager — dropdown showing employee names */}
          <div>
            <label className={labelCls}>مدير القطاع (اختياري)</label>
            <div className="relative">
              <select
                className={inputCls + " appearance-none pl-8"}
                value={form.managerUserId}
                onChange={e => set("managerUserId", e.target.value)}
              >
                <option value="">-- اختر المدير المسؤول --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.employeeFirstName} {e.employeeLastName} — {e.jobTitle}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
              <User size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]/40 pointer-events-none" />
            </div>
            {selectedEmp && (
              <p className="text-xs text-[#1B5E4F]/50 mt-1.5 flex items-center gap-1">
                <User size={12} />
                <span className="font-bold text-[#1B5E4F]/70">
                  {selectedEmp.employeeFirstName} {selectedEmp.employeeLastName}
                </span>
                <span className="text-gray-300">—</span>
                <span>{selectedEmp.jobTitle}</span>
              </p>
            )}
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
            disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            {mode === "add" ? "إضافة القطاع" : "حفظ التعديلات"}
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
    <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={28} />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">تأكيد الحذف</h3>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        هل أنت متأكد من حذف قطاع <span className="font-bold text-red-600">«{name}»</span>؟
        <br /><span className="text-xs text-gray-400">سيؤثر هذا على القطاعات الفرعية والموظفين المرتبطين.</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">إلغاء</button>
        <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} حذف
        </button>
      </div>
    </div>
  </div>
);

// ─── View Modal ───────────────────────────────────────────────────────────────

const ViewModal = ({
  sector, onClose, onEdit, onDelete,
}: {
  sector: EnrichedSector;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  // Fetch full detail to get any extra fields
  const { data, isLoading } = useQuery({
    queryKey: ["sector", sector.id],
    queryFn: () => fetchSectorById(sector.id),
    staleTime: 15_000,
  });

  // Prefer server data but fall back to enriched cache immediately
  const detail = data ?? sector;
  const isRoot = !sector.parentSectorId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6">
          <button onClick={onClose} className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-xl transition-all">
            <X className="text-white/70" size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isRoot ? "bg-white/15" : "bg-[#B8976B]/30"}`}>
              {isRoot
                ? <Building2 size={26} className="text-white" />
                : <Layers size={26} className="text-white" />
              }
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{sector.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isRoot ? "bg-white/15 text-white" : "bg-[#B8976B]/30 text-white/80"}`}>
                {isRoot ? "قطاع رئيسي" : "قطاع فرعي"}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isLoading && !sector && (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#1B5E4F]" size={28} /></div>
          )}

          {sector.description && (
            <div className="p-4 bg-[#F5F1E8]/50 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B] mb-1.5">الوصف</p>
              <p className="text-sm text-gray-600 leading-relaxed">{sector.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Parent sector — show resolved name */}
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FolderTree size={12} className="text-[#B8976B]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B]">القطاع الأب</p>
              </div>
              <p className="text-sm font-semibold text-[#1B5E4F]">
                {sector.parentSectorName ?? "—"}
              </p>
            </div>

            {/* Manager — show resolved name */}
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1.5">
                <User size={12} className="text-[#B8976B]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B]">المدير المسؤول</p>
              </div>
              <p className="text-sm font-semibold text-[#1B5E4F]">
                {sector.managerName ?? "—"}
              </p>
            </div>

            {/* Employee count */}
            <div className="p-3 bg-gray-50 rounded-xl col-span-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={12} className="text-[#B8976B]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B]">عدد الموظفين</p>
              </div>
              <p className="text-sm font-semibold text-[#1B5E4F]">
                {(detail as any)?.employeeCount ?? sector.employeeCount ?? "—"} موظف
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="flex-1 py-2.5 rounded-xl border-2 border-[#1B5E4F]/15 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8] transition-all flex items-center justify-center gap-2"
          >
            <Edit size={14} />تعديل
          </button>
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="py-2.5 px-5 rounded-xl border-2 border-red-100 text-red-500 font-semibold text-sm hover:bg-red-50 transition-all flex items-center gap-2"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sector Card ──────────────────────────────────────────────────────────────

const SectorCard = ({
  sector, onEdit, onDelete, onView,
}: {
  sector: EnrichedSector;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isRoot = !sector.parentSectorId;

  return (
    <div className={`relative bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group ${isRoot ? "border-[#1B5E4F]/20" : "border-[#B8976B]/15"}`}>
      <div className={`h-1 w-full ${isRoot ? "bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E]" : "bg-gradient-to-l from-[#B8976B] to-[#9A7D5B]"}`} />

      <div className="p-6">
        {/* Card head row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isRoot ? "bg-[#1B5E4F]/10" : "bg-[#B8976B]/10"}`}>
              {isRoot
                ? <Building2 size={20} className="text-[#1B5E4F]" />
                : <Layers size={20} className="text-[#B8976B]" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#1B5E4F] text-base leading-tight truncate">{sector.name}</h3>
              {isRoot ? (
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-[#1B5E4F]/8 text-[#1B5E4F] text-[10px] font-bold rounded-md uppercase tracking-wide">
                  قطاع رئيسي
                </span>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <ChevronRight size={11} className="text-[#B8976B]" />
                  {/* Show resolved parent name */}
                  <span className="text-[11px] text-[#B8976B] font-semibold truncate">
                    {sector.parentSectorName ?? "قطاع فرعي"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dropdown menu */}
          <div className="relative shrink-0">
            <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
              <MoreVertical size={16} className="text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30">
                {[
                  { icon: Eye,    label: "عرض التفاصيل", color: "text-[#1B5E4F]", action: onView   },
                  { icon: Edit,   label: "تعديل",         color: "text-blue-600",  action: onEdit   },
                  { icon: Trash2, label: "حذف",           color: "text-red-500",   action: onDelete },
                ].map(({ icon: Icon, label, color, action }) => (
                  <button
                    key={label}
                    onClick={() => { action(); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-all text-right ${color}`}
                  >
                    <Icon size={14} /><span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {sector.description
          ? <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">{sector.description}</p>
          : <p className="text-sm text-gray-200 italic mb-4">لا يوجد وصف</p>
        }

        <div className="h-px bg-gradient-to-l from-transparent via-[#B8976B]/15 to-transparent mb-4" />

        {/* Meta — show resolved names */}
        <div className="space-y-2">
          {sector.managerName && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User size={13} className="text-[#B8976B] shrink-0" />
              <span className="truncate font-medium">{sector.managerName}</span>
            </div>
          )}
          {sector.employeeCount !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 size={13} className="text-[#B8976B] shrink-0" />
              <span>{sector.employeeCount} موظف</span>
            </div>
          )}
        </div>

        {/* Hover CTA */}
        <button
          onClick={onView}
          className="mt-4 w-full py-2 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white text-sm font-semibold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Eye size={14} />عرض القطاع
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type ModalType = "add" | "edit" | "delete" | "view" | null;

export default function Sectors() {
  const qc = useQueryClient();

  const [search,       setSearch]       = useState("");
  const [filterParent, setFilterParent] = useState("");
  const [modal,        setModal]        = useState<ModalType>(null);
  const [selected,     setSelected]     = useState<EnrichedSector | null>(null);
  const [formError,    setFormError]    = useState<string | null>(null);

  const filterParams: Record<string, string> = {};
  if (search)       filterParams.Name           = search;
  if (filterParent) filterParams.ParentSectorId = filterParent;

  // ── Queries
  const { data: rawSectors, isLoading, isError, error } = useQuery({
    queryKey: [...QUERY_KEY, filterParams],
    queryFn: () => fetchSectors(filterParams),
    staleTime: 30_000,
  });

  // Fetch all sectors without filters for name lookups (parent sector names)
  const { data: allSectorsRaw } = useQuery({
    queryKey: ["sectors-all"],
    queryFn: () => fetchSectors(),
    staleTime: 60_000,
  });

  // Fetch all employees for manager name resolution
  const { data: allEmployeesRaw } = useQuery({
    queryKey: ["employees-all"],
    queryFn: fetchEmployees,
    staleTime: 60_000,
  });

  const sectors:      Sector[]   = normalize(rawSectors);
  const allSectors:   Sector[]   = normalize(allSectorsRaw);
  const allEmployees: Employee[] = normalizeE(allEmployeesRaw);

  // Enrich sectors with resolved display names
  const enrichedSectors: EnrichedSector[] = useMemo(
    () => sectors.map(s => enrich(s, allSectors, allEmployees)),
    [sectors, allSectors, allEmployees]
  );

  const rootSectors = allSectors.filter(s => !s.parentSectorId);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(null); };

  // ── Optimistic ADD
  const addMutation = useMutation({
    mutationFn: apiAdd,
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      const temp: Sector = {
        id: `temp-${Date.now()}`,
        name: data.name,
        description: data.description,
        parentSectorId: data.parentId || null,
        managerUserId: data.managerUserId || null,
        employeeCount: 0,
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["sectors-all"] });
    },
  });

  // ── Optimistic EDIT
  const editMutation = useMutation({
    mutationFn: apiUpdate,
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) =>
        normalize(old).map(s =>
          s.id === id
            ? { ...s, name: data.name, description: data.description, parentSectorId: data.parentId || null, managerUserId: data.managerUserId || null }
            : s
        )
      );
      closeModal();
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: any) => qc.setQueryData(key, val));
      setFormError((_e as Error).message);
      setSelected(enrichedSectors.find(s => s.id === vars.id) ?? null);
      setModal("edit");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["sectors-all"] });
    },
  });

  // ── Optimistic DELETE
  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEY });
      qc.setQueriesData({ queryKey: QUERY_KEY }, (old: unknown) => normalize(old).filter(s => s.id !== id));
      closeModal();
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) ctx.prev.forEach(([key, val]: any) => qc.setQueryData(key, val));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["sectors-all"] });
    },
  });

  const openAdd    = ()                   => { setSelected(null); setFormError(null); setModal("add");    };
  const openEdit   = (s: EnrichedSector) => { setSelected(s);    setFormError(null); setModal("edit");   };
  const openDelete = (s: EnrichedSector) => { setSelected(s);                        setModal("delete"); };
  const openView   = (s: EnrichedSector) => { setSelected(s);                        setModal("view");   };

  const toForm = (s: EnrichedSector): SectorFormData => ({
    name: s.name,
    description: s.description ?? "",
    parentId: s.parentSectorId ?? "",
    managerUserId: s.managerUserId ?? "",
  });

  const handleSave = (data: SectorFormData) => {
    setFormError(null);
    if (modal === "add")                   addMutation.mutate(data);
    else if (modal === "edit" && selected) editMutation.mutate({ id: selected.id, data });
  };

  const total   = enrichedSectors.length;
  const rootCnt = enrichedSectors.filter(s => !s.parentSectorId).length;
  const subCnt  = total - rootCnt;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">إدارة القطاعات</h1>
            <p className="text-gray-400 text-sm mt-1">الهيكل التنظيمي للشركة</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                qc.invalidateQueries({ queryKey: QUERY_KEY });
                qc.invalidateQueries({ queryKey: ["sectors-all"] });
                qc.invalidateQueries({ queryKey: ["employees-all"] });
              }}
              className="p-2.5 rounded-xl border-2 border-[#B8976B]/20 text-[#1B5E4F] hover:bg-[#F5F1E8] transition-all"
              title="تحديث"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
            >
              <Plus size={17} />إضافة قطاع
            </button>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && !isError && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "إجمالي القطاعات", value: total,   icon: Building2,  color: "from-[#1B5E4F] to-[#0F4F3E]" },
              { label: "قطاعات رئيسية",   value: rootCnt, icon: Layers,     color: "from-[#B8976B] to-[#9A7D5B]" },
              { label: "قطاعات فرعية",    value: subCnt,  icon: FolderTree, color: "from-[#4A4A4A] to-[#2A2A2A]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#B8976B]/10 p-5 flex items-center gap-4 shadow-sm">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                  <Icon size={19} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1B5E4F]">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/10 p-5 flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]" size={16} />
            <input
              type="text"
              placeholder="البحث باسم القطاع..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-sm text-[#1B5E4F]"
            />
          </div>
          <div className="relative min-w-[200px]">
            <select
              value={filterParent}
              onChange={e => setFilterParent(e.target.value)}
              className="w-full appearance-none pl-8 pr-4 py-2.5 border-2 border-[#B8976B]/15 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
            >
              <option value="">جميع القطاعات</option>
              {rootSectors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none" />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={36} />
            <p className="text-gray-400 text-sm">جاري تحميل القطاعات...</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={24} />
            </div>
            <p className="text-gray-400 text-sm">{(error as Error)?.message ?? "فشل تحميل البيانات"}</p>
            <button onClick={() => qc.invalidateQueries({ queryKey: QUERY_KEY })} className="px-5 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold">
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && (
          enrichedSectors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrichedSectors.map(s => (
                <SectorCard
                  key={s.id}
                  sector={s}
                  onEdit={() => openEdit(s)}
                  onDelete={() => openDelete(s)}
                  onView={() => openView(s)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-[#F5F1E8] flex items-center justify-center">
                <Building2 className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">لا توجد قطاعات</h3>
              <p className="text-gray-400 text-sm mb-6">ابدأ بإضافة القطاع الأول للهيكل التنظيمي</p>
              <button onClick={openAdd} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg text-sm">
                <Plus size={16} />إضافة قطاع
              </button>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <SectorModal
          mode={modal}
          initial={modal === "edit" && selected ? toForm(selected) : EMPTY_FORM}
          sectors={allSectors}
          employees={allEmployees}
          editingId={selected?.id}
          saving={addMutation.isPending || editMutation.isPending}
          error={formError}
          onSave={handleSave}
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
        <ViewModal
          sector={selected}
          onClose={closeModal}
          onEdit={() => openEdit(selected)}
          onDelete={() => openDelete(selected)}
        />
      )}
    </div>
  );
}