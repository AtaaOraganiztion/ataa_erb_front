import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  DollarSign,
  PieChart,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Building2,
  AlertCircle,
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

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const GradientBar = ({
  pct,
  color1,
  color2,
}: {
  pct: number;
  color1: string;
  color2: string;
}) => (
  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{
        width: `${Math.min(pct, 100)}%`,
        background: `linear-gradient(to left, ${color1}, ${color2})`,
      }}
    />
  </div>
);

// ─── Allocation Row ───────────────────────────────────────────────────────────

const AllocationRow = ({
  budget,
  maxTotal,
}: {
  budget: Budget;
  maxTotal: number;
}) => {
  const allocPct =
    budget.totalBudget > 0
      ? (budget.allocatedAmount / budget.totalBudget) * 100
      : 0;
  const spentPct =
    budget.totalBudget > 0
      ? (budget.spentAmount / budget.totalBudget) * 100
      : 0;
  const unallocated = Math.max(0, budget.totalBudget - budget.allocatedAmount);
  const overBudget = budget.spentAmount > budget.totalBudget;
  const widthPct = maxTotal > 0 ? (budget.totalBudget / maxTotal) * 100 : 100;

  return (
    <div className="bg-white rounded-2xl border border-[#B8976B]/15 p-6 hover:shadow-md transition-all duration-200">
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
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-[#1B5E4F]">
            {budget.totalBudget?.toLocaleString("ar-SA")}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            ريال – إجمالي
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide">
          <span>نسبة الحجم</span>
          <span>{widthPct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#B8976B]/40 transition-all duration-700"
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#1B5E4F]">المخصص</span>
            <span className="font-bold text-[#1B5E4F]">
              {allocPct.toFixed(1)}% •{" "}
              {budget.allocatedAmount?.toLocaleString("ar-SA")} ريال
            </span>
          </div>
          <GradientBar pct={allocPct} color1="#1B5E4F" color2="#2D8C73" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span
              className={`font-semibold ${overBudget ? "text-red-500" : "text-amber-600"}`}
            >
              المنفق
            </span>
            <span
              className={`font-bold ${overBudget ? "text-red-500" : "text-amber-600"}`}
            >
              {spentPct.toFixed(1)}% •{" "}
              {budget.spentAmount?.toLocaleString("ar-SA")} ريال
            </span>
          </div>
          <GradientBar
            pct={spentPct}
            color1={overBudget ? "#ef4444" : "#d97706"}
            color2={overBudget ? "#f87171" : "#fbbf24"}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#B8976B]/10 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "غير مخصص", value: unallocated, color: "text-gray-500" },
          {
            label: "المتبقي",
            value: budget.remainingAmount,
            color: "text-emerald-600",
          },
          {
            label: "حد الميزانية",
            value: budget.budgetLimit,
            color: "text-[#B8976B]",
          },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className={`text-sm font-bold ${color}`}>
              {value?.toLocaleString("ar-SA")}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {overBudget && (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-semibold">
            تجاوز الميزانية بمقدار{" "}
            {(budget.spentAmount - budget.totalBudget).toLocaleString("ar-SA")}{" "}
            ريال
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const BudgetAllocationPage = () => {
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const serverParams: Record<string, string> = {};
  if (filterYear) serverParams.Year = filterYear;

  const {
    data: rawBudgets,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["budgets", "allocation", serverParams],
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

  const displayed = search
    ? budgets.filter(
        (b) =>
          b.sectorName!.toLowerCase().includes(search.toLowerCase()) ||
          String(b.year).includes(search),
      )
    : budgets;

  const maxTotal = Math.max(...displayed.map((b) => b.totalBudget ?? 0), 1);
  const grandTotal = displayed.reduce((s, b) => s + (b.totalBudget ?? 0), 0);
  const grandAlloc = displayed.reduce(
    (s, b) => s + (b.allocatedAmount ?? 0),
    0,
  );
  const grandUnalloc = Math.max(0, grandTotal - grandAlloc);
  const allocPct = grandTotal > 0 ? (grandAlloc / grandTotal) * 100 : 0;
  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
            توزيع الميزانيات
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            نظرة شاملة على توزيع وتخصيص الميزانيات عبر القطاعات
          </p>
        </div>

        {!isLoading && !isError && (
          <div className="bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/60 text-sm font-semibold">
                  إجمالي الميزانيات المخصصة
                </p>
                <p className="text-3xl font-bold mt-0.5">
                  {grandAlloc.toLocaleString("ar-SA")}{" "}
                  <span className="text-lg font-normal text-white/60">
                    ريال
                  </span>
                </p>
              </div>
              <PieChart className="text-white/30" size={48} />
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-l from-[#B8976B] to-[#D4AF7A] transition-all duration-700"
                style={{ width: `${Math.min(allocPct, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "الإجمالي", value: grandTotal, sub: "ريال" },
                {
                  label: "المخصص",
                  value: grandAlloc,
                  sub: `${allocPct.toFixed(1)}%`,
                },
                {
                  label: "غير مخصص",
                  value: grandUnalloc,
                  sub: `${(100 - allocPct).toFixed(1)}%`,
                },
              ].map(({ label, value, sub }) => (
                <div key={label}>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-0.5">
                    {label}
                  </p>
                  <p className="text-lg font-bold">
                    {value.toLocaleString("ar-SA")}
                  </p>
                  <p className="text-white/50 text-xs">{sub}</p>
                </div>
              ))}
            </div>
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
            <div className="mt-4 pt-4 border-t border-[#B8976B]/10">
              <label className="block text-xs font-bold text-[#1B5E4F]/70 uppercase tracking-wider mb-1.5">
                السنة المالية
              </label>
              <div className="relative w-48">
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
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-[#1B5E4F] animate-spin" size={40} />
            <p className="text-gray-400 text-sm">
              جاري تحميل بيانات التوزيع...
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
            <div className="space-y-4">
              <div className="flex items-center gap-6 px-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#1B5E4F] to-[#2D8C73]" />
                  <span>المخصص</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-600 to-amber-400" />
                  <span>المنفق</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#B8976B]/40" />
                  <span>نسبة الحجم</span>
                </div>
              </div>
              {displayed.map((b) => (
                <AllocationRow key={b.id} budget={b} maxTotal={maxTotal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                <DollarSign className="text-[#B8976B]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1B5E4F] mb-1">
                لا توجد بيانات
              </h3>
              <p className="text-gray-400 text-sm">
                لا توجد ميزانيات لعرض توزيعها
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BudgetAllocationPage;
