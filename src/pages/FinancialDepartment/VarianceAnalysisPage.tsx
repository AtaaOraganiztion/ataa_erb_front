import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Building2,
  BarChart3,
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
  status: "Draft" | "Submitted" | "Approved" | "Active" | "Exceeded";
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

// ─── Variance computation ─────────────────────────────────────────────────────

type VarianceType = "favorable" | "adverse" | "neutral";

const computeVariance = (estimated: number, actual: number) => {
  const diff = estimated - actual;
  const pct = estimated > 0 ? (diff / estimated) * 100 : 0;
  const type: VarianceType =
    Math.abs(pct) < 2 ? "neutral" : diff > 0 ? "favorable" : "adverse";
  return { diff, pct, type };
};

const VARIANCE_CONFIG = {
  favorable: {
    label: "تحت الميزانية",
    color: "#059669",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    Icon: TrendingDown,
  },
  adverse: {
    label: "فوق الميزانية",
    color: "#dc2626",
    bg: "bg-red-50",
    border: "border-red-200",
    Icon: TrendingUp,
  },
  neutral: {
    label: "متوازن",
    color: "#2563eb",
    bg: "bg-blue-50",
    border: "border-blue-200",
    Icon: Minus,
  },
};

// ─── Variance Row ─────────────────────────────────────────────────────────────

