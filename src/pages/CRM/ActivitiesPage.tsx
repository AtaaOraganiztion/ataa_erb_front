import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
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
  MessageCircle,
  FileText,
  CheckSquare,
  Clock,
  XCircle,
  Target,
  User,
  ChevronLeft,
  ChevronRight,
  Upload,
  Paperclip,
  File,
  Image,
  FileArchive,
  Download,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Hourglass,
  CircleCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivityType = "Call" | "Email" | "Meeting" | "Note" | "Task";
type ActivityStatus = "Planned" | "Completed" | "Cancelled";
type ActivityResult = "accept" | "reject" | "unporcceed" | "fail";

interface ActivityFile {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeInBytes: number;
  uploadedAtUtc: string;
  downloadUrl?: string;
  _localFile?: globalThis.File;
}

interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  activityDate: string;
  status: ActivityStatus;
  activityResult?: ActivityResult;
  customerId?: string;
  leadId?: string;
  assignedToUserId?: string;
  files: ActivityFile[];
}

interface Customer {
  id: string;
  fullName?: string;
  company?: string;
}
interface Lead {
  id: string;
  company: string;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  nid?: string;
}

interface ActivityFormData {
  type: ActivityType;
  subject: string;
  description: string;
  activityDate: string;
  status: ActivityStatus;
  activityResult: ActivityResult;
  customerId: string;
  leadId: string;
  assignedToUserId: string;
  existingFiles: ActivityFile[];
  newFiles: ActivityFile[];
  keptFileIds?: string[];
}

const EMPTY_FORM: ActivityFormData = {
  type: "Call",
  subject: "",
  description: "",
  activityDate: new Date().toISOString(),
  status: "Planned",
  activityResult: "accept",
  customerId: "",
  leadId: "",
  assignedToUserId: "",
  existingFiles: [],
  newFiles: [],
};

const API_BASE = import.meta.env.VITE_API_URL;
const QUERY_KEY = ["activities"] as const;
const CUSTOMERS_KEY = ["customers"] as const;
const LEADS_KEY = ["leads"] as const;
const USERS_KEY = ["system-users"] as const;

