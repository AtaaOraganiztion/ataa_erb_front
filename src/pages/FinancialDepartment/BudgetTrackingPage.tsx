import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Building2,
  Calendar,
} from "lucide-react";

interface Budget {
  id: string;
  sectorId: string;
  sectorName?: string;
  year: number;
  estimatedBudget: number;
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  budgetLimit: number;
  status: "Draft" | "Submitted" | "Approved" | "Active" | "Exceeded";
  isConfirmed: boolean;
  confirmedDate?: string;
  notes?: string;
}

interface Sector {
  id: string;
  name: string;
}

const API_BASE = import.meta.env.VITE_API_URL;
const BUDGET_STATUS_STR: Record<number, string> = {
  0: "Draft",
  1: "Submitted",
  2: "Approved",
  3: "Active",
  4: "Exceeded",
};

const authFetch = async (url: string) => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const fetchBudgets = (params: Record<string, string>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== ""),
  ).toString();
  return authFetch(`${API_BASE}/Api/V1/Budget/Get-All${qs ? `?${qs}` : ""}`);
};
const fetchSectors = () => authFetch(`${API_BASE}/Api/V1/Sector/Get-All`);

const normSectors = (raw: unknown): Sector[] =>
  Array.isArray(raw) ? raw : ((raw as any)?.data ?? (raw as any)?.items ?? []);