const VarianceRow = ({ budget }: { budget: Budget }) => {
  const estimVsSpent = computeVariance(
    budget.estimatedBudget,
    budget.spentAmount,
  );
  const totalVsSpent = computeVariance(budget.totalBudget, budget.spentAmount);
  const estimVsTotal = computeVariance(
    budget.estimatedBudget,
    budget.totalBudget,
  );
  const cfg = VARIANCE_CONFIG[estimVsSpent.type];
  const Icon = cfg.Icon;
  const maxVal = Math.max(
    budget.estimatedBudget,
    budget.totalBudget,
    budget.spentAmount,
    1,
  );

  return (
    <div
      className={`bg-white rounded-2xl border-2 ${cfg.border} p-6 hover:shadow-md transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center shrink-0">
            <Building2 className="text-white" size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#1B5E4F] truncate">
              {budget.sectorName}
            </h3>
            <p className="text-xs text-gray-400">السنة المالية {budget.year}</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${cfg.bg} shrink-0`}
        >
          <Icon size={14} style={{ color: cfg.color }} />
          <span className="text-xs font-bold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {[
          {
            label: "التقديري",
            value: budget.estimatedBudget,
            color: "#B8976B",
          },
          { label: "الإجمالي", value: budget.totalBudget, color: "#1B5E4F" },
          {
            label: "الفعلي",
            value: budget.spentAmount,
            color: estimVsSpent.type === "adverse" ? "#dc2626" : "#059669",
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-600">{label}</span>
              <span className="font-bold text-[#1B5E4F]">
                {value?.toLocaleString("ar-SA")} ريال
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((value / maxVal) * 100, 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B8976B] mb-2">
          تحليل الانحراف
        </h4>
        {[
          { label: "انحراف التقديري/الفعلي", ...estimVsSpent },
          { label: "انحراف الإجمالي/الفعلي", ...totalVsSpent },
          { label: "انحراف التخطيط", ...estimVsTotal },
        ].map(({ label, diff, pct, type }) => {
          const c =
            type === "favorable"
              ? "#059669"
              : type === "adverse"
                ? "#dc2626"
                : "#2563eb";
          const sign = diff > 0 ? "+" : "";
          return (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
            >
              <span className="text-xs text-gray-500">{label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: c }}>
                  {sign}
                  {diff?.toLocaleString("ar-SA")} ريال
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ color: c, backgroundColor: `${c}15` }}
                >
                  {sign}
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Aggregate summary ────────────────────────────────────────────────────────

const AggregateSummary = ({ budgets }: { budgets: Budget[] }) => {
  const totEst = budgets.reduce((s, b) => s + (b.estimatedBudget ?? 0), 0);
  const totTotal = budgets.reduce((s, b) => s + (b.totalBudget ?? 0), 0);
  const totSpent = budgets.reduce((s, b) => s + (b.spentAmount ?? 0), 0);
  const variance = totEst - totSpent;
  const varPct = totEst > 0 ? (variance / totEst) * 100 : 0;
  const isFav = variance >= 0;

  return (
    <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/60 text-sm font-semibold">إجمالي الانحراف</p>
          <p
            className={`text-3xl font-bold mt-0.5 ${isFav ? "text-emerald-300" : "text-red-300"}`}
          >
            {isFav ? "+" : ""}
            {variance.toLocaleString("ar-SA")}{" "}
            <span className="text-lg font-normal text-white/60">ريال</span>
          </p>
          <p
            className={`text-sm font-semibold mt-0.5 ${isFav ? "text-emerald-300" : "text-red-300"}`}
          >
            {isFav ? "▼ تحت الميزانية" : "▲ فوق الميزانية"}{" "}
            {Math.abs(varPct).toFixed(1)}%
          </p>
        </div>
        <BarChart3 className="text-white/30" size={48} />
      </div>
      <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-white/10">
        {[
          { label: "إجمالي التقديري", value: totEst },
          { label: "إجمالي الفعلي", value: totSpent },
          { label: "إجمالي الميزانية", value: totTotal },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-0.5">
              {label}
            </p>
            <p className="text-base font-bold">
              {value.toLocaleString("ar-SA")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const VarianceAnalysisPage = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "" | "favorable" | "adverse" | "neutral"
  >("");
  const [filterYear, setFilterYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"variance" | "pct" | "sector">(
    "variance",
  );

  const serverParams: Record<string, string> = {};
  if (filterYear) serverParams.Year = filterYear;

  const {
    data: rawBudgets,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["budgets", "variance", serverParams],
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

  if (filterType) {
    displayed = displayed.filter(
      (b) =>
        computeVariance(b.estimatedBudget, b.spentAmount).type === filterType,
    );
  }

  displayed = [...displayed].sort((a, b) => {
    if (sortBy === "sector")
      return (a.sectorName ?? "").localeCompare(b.sectorName ?? "");
    const va = computeVariance(a.estimatedBudget, a.spentAmount);
    const vb = computeVariance(b.estimatedBudget, b.spentAmount);
    return sortBy === "pct"
      ? Math.abs(vb.pct) - Math.abs(va.pct)
      : Math.abs(vb.diff) - Math.abs(va.diff);
  });

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
            تحليل الانحرافات
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            مقارنة الميزانيات التقديرية بالأرقام الفعلية وتحديد الانحرافات
          </p>
        </div>

        {!isLoading && !isError && budgets.length > 0 && (
          <AggregateSummary budgets={budgets} />
        )}

        {!isLoading && !isError && (
          <div className="flex items-center gap-6 px-1 text-xs text-gray-500 flex-wrap">
            {Object.entries(VARIANCE_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>
        )}

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
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  نوع الانحراف
                </label>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="">الكل</option>
                    <option value="favorable">تحت الميزانية</option>
                    <option value="adverse">فوق الميزانية</option>
                    <option value="neutral">متوازن</option>
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
              <div>
                <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                  ترتيب حسب
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full appearance-none px-4 py-2.5 border-2 border-[#B8976B]/20 rounded-xl focus:border-[#1B5E4F] outline-none text-sm text-[#1B5E4F]"
                  >
                    <option value="variance">قيمة الانحراف</option>
                    <option value="pct">نسبة الانحراف</option>
                    <option value="sector">القطاع</option>
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
              جاري تحميل بيانات الانحرافات...
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayed.map((b) => (
                <VarianceRow key={b.id} budget={b} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <BarChart3 className="text-[#B8976B]" size={32} />
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

export default VarianceAnalysisPage;