// ─── ULID Generator ───────────────────────────────────────────────────────────
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const generateULID = (): string => {
  let t = Date.now();
  let timeStr = "";
  for (let i = 9; i >= 0; i--) {
    timeStr = CROCKFORD[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randStr = "";
  for (let i = 0; i < 16; i++) {
    randStr += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return timeStr + randStr;
};

// ─── Auth Fetch ───────────────────────────────────────────────────────────────
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    ...options,
    headers: {
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

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchActivities = () => authFetch(`${API_BASE}/Api/V1/Activity/Get-All`);
const fetchCustomers = () => authFetch(`${API_BASE}/Api/V1/Customer/Get-All`);
const fetchLeads = () => authFetch(`${API_BASE}/Api/V1/Lead/Get-All`);
const fetchUsers = () =>
  authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`);

const buildFormData = (data: ActivityFormData): FormData => {
  const fd = new FormData();
  fd.append("Type", data.type);
  fd.append("Subject", data.subject);
  fd.append("Description", data.description || "");
  fd.append("ActivityDate", data.activityDate);
  fd.append("Status", data.status);
  fd.append("ActivityResult", data.activityResult);
  if (data.customerId) fd.append("CustomerId", data.customerId);
  if (data.leadId) fd.append("LeadId", data.leadId);
  if (data.assignedToUserId)
    fd.append("AssignedToUserId", data.assignedToUserId);

  // Fixed: null check for keptFileIds
  if (data.keptFileIds?.length) {
    data.keptFileIds.forEach((id) => fd.append("KeptFileIds", id));
  }

  // Only upload brand-new files
  data.newFiles.forEach((f) => {
    if (f._localFile) fd.append("Files", f._localFile);
  });

  return fd;
};

const apiAdd = async (data: ActivityFormData) => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(`${API_BASE}/Api/V1/Activity/Add`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: buildFormData(data),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
};

const apiUpdate = async ({
  id,
  data,
}: {
  id: string;
  data: ActivityFormData;
}) => {
  const token = localStorage.getItem("accessToken") ?? "";

  const fd = new FormData();
  fd.append("Type", data.type);
  fd.append("Subject", data.subject);
  fd.append("Description", data.description || "");
  fd.append("ActivityDate", data.activityDate);
  fd.append("Status", data.status);
  fd.append("ActivityResult", data.activityResult);
  if (data.customerId) fd.append("CustomerId", data.customerId);
  if (data.leadId) fd.append("LeadId", data.leadId);
  if (data.assignedToUserId)
    fd.append("AssignedToUserId", data.assignedToUserId);

  // Re-download existing server files and re-attach them
  for (const existingFile of data.existingFiles) {
    if (existingFile._localFile) {
      // Already a local blob (shouldn't happen in edit, but just in case)
      fd.append("Files", existingFile._localFile, existingFile.fileName);
    } else if (existingFile.downloadUrl) {
      try {
        const fileId =
          existingFile.downloadUrl.split("/").pop() || existingFile.id;
        const res = await fetch(`${API_BASE}/files/${fileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          fd.append("Files", blob, existingFile.fileName);
        }
      } catch (e) {
        console.warn("Could not re-fetch file:", existingFile.fileName, e);
      }
    }
  }

  // Append brand-new files
  data.newFiles.forEach((f) => {
    if (f._localFile) fd.append("Files", f._localFile, f.fileName);
  });

  const res = await fetch(`${API_BASE}/Api/V1/Activity/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
};

const apiDelete = (id: string) =>
  authFetch(`${API_BASE}/Api/V1/Activity/${id}`, { method: "DELETE" });

const norm = (raw: unknown): any[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const fileToActivityFile = (f: globalThis.File): ActivityFile => ({
  id: generateULID(),
  fileName: f.name,
  contentType: f.type || "application/octet-stream",
  fileSizeInBytes: f.size,
  uploadedAtUtc: new Date().toISOString(),
  _localFile: f,
});

const fileIcon = (contentType: string) => {
  if (contentType.startsWith("image/")) return Image;
  if (
    contentType.includes("pdf") ||
    contentType.includes("word") ||
    contentType.includes("text")
  )
    return FileText;
  if (
    contentType.includes("zip") ||
    contentType.includes("rar") ||
    contentType.includes("7z")
  )
    return FileArchive;
  return File;
};

const downloadFile = async (file: ActivityFile) => {
  if (!file.downloadUrl) {
    alert("رابط التحميل غير متوفر لهذا الملف");
    return;
  }
  try {
    const token = localStorage.getItem("accessToken") ?? "";
    const fileId = file.downloadUrl.split("/").pop() || file.id;
    const url = `${API_BASE}/files/${fileId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 404)
        throw new Error("الملف غير موجود أو تم حذفه (404)");
      throw new Error(`فشل تحميل الملف - كود الخطأ: ${res.status}`);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = file.fileName || "file";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (err: any) {
    console.error("Download error:", err);
    alert(err.message || "حدث خطأ أثناء تحميل الملف");
  }
};

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
    label: "واتساب",
    Icon: MessageCircle,
    bg: "bg-amber-100",
    text: "text-amber-600",
    card: "from-amber-500 to-amber-700",
  },
  Note: {
    label: "منصة",
    Icon: Globe,
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
    label: "متابعة ",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
    Icon: Clock,
  },
  Completed: {
    label: "طلب جديد",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircle,
  },
  Cancelled: {
    label: "استكمال طلب",
    cls: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
    Icon: XCircle,
  },
};

const RESULT_CFG: Record<
  ActivityResult,
  { label: string; cls: string; Icon: any }
> = {
  accept: {
    label: "دعم / قبول",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: ThumbsUp,
  },
  reject: {
    label: "اعتذر",
    cls: "bg-red-50 text-red-600 border-red-200",
    Icon: ThumbsDown,
  },
  unporcceed: {
    label: "قيد الانتظار",
    cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Icon: Hourglass,
  },
  fail: {
    label: "  لم يرد",
    cls: "bg-gray-50 text-gray-600 border-gray-200",
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

const ResultBadge = ({ result }: { result?: ActivityResult }) => {
  if (!result) return null;
  const cfg = RESULT_CFG[result];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}
    >
      <cfg.Icon size={11} /> {cfg.label}
    </span>
  );
};

// ─── Files Section ────────────────────────────────────────────────────────────
/**
 * In add mode:  existingFiles=[],  newFiles=mutable
 * In edit mode: existingFiles=server files (read-only), newFiles=mutable
 * In view mode: existingFiles=server files (read-only, download only)
 */