const normalize = (raw: unknown, sectors: Sector[]): Budget[] => {
  const arr: any[] = Array.isArray(raw)
    ? raw
    : ((raw as any)?.data ?? (raw as any)?.items ?? []);
  return arr.map((b, i) => ({
    ...b,
    id: b.id ?? b.budgetId ?? `fallback-${i}`,
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

// ─── Health indicator ─────────────────────────────────────────────────────────

const getHealth = (pct: number) => {
  if (pct >= 100)
    return {
      label: "تجاوز",
      color: "#ef4444",
      bg: "bg-red-50",
      icon: AlertCircle,
      border: "border-red-200",
    };
  if (pct >= 80)
    return {
      label: "تحذير",
      color: "#d97706",
      bg: "bg-amber-50",
      icon: AlertTriangle,
      border: "border-amber-200",
    };
  if (pct >= 50)
    return {
      label: "مقبول",
      color: "#2563eb",
      bg: "bg-blue-50",
      icon: Clock,
      border: "border-blue-200",
    };
  return {
    label: "ممتاز",
    color: "#059669",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
    border: "border-emerald-200",
  };
};

// ─── Tracking Card ────────────────────────────────────────────────────────────

const TrackingCard = ({ budget }: { budget: Budget }) => {
  const spentPct =
    budget.totalBudget > 0
      ? Math.min((budget.spentAmount / budget.totalBudget) * 100, 100)
      : 0;
  const remainPct =
    budget.totalBudget > 0
      ? Math.max(
          ((budget.totalBudget - budget.spentAmount) / budget.totalBudget) *
            100,
          0,
        )
      : 0;
  const health = getHealth(
    budget.totalBudget > 0
      ? (budget.spentAmount / budget.totalBudget) * 100
      : 0,
  );
  const HealthIcon = health.icon;

  return (
    <div
      className={`bg-white rounded-2xl border-2 ${health.border} overflow-hidden hover:shadow-lg transition-all duration-300`}
    >
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(to right, ${health.color}40, ${health.color})`,
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center shrink-0">
              <Building2 className="text-white" size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#1B5E4F] truncate text-sm">
                {budget.sectorName}
              </h3>
              <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                <Calendar size={10} />
                <span>{budget.year}</span>
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${health.bg} shrink-0`}
          >
            <HealthIcon size={12} style={{ color: health.color }} />
            <span className="text-xs font-bold" style={{ color: health.color }}>
              {health.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={health.color}
                strokeWidth="3"
                strokeDasharray={`${spentPct} ${100 - spentPct}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xs font-bold"
                style={{ color: health.color }}
              >
                {spentPct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">إجمالي الميزانية</span>
              <span className="font-bold text-[#1B5E4F]">
                {budget.totalBudget?.toLocaleString("ar-SA")}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">المنفق</span>
              <span className="font-bold" style={{ color: health.color }}>
                {budget.spentAmount?.toLocaleString("ar-SA")}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">المتبقي</span>
              <span className="font-bold text-emerald-600">
                {Math.max(
                  0,
                  budget.totalBudget - budget.spentAmount,
                ).toLocaleString("ar-SA")}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full h-6 bg-gray-100 rounded-xl overflow-hidden flex">
            <div
              className="h-full flex items-center justify-center text-[10px] font-bold text-white rounded-xl transition-all duration-700"
              style={{
                width: `${spentPct}%`,
                background: health.color,
                minWidth: spentPct > 5 ? undefined : "0px",
              }}
            >
              {spentPct > 15 ? "منفق" : ""}
            </div>
            <div
              className="h-full flex items-center justify-center text-[10px] font-bold text-emerald-700 transition-all duration-700"
              style={{ width: `${remainPct}%` }}
            >
              {remainPct > 20 ? "متبقي" : ""}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{spentPct.toFixed(1)}% منفق</span>
            <span>{remainPct.toFixed(1)}% متبقي</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={13} className="text-[#B8976B]" />
            <div>
              <p className="text-[10px] text-gray-400">المخصص</p>
              <p className="text-xs font-bold text-[#1B5E4F]">
                {budget.allocatedAmount?.toLocaleString("ar-SA")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={13} className="text-[#B8976B]" />
            <div>
              <p className="text-[10px] text-gray-400">حد الميزانية</p>
              <p className="text-xs font-bold text-[#1B5E4F]">
                {budget.budgetLimit?.toLocaleString("ar-SA")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Status Summary ───────────────────────────────────────────────────────────

const SummaryBar = ({ budgets }: { budgets: Budget[] }) => {
  const excellent = budgets.filter(
    (b) => b.totalBudget > 0 && b.spentAmount / b.totalBudget < 0.5,
  ).length;
  const warning = budgets.filter(
    (b) =>
      b.totalBudget > 0 &&
      b.spentAmount / b.totalBudget >= 0.5 &&
      b.spentAmount / b.totalBudget < 0.8,
  ).length;
  const critical = budgets.filter(
    (b) =>
      b.totalBudget > 0 &&
      b.spentAmount / b.totalBudget >= 0.8 &&
      b.spentAmount / b.totalBudget < 1,
  ).length;
  const exceeded = budgets.filter(
    (b) => b.totalBudget > 0 && b.spentAmount / b.totalBudget >= 1,
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        {
          label: "ممتاز",
          count: excellent,
          color: "from-emerald-600 to-emerald-500",
          icon: CheckCircle2,
        },
        {
          label: "مقبول",
          count: warning,
          color: "from-blue-600 to-blue-500",
          icon: Clock,
        },
        {
          label: "تحذير",
          count: critical,
          color: "from-amber-600 to-amber-500",
          icon: AlertTriangle,
        },
        {
          label: "تجاوز",
          count: exceeded,
          color: "from-red-600 to-red-500",
          icon: AlertCircle,
        },
      ].map(({ label, count, color, icon: Icon }) => (
        <div
          key={label}
          className={`bg-gradient-to-l ${color} rounded-2xl p-4 text-white shadow-md`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/70 text-xs font-semibold">{label}</p>
            <Icon size={16} className="text-white/50" />
          </div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-white/50 text-xs">قطاع</p>
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const BudgetTrackingPage = () => {
  const [search, setSearch] = useState("");
  const [filterHealth, setFilterHealth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const serverParams: Record<string, string> = {};
  if (filterYear) serverParams.Year = filterYear;
  if (filterHealth === "exceeded") serverParams.Status = "Exceeded";

  const {
    data: rawBudgets,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["budgets", "tracking", serverParams],
    queryFn: () => fetchBudgets(serverParams),
    staleTime: 30_000,
  });

  const { data: rawSectors } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    staleTime: 60_000,
  });

  const sectors = normSectors(rawSectors);
  const budgets = normalize(rawBudgets, sectors);

  let displayed = search
    ? budgets.filter(
        (b) =>
          b.sectorName!.toLowerCase().includes(search.toLowerCase()) ||
          String(b.year).includes(search),
      )
    : budgets;

  if (filterHealth && filterHealth !== "exceeded") {
    displayed = displayed.filter((b) => {
      const pct = b.totalBudget > 0 ? (b.spentAmount / b.totalBudget) * 100 : 0;
      if (filterHealth === "excellent") return pct < 50;
      if (filterHealth === "warning") return pct >= 50 && pct < 80;
      if (filterHealth === "critical") return pct >= 80 && pct < 100;
      return true;
    });
  }

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
            متابعة الميزانيات
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            مراقبة حالة الإنفاق والميزانيات المتبقية لكل قطاع
          </p>
        </div>

        {!isLoading && !isError && <SummaryBar budgets={budgets} />}

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
                className="w-full pr-11 pl-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none transition-all text-sm text-[#1B5E4F]"
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
                  حالة الإنفاق
                </label>
                <div className="relative">
                  <select
                    value={filterHealth}
                    onChange={(e) => setFilterHealth(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    <option value="excellent">ممتاز (أقل من 50%)</option>
                    <option value="warning">مقبول (50% - 80%)</option>
                    <option value="critical">تحذير (80% - 100%)</option>
                    <option value="exceeded">تجاوز (أكثر من 100%)</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8976B] pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  السنة المالية
                </label>
                <div className="relative">
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">جميع السنوات</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
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

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm">
              جاري تحميل بيانات المتابعة...
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
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#1B5E4F] text-white rounded-xl text-sm font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          (displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayed.map((b) => (
                <TrackingCard key={b.id} budget={b} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <TrendingUp className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد بيانات
              </h3>
              <p className="text-gray-400 text-sm">
                لا توجد ميزانيات تطابق معايير البحث
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BudgetTrackingPage;
