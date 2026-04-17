import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Download,
  FileText,
  Image,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Paperclip,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  Mail,
  Users,
  CheckSquare,
  File,
  FileArchive,
  RefreshCw,
  Calendar,
  Palette,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  User,
  Shield,
  Send,
  FolderOpen,
  Layers,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// ─── Types & Constants ────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL;
const ACTIVITIES_KEY = ["activities"];
const USERS_KEY = ["system-users"];

interface ActivityFile {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeInBytes: number;
  uploadedAtUtc: string;
  downloadUrl?: string;
  _localFile?: File;
}

interface Activity {
  id: string;
  type: string;
  subject: string;
  description: string;
  activityDate: string;
  status: "Planned" | "Completed" | "Cancelled";
  assignedToUserId: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  files?: ActivityFile[];
}

interface User {
  id: string;
  name: string;
  email: string;
  nid: string;
  fullName?: string;
  roles?: string[];
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

type ModalType = "add" | "edit" | "delete" | "view" | null;

// ─── LocalStorage User Helper ─────────────────────────────────────────────────
const getLocalUser = (): Partial<User & { userId?: string; sub?: string }> => {
  try {
    const raw =
      localStorage.getItem("user") ??
      localStorage.getItem("currentUser") ??
      "{}";
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const isAdmin = (localUser: Partial<User>): boolean => {
  const roles = localUser?.roles ?? [];
  return roles.includes("Admin") || roles.includes("admin");
};

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
const authFetch = async (
  url: string,
  options: RequestInit = {},
): Promise<any> => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// ─── API Functions ────────────────────────────────────────────────────────────
const fetchActivities = (): Promise<any> =>
  authFetch(`${API_BASE}/Api/V1/Activity/Get-All`);

const fetchAllUsersAsAdmin = async (): Promise<User[]> => {
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

  const usersRes = await fetch(
    `${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  if (!usersRes.ok) throw new Error("Failed to fetch users");
  const data = await usersRes.json();
  return Array.isArray(data) ? data : (data.data ?? data.items ?? []);
};

interface FormDataInput {
  type: string;
  subject: string;
  description: string;
  activityDate: string;
  status: string;
  customerId?: string;
  leadId?: string;
  dealId?: string;
  assignedToUserId?: string;
  keptFileIds?: string[];
  newFiles?: ActivityFile[];
}

const buildFormData = (data: FormDataInput): FormData => {
  const fd = new FormData();
  fd.append("Type", data.type ?? "Task");
  fd.append("Subject", data.subject ?? "");
  fd.append("Description", data.description ?? "");
  fd.append("ActivityDate", data.activityDate ?? new Date().toISOString());
  fd.append("Status", data.status ?? "Planned");
  if (data.customerId) fd.append("CustomerId", data.customerId);
  if (data.leadId) fd.append("LeadId", data.leadId);
  if (data.dealId) fd.append("DealId", data.dealId);
  if (data.assignedToUserId)
    fd.append("AssignedToUserId", data.assignedToUserId);

  (data.keptFileIds ?? []).forEach((id) => fd.append("KeptFileIds", id));

  (data.newFiles ?? []).forEach((f) => {
    if (f._localFile) fd.append("Files", f._localFile, f.fileName);
  });

  return fd;
};

const apiAdd = async (data: FormDataInput): Promise<any> => {
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
  data: FormDataInput;
}): Promise<any> => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(`${API_BASE}/Api/V1/Activity/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: buildFormData(data),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
};

const apiDelete = (id: string): Promise<any> =>
  authFetch(`${API_BASE}/Api/V1/Activity/${id}`, { method: "DELETE" });

const norm = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);

// ─── File Helpers ─────────────────────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const fileIcon = (contentType = "") => {
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

const fileToActivityFile = (f: File): ActivityFile => ({
  id: generateULID(),
  fileName: f.name,
  contentType: f.type || "application/octet-stream",
  fileSizeInBytes: f.size,
  uploadedAtUtc: new Date().toISOString(),
  _localFile: f,
});

const downloadFile = async (file: ActivityFile): Promise<void> => {
  if (!file.downloadUrl) {
    alert("رابط التحميل غير متوفر");
    return;
  }
  try {
    const token = localStorage.getItem("accessToken") ?? "";
    const fileId = file.downloadUrl.split("/").pop() || file.id;
    const res = await fetch(`${API_BASE}/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`فشل التحميل: ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName || "file";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (e: unknown) {
    alert((e as Error).message);
  }
};

// ─── Config ───────────────────────────────────────────────────────────────────
type ActivityType = "Call" | "Email" | "Meeting" | "Note" | "Task";
type ActivityStatus = "Planned" | "Completed" | "Cancelled";

const TYPE_CFG: Record<
  ActivityType,
  {
    label: string;
    Icon: any;
    bg: string;
    text: string;
    card: string;
  }
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
    label: "مهمة تصميم",
    Icon: CheckSquare,
    bg: "bg-rose-100",
    text: "text-rose-600",
    card: "from-rose-500 to-rose-700",
  },
};

const STATUS_CFG: Record<
  ActivityStatus,
  {
    label: string;
    cls: string;
    dot: string;
  }
> = {
  Planned: {
    label: "قيد التنفيذ",
    cls: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
  },
  Completed: {
    label: "مكتمل",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  Cancelled: {
    label: "ملغي",
    cls: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-500",
  },
};

// ─── Shared UI Atoms ──────────────────────────────────────────────────────────
const TypeBadge = ({ type }: { type: string }) => {
  const c = TYPE_CFG[type as ActivityType] ?? TYPE_CFG.Task;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${c.bg} ${c.text}`}
    >
      <c.Icon size={10} /> {c.label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const c = STATUS_CFG[status as ActivityStatus] ?? STATUS_CFG.Planned;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {c.label}
    </span>
  );
};

// ─── Files Section ────────────────────────────────────────────────────────────
interface FilesSectionProps {
  existingFiles?: ActivityFile[];
  newFiles?: ActivityFile[];
  onExistingFilesChange?: (files: ActivityFile[]) => void;
  onNewFilesChange?: (files: ActivityFile[]) => void;
  isViewMode?: boolean;
}

const FilesSection = ({
  existingFiles = [],
  newFiles = [],
  onExistingFilesChange,
  onNewFilesChange,
  isViewMode = false,
}: FilesSectionProps) => {
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
    isExisting,
  }: {
    f: ActivityFile;
    removable: boolean;
    onRemove?: () => void;
    isExisting: boolean;
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
        {!isViewMode && isExisting && onExistingFilesChange && (
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

      {existingFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {!isViewMode && (
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Paperclip size={11} /> ملفات محفوظة على الخادم
            </p>
          )}
          {existingFiles.map((f) => (
            <FileRow key={f.id} f={f} isExisting={true} removable={false} />
          ))}
        </div>
      )}

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
                  isExisting={false}
                  removable={true}
                  onRemove={() => removeNewFile(f.id)}
                />
              ))}
            </div>
          )}

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
              اسحب الملفات هنا أو{" "}
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

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({
  message,
  type = "success",
  onDismiss,
}: {
  message: string;
  type?: "success" | "error";
  onDismiss: () => void;
}) => (
  <div
    className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${
      type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
    }`}
  >
    {type === "success" ? (
      <CheckCircle size={16} />
    ) : (
      <AlertTriangle size={16} />
    )}
    {message}
    <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
      <X size={14} />
    </button>
  </div>
);

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
const ConfirmModal = ({
  title,
  body,
  onConfirm,
  onClose,
  loading,
}: {
  title: string;
  body: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    dir="rtl"
  >
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="text-red-500" size={28} />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-6">{body}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
        >
          إلغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}{" "}
          حذف
        </button>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ─── TASK FORM MODAL (Admin: Create / Edit) ───────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
interface TaskFormData {
  type: string;
  subject: string;
  description: string;
  status: string;
  activityDate: string;
  assignedToUserId: string;
  customerId: string;
  leadId: string;
  dealId: string;
  existingFiles: ActivityFile[];
  newFiles: ActivityFile[];
}

const TaskFormModal = ({
  mode,
  initial,
  designers,
  saving,
  error,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial?: Partial<TaskFormData>;
  designers: User[];
  saving: boolean;
  error: string | null;
  onSave: (data: FormDataInput & { keptFileIds: string[] }) => void;
  onClose: () => void;
}) => {
  const EMPTY: TaskFormData = {
    type: "Task",
    subject: "",
    description: "",
    status: "Planned",
    activityDate: new Date().toISOString().slice(0, 16),
    assignedToUserId: "",
    customerId: "",
    leadId: "",
    dealId: "",
    existingFiles: [],
    newFiles: [],
  };

  const [form, setForm] = useState<TaskFormData>(
    (initial as TaskFormData) ?? EMPTY,
  );
  const set = (k: keyof TaskFormData, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const inp =
    "w-full px-4 py-2.5 border-2 border-[#B8976B]/30 rounded-xl bg-white focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/10 outline-none transition-all text-[#1B5E4F] placeholder:text-gray-300 text-sm";
  const lbl =
    "block text-[10px] font-bold text-[#1B5E4F]/60 mb-1.5 uppercase tracking-wider";

  const handleSave = () => {
    const keptFileIds = form.existingFiles.map((f) => f.id);
    onSave({ ...form, keptFileIds });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] px-8 py-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {mode === "add" ? "مهمة تصميم جديدة" : "تعديل المهمة"}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {mode === "add"
                ? "أضف مهمة وعيّنها لمصمم"
                : "تحديث بيانات المهمة"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="text-white" size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>عنوان المهمة *</label>
              <input
                className={inp}
                placeholder="وصف موجز للمهمة"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>الحالة</label>
              <select
                className={inp}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="Planned">قيد التنفيذ</option>
                <option value="Completed">مكتمل</option>
                <option value="Cancelled">ملغي</option>
              </select>
            </div>
            <div>
              <label className={lbl}>تاريخ التسليم *</label>
              <input
                type="datetime-local"
                dir="ltr"
                className={inp}
                value={form.activityDate?.slice(0, 16) ?? ""}
                onChange={(e) =>
                  set(
                    "activityDate",
                    e.target.value ? `${e.target.value}:00.000Z` : "",
                  )
                }
              />
            </div>
          </div>

          <div>
            <label className={lbl}>التعليمات والوصف</label>
            <textarea
              className={inp + " resize-none"}
              rows={4}
              placeholder="اكتب التعليمات التفصيلية للمصمم..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <label className={lbl}>تعيين المصمم * (مصممون فقط)</label>
            <select
              className={inp}
              value={form.assignedToUserId}
              onChange={(e) => set("assignedToUserId", e.target.value)}
            >
              <option value="">— اختر مصمماً —</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.email ? `— ${d.email}` : ""}
                </option>
              ))}
            </select>
            {designers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={11} /> لا يوجد مستخدمون بدور "Designer"
                حالياً
              </p>
            )}
          </div>

          <FilesSection
            existingFiles={form.existingFiles}
            newFiles={form.newFiles}
            onExistingFilesChange={(files: ActivityFile[]) =>
              setForm((f: TaskFormData) => ({ ...f, existingFiles: files }))
            }
            onNewFilesChange={(files: ActivityFile[]) =>
              setForm((f: TaskFormData) => ({ ...f, newFiles: files }))
            }
          />
        </div>

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
              className="px-5 py-2.5 rounded-xl border-2 border-[#B8976B]/30 text-[#1B5E4F] font-semibold text-sm hover:bg-[#F5F1E8]"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.subject || !form.assignedToUserId}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {mode === "add" ? "إرسال المهمة" : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Admin Task Card ──────────────────────────────────────────────────────────
const AdminTaskCard = ({
  activity,
  designer,
  onEdit,
  onDelete,
  onView,
}: {
  activity: Activity;
  designer?: User;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onView: (activity: Activity) => void;
}) => {
  const typeCfg = TYPE_CFG[activity.type as ActivityType] ?? TYPE_CFG.Task;
  const isOverdue =
    activity.status === "Planned" &&
    new Date(activity.activityDate) < new Date();
  const fileCount = activity.files?.length ?? 0;

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
        activity.status === "Completed"
          ? "border-emerald-200"
          : activity.status === "Cancelled"
            ? "border-red-200 opacity-70"
            : isOverdue
              ? "border-orange-200"
              : "border-[#B8976B]/20"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${typeCfg.bg} flex items-center justify-center shrink-0`}
          >
            <typeCfg.Icon size={18} className={typeCfg.text} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-[#1B5E4F] truncate">
                {activity.subject}
              </h3>
              <StatusBadge status={activity.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                  <AlertTriangle size={7} /> متأخر
                </span>
              )}
            </div>

            {activity.description && (
              <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                {activity.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar size={10} className="text-[#B8976B]" />
                {new Date(activity.activityDate).toLocaleDateString("ar-SA", {
                  dateStyle: "medium",
                })}
              </span>
              {designer && (
                <span className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-[#1B5E4F]/10 flex items-center justify-center">
                    <User size={9} className="text-[#1B5E4F]" />
                  </div>
                  {designer.name}
                </span>
              )}
              {fileCount > 0 && (
                <span className="flex items-center gap-1 text-[#B8976B]">
                  <Paperclip size={10} /> {fileCount} ملف
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onView(activity)}
              className="p-1.5 hover:bg-[#1B5E4F]/10 rounded-lg transition-colors text-[#1B5E4F]"
              title="عرض"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={() => onEdit(activity)}
              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
              title="تعديل"
            >
              <Edit size={15} />
            </button>
            <button
              onClick={() => onDelete(activity)}
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-500"
              title="حذف"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── View Task Modal (Admin) ──────────────────────────────────────────────────
const ViewTaskModal = ({
  activity,
  designer,
  onClose,
}: {
  activity: Activity;
  designer?: User;
  onClose: () => void;
}) => {
  const typeCfg = TYPE_CFG[activity.type as ActivityType] ?? TYPE_CFG.Task;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className={`bg-gradient-to-l ${typeCfg.card} p-6 shrink-0`}>
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-1.5 hover:bg-white/10 rounded-lg"
          >
            <X className="text-white" size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <typeCfg.Icon className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {activity.subject}
              </h2>
              <div className="flex gap-2 mt-1">
                <TypeBadge type={activity.type} />
                <StatusBadge status={activity.status} />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              {
                label: "تاريخ التسليم",
                value: new Date(activity.activityDate).toLocaleString("ar-SA", {
                  dateStyle: "full",
                  timeStyle: "short",
                }),
                full: true,
              },
              {
                label: "المصمم المعيَّن",
                value: designer?.name ?? "—",
                full: false,
              },
              {
                label: "البريد الإلكتروني",
                value: designer?.email ?? "—",
                full: false,
              },
            ].map(({ label, value, full }) => (
              <div key={label} className={full ? "col-span-2" : ""}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-0.5">
                  {label}
                </p>
                <p className="font-semibold text-[#1B5E4F] text-sm">{value}</p>
              </div>
            ))}

            {activity.description && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8976B] mb-1">
                  التعليمات
                </p>
                <p className="text-sm text-gray-600 bg-[#F5F1E8]/60 rounded-xl p-3 border border-[#B8976B]/15 leading-relaxed">
                  {activity.description}
                </p>
              </div>
            )}
          </div>

          <FilesSection
            existingFiles={activity.files ?? []}
            isViewMode={true}
          />
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const AdminView = () => {
  const qc = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDesigner, setFilterDesigner] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const {
    data: rawActs,
    isLoading: actsLoading,
    isError: actsErr,
  } = useQuery({
    queryKey: ACTIVITIES_KEY,
    queryFn: fetchActivities,
    staleTime: 30_000,
  });

  const { data: allUsersRaw = [], isLoading: usersLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchAllUsersAsAdmin,
    staleTime: 60_000,
  });

  const allActivities = norm(rawActs);
  const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : norm(allUsersRaw);

  const designers = useMemo(
    () => allUsers.filter((u: User) => u.nid === "Designer"),
    [allUsers],
  );

  const designerIds = useMemo(
    () => new Set(designers.map((d: User) => d.id)),
    [designers],
  );
  const userMap = useMemo(
    () => new Map(allUsers.map((u: User) => [u.id, u])),
    [allUsers],
  );

  const designerActivities = useMemo(
    () =>
      allActivities.filter(
        (a: Activity) =>
          a.assignedToUserId && designerIds.has(a.assignedToUserId),
      ),
    [allActivities, designerIds],
  );

  const displayed = useMemo(() => {
    let list = designerActivities;
    if (search)
      list = list.filter(
        (a: Activity) =>
          a.subject?.toLowerCase().includes(search.toLowerCase()) ||
          a.description?.toLowerCase().includes(search.toLowerCase()),
      );
    if (filterDesigner)
      list = list.filter(
        (a: Activity) => a.assignedToUserId === filterDesigner,
      );
    if (filterStatus)
      list = list.filter((a: Activity) => a.status === filterStatus);
    return list;
  }, [designerActivities, search, filterDesigner, filterStatus]);

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addMut = useMutation({
    mutationFn: apiAdd,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITIES_KEY });
      closeModal();
      showToast("تمت إضافة المهمة بنجاح");
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const editMut = useMutation({
    mutationFn: apiUpdate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITIES_KEY });
      closeModal();
      showToast("تم تحديث المهمة");
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const delMut = useMutation({
    mutationFn: apiDelete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTIVITIES_KEY });
      closeModal();
      showToast("تم حذف المهمة");
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setFormErr(null);
  };

  const handleSave = (data: FormDataInput & { keptFileIds: string[] }) => {
    setFormErr(null);
    if (modal === "add") addMut.mutate(data);
    else if (modal === "edit" && selected)
      editMut.mutate({ id: selected.id, data });
  };

  const toForm = (a: Activity): TaskFormData => ({
    type: a.type,
    subject: a.subject,
    description: a.description ?? "",
    activityDate: a.activityDate?.slice(0, 16) ?? "",
    status: a.status,
    assignedToUserId: a.assignedToUserId ?? "",
    customerId: a.customerId ?? "",
    leadId: a.leadId ?? "",
    dealId: a.dealId ?? "",
    existingFiles: a.files ?? [],
    newFiles: [],
  });

  const planned = designerActivities.filter(
    (a: Activity) => a.status === "Planned",
  ).length;
  const completed = designerActivities.filter(
    (a: Activity) => a.status === "Completed",
  ).length;
  const overdue = designerActivities.filter(
    (a: Activity) =>
      a.status === "Planned" && new Date(a.activityDate) < new Date(),
  ).length;

  return (
    <div className="min-h-screen" dir="rtl">
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center shadow-md">
                <Shield size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
                إدارة مهام التصميم
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              لوحة تحكم المدير · {designerActivities.length} مهمة ·{" "}
              {designers.length} مصمم نشط
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ACTIVITIES_KEY })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#B8976B]/20 text-[#1B5E4F] text-sm font-semibold hover:bg-[#F5F1E8] transition-all"
            >
              <RefreshCw size={14} /> تحديث
            </button>
            <button
              onClick={() => {
                setSelected(null);
                setFormErr(null);
                setModal("add");
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Plus size={16} /> مهمة جديدة
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "قيد التنفيذ",
              value: planned,
              Icon: Clock,
              color:
                "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
            },
            {
              label: "مكتملة",
              value: completed,
              Icon: CheckCircle,
              color:
                "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
            },
            {
              label: "متأخرة",
              value: overdue,
              Icon: AlertTriangle,
              color:
                "from-orange-50 to-orange-100/50 border-orange-200/60 text-orange-700",
            },
            {
              label: "المصممون",
              value: designers.length,
              Icon: Palette,
              color:
                "from-[#F5F1E8] to-[#EDE8DC]/50 border-[#B8976B]/30 text-[#1B5E4F]",
            },
          ].map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${color} border rounded-2xl p-4`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={15} />
                <p className="text-xs font-semibold">{label}</p>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-5">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8976B]"
                size={15}
              />
              <input
                type="text"
                placeholder="بحث في المهام..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pr-9 pl-3 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
              />
            </div>
            <select
              value={filterDesigner}
              onChange={(e) => {
                setFilterDesigner(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl text-sm text-[#1B5E4F] focus:border-[#1B5E4F] outline-none bg-white"
            >
              <option value="">كل المصممين</option>
              {designers.map((d: User) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl text-sm text-[#1B5E4F] focus:border-[#1B5E4F] outline-none bg-white"
            >
              <option value="">كل الحالات</option>
              <option value="Planned">قيد التنفيذ</option>
              <option value="Completed">مكتملة</option>
              <option value="Cancelled">ملغاة</option>
            </select>
          </div>
        </div>

        {(actsLoading || usersLoading) && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={36} />
            <p className="text-gray-400 text-sm">جاري تحميل البيانات...</p>
          </div>
        )}
        {actsErr && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertTriangle className="text-red-400" size={28} />
            <p className="text-gray-500 text-sm">فشل تحميل البيانات</p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ACTIVITIES_KEY })}
              className="px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!actsLoading &&
          !actsErr &&
          (paged.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#B8976B]/15">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <Layers className="text-[#B8976B]" size={28} />
              </div>
              <h3 className="text-lg font-bold text-[#1B5E4F] mb-1">
                لا توجد مهام
              </h3>
              <p className="text-gray-400 text-sm">
                {designerActivities.length === 0
                  ? "لم يتم إنشاء مهام للمصممين بعد"
                  : "لا توجد مهام بهذه الفلاتر"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paged.map((a: Activity) => (
                  <AdminTaskCard
                    key={a.id}
                    activity={a}
                    designer={userMap.get(a.assignedToUserId)}
                    onEdit={(act: Activity) => {
                      setSelected(act);
                      setFormErr(null);
                      setModal("edit");
                    }}
                    onDelete={(act: Activity) => {
                      setSelected(act);
                      setModal("delete");
                    }}
                    onView={(act: Activity) => {
                      setSelected(act);
                      setModal("view");
                    }}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between pt-2"
                  dir="rtl"
                >
                  <p className="text-xs text-gray-400">
                    صفحة {page} من {totalPages} —{" "}
                    <span className="font-bold text-[#1B5E4F]">
                      {displayed.length}
                    </span>{" "}
                    مهمة
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-[#B8976B]/20 hover:bg-white disabled:opacity-40"
                    >
                      <ChevronRight size={14} className="text-[#1B5E4F]" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-[#B8976B]/20 hover:bg-white disabled:opacity-40"
                    >
                      <ChevronLeft size={14} className="text-[#1B5E4F]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {(modal === "add" || modal === "edit") && (
        <TaskFormModal
          mode={modal}
          initial={modal === "edit" && selected ? toForm(selected) : undefined}
          designers={designers}
          saving={addMut.isPending || editMut.isPending}
          error={formErr}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {modal === "view" && selected && (
        <ViewTaskModal
          activity={selected}
          designer={userMap.get(selected.assignedToUserId)}
          onClose={closeModal}
        />
      )}
      {modal === "delete" && selected && (
        <ConfirmModal
          title="تأكيد الحذف"
          body={
            <>
              هل أنت متأكد من حذف مهمة{" "}
              <strong className="text-red-600">{selected.subject}</strong>؟
            </>
          }
          loading={delMut.isPending}
          onConfirm={() => delMut.mutate(selected.id)}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ─── DESIGNER VIEW ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const DesignerTaskCard = ({
  activity,
  uploadingId,
  onUpload,
}: {
  activity: Activity;
  uploadingId: string | null;
  onUpload: (activity: Activity, files: File[]) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localSuccess, setLocalSuccess] = useState<string[]>([]);

  const typeCfg = TYPE_CFG[activity.type as ActivityType] ?? TYPE_CFG.Task;
  const isOverdue =
    activity.status === "Planned" &&
    new Date(activity.activityDate) < new Date();
  const isUploading = uploadingId === activity.id;
  const fileCount = activity.files?.length ?? 0;

  const daysLeft = Math.ceil(
    (new Date(activity.activityDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  const handleFiles = (files: File[]) => {
    onUpload(activity, files);
    files.forEach((f) => {
      setLocalSuccess((p) => [...p, f.name]);
      setTimeout(
        () => setLocalSuccess((p) => p.filter((n) => n !== f.name)),
        4000,
      );
    });
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
        activity.status === "Completed"
          ? "border-emerald-200"
          : activity.status === "Cancelled"
            ? "border-red-200 opacity-75"
            : isOverdue
              ? "border-orange-300"
              : "border-[#B8976B]/20"
      } ${expanded ? "shadow-md" : "hover:shadow-md"}`}
    >
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-[#F5F1E8]/20 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={`w-11 h-11 rounded-xl ${typeCfg.bg} flex items-center justify-center shrink-0 mt-0.5`}
        >
          <typeCfg.Icon size={20} className={typeCfg.text} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-[#1B5E4F]">
              {activity.subject}
            </h3>
            <StatusBadge status={activity.status} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                <AlertTriangle size={8} /> متأخر
              </span>
            )}
          </div>

          {activity.description && (
            <p className="text-xs text-gray-400 line-clamp-1 mb-2">
              {activity.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar size={10} className="text-[#B8976B]" />
              {new Date(activity.activityDate).toLocaleString("ar-SA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {daysLeft > 0 && activity.status === "Planned" && (
              <span
                className={`flex items-center gap-1 text-[10px] font-semibold ${
                  daysLeft <= 3
                    ? "text-red-500"
                    : daysLeft <= 7
                      ? "text-amber-500"
                      : "text-gray-400"
                }`}
              >
                <Clock size={10} /> {daysLeft} يوم متبقي
              </span>
            )}
            {fileCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-[#B8976B]">
                <Paperclip size={10} /> {fileCount} ملف
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 mt-1">
          {isUploading && (
            <Loader2 size={16} className="text-blue-500 animate-spin" />
          )}
          {expanded ? (
            <ChevronUp size={18} className="text-gray-400" />
          ) : (
            <ChevronDown size={18} className="text-gray-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#B8976B]/10 p-5 space-y-5">
          {activity.description && (
            <div>
              <p className="text-[10px] font-bold text-[#B8976B] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Info size={11} /> تعليمات المهمة
              </p>
              <p className="text-sm text-gray-600 leading-relaxed bg-[#F5F1E8]/50 rounded-xl p-4 border border-[#B8976B]/15">
                {activity.description}
              </p>
            </div>
          )}

          {activity.files && activity.files.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#B8976B] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <FolderOpen size={11} /> ملفات المرجعية من المدير
              </p>
              <FilesSection existingFiles={activity.files} isViewMode={true} />
            </div>
          )}

          {activity.status !== "Cancelled" && (
            <div>
              <p className="text-[10px] font-bold text-[#B8976B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Send size={11} /> رفع ملف التسليم
              </p>

              <DesignerDropZone uploading={isUploading} onFiles={handleFiles} />

              {localSuccess.length > 0 && (
                <div className="mt-2 space-y-1">
                  {localSuccess.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 text-xs text-emerald-600 font-semibold"
                    >
                      <CheckCircle size={13} /> تم رفع "{name}" بنجاح
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-2 text-center">
                يمكنك رفع ملف جديد في أي وقت لاستبدال التسليم السابق
              </p>
            </div>
          )}

          {activity.status === "Cancelled" && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              هذه المهمة ملغاة ولا يمكن رفع ملفات إليها
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DesignerDropZone = ({
  onFiles,
  uploading,
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      onFiles(Array.from(fileList));
    },
    [onFiles],
  );

  if (uploading)
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <Loader2 size={16} className="text-blue-600 animate-spin" />
        <p className="text-xs text-blue-600 font-medium">جاري الرفع...</p>
      </div>
    );

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all select-none ${
        drag
          ? "border-[#1B5E4F] bg-[#1B5E4F]/5 scale-[1.01]"
          : "border-[#B8976B]/40 hover:border-[#1B5E4F]/50 hover:bg-[#F5F1E8]/50"
      }`}
    >
      <input
        ref={ref}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
      <Upload
        size={18}
        className={`mx-auto mb-1.5 ${drag ? "text-[#1B5E4F]" : "text-[#B8976B]"}`}
      />
      <p className="text-xs font-semibold text-[#1B5E4F]">
        اسحب ملف التسليم هنا أو اضغط للاختيار
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">
        PDF · صور · Word · وغيرها
      </p>
    </div>
  );
};

const DesignerView = ({
  localUser,
}: {
  localUser: ReturnType<typeof getLocalUser>;
}) => {
  const qc = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const myId = localUser?.userId ?? localUser?.id ?? localUser?.sub ?? "";

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const {
    data: rawActs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ACTIVITIES_KEY,
    queryFn: fetchActivities,
    staleTime: 30_000,
  });

  const allActivities = norm(rawActs);

  const myActivities = useMemo(
    () => allActivities.filter((a: Activity) => a.assignedToUserId === myId),
    [allActivities, myId],
  );

  const displayed = useMemo(
    () =>
      filterStatus
        ? myActivities.filter((a: Activity) => a.status === filterStatus)
        : myActivities,
    [myActivities, filterStatus],
  );

  const uploadMut = useMutation<
    any,
    Error,
    { id: string; activity: Activity; newFiles: File[] }
  >({
    mutationFn: async ({ id, activity, newFiles }) => {
      const token = localStorage.getItem("accessToken") ?? "";
      const keptFileIds = (activity.files ?? []).map((f) => f.id);
      const fd = buildFormData({
        ...activity,
        keptFileIds,
        newFiles: newFiles.map(fileToActivityFile),
      });
      newFiles.forEach((f) => fd.append("Files", f, f.name));
      const res = await fetch(`${API_BASE}/Api/V1/Activity/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onMutate: ({ id }) => {
      setUploadingId(id);
      setUploadError(null);
    },
    onSuccess: (_, { newFiles }) => {
      qc.invalidateQueries({ queryKey: ACTIVITIES_KEY });
      setUploadingId(null);
      showToast(`تم رفع ${newFiles.length > 1 ? "الملفات" : "الملف"} بنجاح`);
    },
    onError: (e: Error) => {
      setUploadingId(null);
      setUploadError(e.message);
    },
  });
  const handleUpload = (activity: Activity, files: File[]) => {
    uploadMut.mutate({ id: activity.id, activity, newFiles: files });
  };

  const planned = myActivities.filter(
    (a: Activity) => a.status === "Planned",
  ).length;
  const completed = myActivities.filter(
    (a: Activity) => a.status === "Completed",
  ).length;
  const overdue = myActivities.filter(
    (a: Activity) =>
      a.status === "Planned" && new Date(a.activityDate) < new Date(),
  ).length;
  const totalFiles = myActivities.reduce(
    (s: number, a: Activity) => s + (a.files?.length ?? 0),
    0,
  );

  return (
    <div className="min-h-screen" dir="rtl">
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6 p-6">
        {uploadError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
            <AlertTriangle size={18} className="shrink-0" /> {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="mr-auto p-1 hover:bg-red-100 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-md">
                <Palette size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
                بوابة المصممين
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              مرحباً {localUser?.name ?? localUser?.fullName ?? ""}، لديك{" "}
              <span className="font-bold text-[#1B5E4F]">
                {myActivities.length}
              </span>{" "}
              مهمة معيَّنة إليك
            </p>
          </div>
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ACTIVITIES_KEY })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#B8976B]/20 text-[#1B5E4F] text-sm font-semibold hover:bg-[#F5F1E8] transition-all self-start"
          >
            <RefreshCw size={14} /> تحديث
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "قيد التنفيذ",
              value: planned,
              Icon: Clock,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "مكتملة",
              value: completed,
              Icon: CheckCircle,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "متأخرة",
              value: overdue,
              Icon: AlertTriangle,
              color: "text-orange-600 bg-orange-50",
            },
            {
              label: "ملفات مرفوعة",
              value: totalFiles,
              Icon: Paperclip,
              color: "text-[#1B5E4F] bg-[#1B5E4F]/10",
            },
          ].map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-[#B8976B]/15 p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}
              >
                <Icon size={16} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#1B5E4F]">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "الكل" },
            { value: "Planned", label: "قيد التنفيذ" },
            { value: "Completed", label: "مكتملة" },
            { value: "Cancelled", label: "ملغاة" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                filterStatus === value
                  ? "bg-[#1B5E4F] text-white border-[#1B5E4F]"
                  : "bg-white text-gray-500 border-[#B8976B]/20 hover:border-[#1B5E4F]/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700 text-sm">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5 text-sm">تعليمات</p>
            <p className="text-xs text-blue-500 leading-relaxed">
              اضغط على أي مهمة لعرض التفاصيل وتحميل ملفات المرجعية. يمكنك رفع
              ملف التسليم وتعديله في أي وقت.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={36} />
            <p className="text-gray-400 text-sm">جاري تحميل المهام...</p>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertTriangle className="text-red-400" size={28} />
            <p className="text-gray-500 text-sm">
              فشل تحميل البيانات: {(error as Error)?.message}
            </p>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ACTIVITIES_KEY })}
              className="px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-4">
            {displayed.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#B8976B]/15">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                  <Palette className="text-[#B8976B]" size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#1B5E4F] mb-1">
                  لا توجد مهام
                </h3>
                <p className="text-gray-400 text-sm">
                  {myActivities.length === 0
                    ? "لم يتم تعيين أي مهام إليك بعد"
                    : "لا توجد مهام بهذه الحالة"}
                </p>
              </div>
            ) : (
              displayed.map((activity: Activity) => (
                <DesignerTaskCard
                  key={activity.id}
                  activity={activity}
                  uploadingId={uploadingId}
                  onUpload={handleUpload}
                />
              ))
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 py-3 text-gray-300 text-xs">
          <RefreshCw size={11} />
          <span>يتم حفظ الملفات تلقائياً فور رفعها</span>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ─── ROOT EXPORT ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const DesignerPage = () => {
  const localUser = getLocalUser();
  const userIsAdmin = isAdmin(localUser);

  return userIsAdmin ? <AdminView /> : <DesignerView localUser={localUser} />;
};

export default DesignerPage;