const FilesSection = ({
  existingFiles = [],
  newFiles = [],
  onExistingFilesChange,
  onNewFilesChange,
  isViewMode = false,
}: {
  existingFiles?: ActivityFile[];
  newFiles?: ActivityFile[];
  onExistingFilesChange?: (files: ActivityFile[]) => void;

  onNewFilesChange?: (files: ActivityFile[]) => void;
  isViewMode?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const removeExistingFile = (id: string) => {
    if (!onExistingFilesChange) return;
    onExistingFilesChange(existingFiles.filter((f) => f.id !== id));
  };

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || !onNewFilesChange) return;
      const entries = Array.from(incoming).map(fileToActivityFile);
      onNewFilesChange([...newFiles, ...entries]);
    },
    [newFiles, onNewFilesChange],
  );

  const removeNewFile = (id: string) => {
    if (!onNewFilesChange) return;
    onNewFilesChange(newFiles.filter((f) => f.id !== id));
  };

  const FileRow = ({
    f,
    removable,
    onRemove,
  }: {
    f: ActivityFile;
    removable?: boolean;
    onRemove?: () => void;
  }) => {
    const IconComp = fileIcon(f.contentType);
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F1E8]/60 border border-[#B8976B]/20 rounded-2xl group hover:border-[#B8976B]/40 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-white border border-[#B8976B]/20 flex items-center justify-center shrink-0">
          <IconComp size={18} className="text-[#B8976B]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1B5E4F] truncate">
            {f.fileName}
          </p>
          <p className="text-xs text-gray-400">
            {formatBytes(f.fileSizeInBytes)}
          </p>
        </div>
        {f.downloadUrl && (
          <button
            onClick={() => downloadFile(f)}
            className="p-2 text-[#1B5E4F] hover:bg-[#1B5E4F]/10 rounded-xl transition-colors"
            title="تحميل الملف"
          >
            <Download size={18} />
          </button>
        )}
        {!isViewMode && onExistingFilesChange && (
          <button
            onClick={() => removeExistingFile(f.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            title="حذف الملف"
          >
            <X size={18} />
          </button>
        )}
        {removable && onRemove && (
          <button
            onClick={onRemove}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            title="إزالة"
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  };

  return (
    <section>
      <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-4 h-px bg-[#B8976B]" /> المستندات والملفات
      </h3>

      {/* Existing server files (always read-only) */}
      {existingFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {!isViewMode && (
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Paperclip size={11} /> ملفات محفوظة على الخادم
            </p>
          )}
          {existingFiles.map((f) => (
            <FileRow key={f.id} f={f} removable={false} />
          ))}
        </div>
      )}

      {/* New files (user-picked, not yet uploaded) */}
      {!isViewMode && (
        <>
          {newFiles.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                <Upload size={11} /> ملفات جديدة ستُرفع عند الحفظ
              </p>
              {newFiles.map((f) => (
                <FileRow
                  key={f.id}
                  f={f}
                  removable={true}
                  onRemove={() => removeNewFile(f.id)}
                />
              ))}
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer select-none transition-all ${
              dragging
                ? "border-[#1B5E4F] bg-[#1B5E4F]/5 scale-[1.01]"
                : "border-[#B8976B]/40 hover:border-[#1B5E4F]/50 hover:bg-[#F5F1E8]/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${dragging ? "bg-[#1B5E4F]/10" : "bg-[#F5F1E8]"}`}
            >
              <Upload
                size={22}
                className={dragging ? "text-[#1B5E4F]" : "text-[#B8976B]"}
              />
            </div>
            <p className="text-sm font-semibold text-[#1B5E4F]">
              اسحب الملفات هنا أو
              <span className="text-[#B8976B] underline underline-offset-2">
                اضغط للاختيار
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF · Word · صور · أرشيف · وغيرها
            </p>
          </div>
        </>
      )}

      {isViewMode && existingFiles.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد مرفقات</p>
      )}
    </section>
  );
};

// ─── Activity Modal ───────────────────────────────────────────────────────────
const ActivityModal = ({
  mode,
  initial,
  saving,
  error,
  customers,
  leads,
  systemUsers,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: ActivityFormData;
  saving: boolean;
  error?: string | null;
  customers: Customer[];
  leads: Lead[];
  systemUsers: SystemUser[];
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

  const typeCfg = TYPE_CFG[form.type];

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
        <div
          className={`bg-gradient-to-l ${typeCfg.card} px-8 py-6 flex items-center justify-between shrink-0`}
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "إضافة نشاط جديد" : "تعديل النشاط"}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              {mode === "add" ? "سجّل نشاطاً جديداً" : "تحديث بيانات النشاط"}
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

          {/* Type */}
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

          {/* Details */}
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
                    className={inputCls}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="Planned">متابعة</option>
                    <option value="Completed">طلب جديد</option>
                    <option value="Cancelled">استكمال طلب</option>
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

              {/* Activity Result */}
              <div className="col-span-2">
                <label className={labelCls}>نتيجة النشاط</label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      "accept",
                      "reject",
                      "unporcceed",
                      "fail",
                    ] as ActivityResult[]
                  ).map((r) => {
                    const cfg = RESULT_CFG[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => set("activityResult", r)}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                          form.activityResult === r
                            ? `border-current ${cfg.cls} shadow-sm`
                            : "border-[#B8976B]/20 text-gray-400 hover:border-[#B8976B]/40"
                        }`}
                      >
                        <cfg.Icon size={16} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Linked Entities */}
          <section>
            <h3 className="text-sm font-bold text-[#B8976B] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-px bg-[#B8976B]" /> الربط والتعيين
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>المانح (اختياري)</label>
                <select
                  className={inputCls}
                  value={form.customerId}
                  onChange={(e) => set("customerId", e.target.value)}
                >
                  <option value="">بدون ربط بعميل</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName ?? "—"} {c.company ? `— ${c.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>الجمعيات (اختياري)</label>
                <select
                  className={inputCls}
                  value={form.leadId}
                  onChange={(e) => set("leadId", e.target.value)}
                >
                  <option value="">بدون ربط بجمعية</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className={labelCls}>المسؤول (اختياري)</label>
                <select
                  className={inputCls}
                  value={form.assignedToUserId}
                  onChange={(e) => set("assignedToUserId", e.target.value)}
                >
                  <option value="">بدون تعيين</option>
                  {systemUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.email ? `— ${u.email}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <FilesSection
            existingFiles={form.existingFiles}
            newFiles={form.newFiles}
            onExistingFilesChange={(files) =>
              setForm((f) => ({ ...f, existingFiles: files }))
            }
            onNewFilesChange={(files) =>
              setForm((f) => ({ ...f, newFiles: files }))
            }
          />
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-[#B8976B]/10 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Paperclip size={12} className="text-[#B8976B]" />
            {form.existingFiles.length} محفوظ
            {form.newFiles.length > 0 && (
              <span className="text-emerald-600 font-semibold">
                + {form.newFiles.length} جديد
              </span>
            )}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border-2 border-[#B8976B]/30 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8]"
            >
              إلغاء
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl bg-gradient-to-l ${typeCfg.card} text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60`}
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
        هل أنت متأكد من حذف النشاط
        <span className="font-bold text-red-600">{subject}</span>؟
      </p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
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

// ─── Activities Table ─────────────────────────────────────────────────────────
const ActivitiesTable = ({
  activities,
  leadMap,
  userMap,
  onEdit,
  onDelete,
  onView,
}: {
  activities: Activity[];
  leadMap: Map<string, Lead>;
  userMap: Map<string, SystemUser>;
  onEdit: (a: Activity) => void;
  onDelete: (a: Activity) => void;
  onView: (a: Activity) => void;
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(activities.length / pageSize);
  const paged = activities.slice((page - 1) * pageSize, page * pageSize);

  const thCls =
    "px-4 py-3 text-right text-xs font-bold text-[#1B5E4F]/60 uppercase tracking-wider whitespace-nowrap";
  const tdCls = "px-4 py-3 text-sm text-[#1B5E4F] whitespace-nowrap";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px]" dir="rtl">
          <thead className="bg-[#F5F1E8]/60 border-b border-[#B8976B]/15">
            <tr>
              <th className={thCls}>المسؤول</th>
              <th className={thCls}>النوع</th>
              <th className={thCls}>الموضوع</th>
              <th className={thCls}>التاريخ</th>
              <th className={thCls}>الجمعيات</th>
              <th className={thCls}>المرفقات</th>
              <th className={thCls}>الحالة</th>
              <th className={thCls}>النتيجة</th>
              <th className={thCls + " text-center"}>الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#B8976B]/10">
            {paged.map((a) => {
              const isOverdue =
                a.status === "Planned" && new Date(a.activityDate) < new Date();
              const typeCfg = TYPE_CFG[a.type];
              const TypeIcon = typeCfg.Icon;
              const leadTitle = a.leadId
                ? leadMap.get(a.leadId)?.company
                : null;
              const userName = a.assignedToUserId
                ? userMap.get(a.assignedToUserId)?.name
                : null;
              const fileCount = a.files?.length ?? 0;

              return (
                <tr
                  key={a.id}
                  className="hover:bg-[#F5F1E8]/30 transition-colors group"
                >
                  <td className={tdCls}>
                    {userName ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#1B5E4F]/10 flex items-center justify-center shrink-0">
                          <User size={11} className="text-[#1B5E4F]" />
                        </div>
                        <span className="text-xs truncate">{userName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeCfg.bg} ${typeCfg.text}`}
                    >
                      <TypeIcon size={11} /> {typeCfg.label}
                    </span>
                  </td>
                  <td className={tdCls + " max-w-[220px]"}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {a.subject}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                          <AlertTriangle size={8} /> متأخر
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {a.description}
                      </p>
                    )}
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar size={12} className="text-[#B8976B]" />
                      <span className="text-xs">
                        {new Date(a.activityDate).toLocaleString("ar-SA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className={tdCls}>
                    {leadTitle ? (
                      <div className="flex items-center gap-1.5">
                        <Target size={12} className="text-[#B8976B] shrink-0" />
                        <span className="text-xs truncate">{leadTitle}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  <td className={tdCls}>
                    {fileCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F5F1E8] text-[#B8976B]">
                        <Paperclip size={11} /> {fileCount}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className={tdCls}>
                    {a.activityResult ? (
                      <ResultBadge result={a.activityResult} />
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className={tdCls + " text-center"}>
                    <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onView(a)}
                        title="عرض"
                        className="p-1.5 hover:bg-[#1B5E4F]/10 rounded-lg transition-colors text-[#1B5E4F]"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => onEdit(a)}
                        title="تعديل"
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(a)}
                        title="حذف"
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t border-[#B8976B]/10 bg-[#F5F1E8]/30"
          dir="rtl"
        >
          <p className="text-xs text-gray-400">
            صفحة {page} من {totalPages} — إجمالي
            <span className="font-bold text-[#1B5E4F]">
              {activities.length}
            </span>
            نشاط
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white border border-[#B8976B]/20 disabled:opacity-40"
            >
              <ChevronRight size={15} className="text-[#1B5E4F]" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1 text-gray-400 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border ${
                      page === p
                        ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                        : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]/40"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-white border border-[#B8976B]/20 disabled:opacity-40"
            >
              <ChevronLeft size={15} className="text-[#1B5E4F]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ActivitiesPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ─── Admin-authenticated users fetch ─────────────────────────────────────────
  const fetchAllUsersAsAdmin = async (): Promise<SystemUser[]> => {
    // Step 1: login as admin
    const loginRes = await fetch(`${API_BASE}/Api/V1/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: import.meta.env.VITE_ADMIN_EMAIL,
        password: import.meta.env.VITE_ADMIN_PASSWORD,
      }),
    });
    if (!loginRes.ok) throw new Error("Admin login failed");
    const loginData = await loginRes.json();
    const adminToken =
      loginData.accessToken ??
      loginData.token ??
      loginData.data?.accessToken ??
      loginData.data?.token;

    // Step 2: fetch all users with admin token
    const usersRes = await fetch(
      `${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    if (!usersRes.ok) throw new Error("Failed to fetch users");
    const data = await usersRes.json();
    return Array.isArray(data) ? data : (data.data ?? data.items ?? []);
  };
  const { data: allUsersRaw = [] } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchAllUsersAsAdmin,
    staleTime: 60_000,
  });

  const systemUsers: SystemUser[] = allUsersRaw;
  const isAdmin = user?.roles.includes("Admin");

  const assignableUsers: SystemUser[] = isAdmin
    ? systemUsers
    : systemUsers.filter(
        (u) => u.nid === "Designer" || u.id === (user as any)?.id,
      );
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "view" | null>(
    null,
  );
  const [selected, setSelected] = useState<Activity | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: raw,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchActivities,
    staleTime: 30_000,
  });

  const { data: customersRaw } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: fetchCustomers,
    staleTime: 60_000,
  });
  const { data: leadsRaw } = useQuery({
    queryKey: LEADS_KEY,
    queryFn: fetchLeads,
    staleTime: 60_000,
  });

  const { data: _usersRaw } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    staleTime: 60_000,
  });
  const activities: Activity[] = norm(raw);
  const customers: Customer[] = norm(customersRaw);
  const leads: Lead[] = norm(leadsRaw);

  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const userMap = new Map(systemUsers.map((u) => [u.id, u]));

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      closeModal();
    },
    onError: (e: any) => setFormError(e.message),
  });
  const editMutation = useMutation({
    mutationFn: apiUpdate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      closeModal();
    },
    onError: (e: any) => setFormError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      closeModal();
    },
    onError: (e: any) => setFormError(e.message),
  });

  /** Convert an existing Activity → form data.
   *  Server files go into existingFiles (read-only); newFiles starts empty. */
  const toFormData = (a: Activity): ActivityFormData => ({
    type: a.type,
    subject: a.subject,
    description: a.description ?? "",
    activityDate: a.activityDate,
    status: a.status,
    activityResult: (a.activityResult as ActivityResult) ?? "accept",
    customerId: a.customerId ?? "",
    leadId: a.leadId ?? "",
    assignedToUserId: a.assignedToUserId ?? "",
    existingFiles: a.files ?? [],
    newFiles: [],
  });

  const handleSave = (data: ActivityFormData) => {
    setFormError(null);
    const saveData = {
      ...data,
      keptFileIds: data.existingFiles.map((f) => f.id),
    };
    if (modal === "add") addMutation.mutate(saveData);
    else if (modal === "edit" && selected)
      editMutation.mutate({ id: selected.id, data: saveData });
  };
  const isSaving = addMutation.isPending || editMutation.isPending;

  const plannedCount = activities.filter((a) => a.status === "Planned").length;
  const completedCount = activities.filter(
    (a) => a.status === "Completed",
  ).length;
  const overdueCount = activities.filter(
    (a) => a.status === "Cancelled",
  ).length;
  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
              التقارير
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              مرحباً{user?.name ? ` ${user.name}` : ""}، إجمالي الأنشطة:
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
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={18} /> إضافة نشاط
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "متابعة",
              count: plannedCount,
              cls: "from-blue-50 to-blue-100/50 border-blue-200/60",
              num: "text-blue-700",
              lbl: "text-blue-600",
              Icon: Clock,
            },
            {
              label: "طلب جديد",
              count: completedCount,
              cls: "from-emerald-50 to-emerald-100/50 border-emerald-200/60",
              num: "text-emerald-700",
              lbl: "text-emerald-600",
              Icon: CheckCircle,
            },
            {
              label: "استكمال طلب",
              count: overdueCount,
              cls: "from-orange-50 to-orange-100/50 border-orange-200/60",
              num: "text-orange-700",
              lbl: "text-orange-600",
              Icon: CircleCheck,
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

        {/* Search */}
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
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none text-sm text-[#1B5E4F]"
              />
            </div>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${showFilters ? "bg-[#1B5E4F] text-white border-[#1B5E4F]" : "bg-white text-[#1B5E4F] border-[#B8976B]/20 hover:border-[#1B5E4F]"}`}
            >
              <Filter size={16} /> تصفية
            </button>
          </div>
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

        {/* Table */}
        {!isLoading &&
          !isError &&
          (displayed.length > 0 ? (
            <ActivitiesTable
              activities={displayed}
              leadMap={leadMap}
              userMap={userMap}
              onEdit={(a) => {
                setSelected(a);
                setFormError(null);
                setModal("edit");
              }}
              onDelete={(a) => {
                setSelected(a);
                setModal("delete");
              }}
              onView={(a) => {
                setSelected(a);
                setModal("view");
              }}
            />
          ) : (
            <div className="text-center py-24 bg-white rounded-2xl border border-[#B8976B]/15">
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

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <ActivityModal
          mode={modal}
          initial={
            modal === "edit" && selected ? toFormData(selected) : EMPTY_FORM
          }
          saving={isSaving}
          error={formError}
          customers={customers}
          leads={leads}
          systemUsers={assignableUsers}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Delete Modal */}
      {modal === "delete" && selected && (
        <DeleteModal
          subject={selected.subject}
          deleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          onClose={closeModal}
        />
      )}

      {/* View Modal */}
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
            <div
              className={`bg-gradient-to-br ${TYPE_CFG[selected.type].card} p-6 relative shrink-0`}
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
                    {selected.activityResult && (
                      <ResultBadge result={selected.activityResult} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  {
                    label: "تاريخ النشاط",
                    value: new Date(selected.activityDate).toLocaleString(
                      "ar-SA",
                      {
                        dateStyle: "full",
                        timeStyle: "short",
                      },
                    ),
                    full: true,
                  },
                  {
                    label: "الجمعيات",
                    value: selected.leadId
                      ? (leadMap.get(selected.leadId)?.company ?? "—")
                      : "—",
                    full: true,
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

              <FilesSection existingFiles={selected.files} isViewMode={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
