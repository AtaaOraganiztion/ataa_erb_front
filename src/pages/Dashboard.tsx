import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Users,
  Target,
  Briefcase,
  UserCheck,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  Loader2,
  Phone,
  Mail,
  FileText,
  CheckSquare,
  Layers,
  Star,
  BarChart2,
  PieChartIcon,
  Zap,
  Shield,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Budget {
  totalBudget: number;
  remainingAmount: number;
  isConfirmed: boolean;
}

interface Expense {
  amount: number;
  isPaid: boolean;
}

interface Customer {
  id: string;
  fullName: string;
  company?: string;
  email?: string;
  status: "Active" | "Inactive" | "Blocked";
}

interface Lead {
  id: string;
  company: string;
  title?: string;
  fullName?: string;
  value?: number;
  status: string;
  stage?: string;
}

interface Deal {
  id: string;
  value: number;
  status: "Open" | "Won" | "Lost" | "OnHold";
}

interface Employee {
  id: string;
  sectorId: string;
  status: "Active" | "Inactive";
}

interface ActivityItem {
  id: string;
  type: "Call" | "Email" | "Meeting" | "Note" | "Task";
  subject: string;
  status: "Planned" | "Completed" | "Cancelled";
  activityDate: string;
}

interface Attendance {
  id: string;
  userId?: string;
  employeeFullName?: string;
  date?: string;
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked: number;
  status: number | string;
}

interface Sector {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "Active" | "Inactive";
}

// ─── Auth Fetch ───────────────────────────────────────────────────────────────
const authFetch = async (url: string): Promise<any> => {
  const token = localStorage.getItem("accessToken") ?? "";
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const norm = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);

const CHART_COLORS = [
  "#4CAF50", // green
  "#2196F3", // blue
  "#FFC107", // amber
  "#F44336", // red
  "#9C27B0", // purple
  "#FF9800", // orange
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = (): string => new Date().toISOString().slice(0, 10);

const getActivityIcon = (type: string) => {
  const map: Record<string, any> = {
    Call: Phone,
    Email: Mail,
    Meeting: Users,
    Note: FileText,
    Task: CheckSquare,
  };
  return map[type] ?? Activity;
};

const getActivityColor = (type: string): { bg: string; text: string } => {
  const map: Record<string, { bg: string; text: string }> = {
    Call: { bg: "bg-blue-100", text: "text-blue-600" },
    Email: { bg: "bg-violet-100", text: "text-violet-600" },
    Meeting: { bg: "bg-amber-100", text: "text-amber-600" },
    Note: { bg: "bg-teal-100", text: "text-teal-600" },
    Task: { bg: "bg-rose-100", text: "text-rose-600" },
  };
  return map[type] ?? { bg: "bg-gray-100", text: "text-gray-600" };
};

const getActivityLabel = (type: string): string => {
  const map: Record<string, string> = {
    Call: "مكالمة",
    Email: "بريد إلكتروني",
    Meeting: "واتساب",
    Note: "منصة",
    Task: "مهمة",
  };
  return map[type] ?? type;
};

const getStatusLabel = (status: string | number): string => {
  const map: Record<string, string> = {
    Planned: "مخطط",
    Completed: "مكتمل",
    Cancelled: "ملغي",
    Open: "مفتوح",
    Won: "فاز",
    Lost: "خسر",
    New: "جديد",
    Qualified: "مؤهل",
    Present: "حاضر",
    Absent: "غائب",
    Late: "متأخر",
    WorkFromHome: "عمل من المنزل",
    Active: "نشط",
    Inactive: "غير نشط",
    OnLeave: "اجازة",
    Blocked: "داعم",
  };
  return map[String(status)] ?? String(status);
};

const formatDate = (d: string | Date): string => {
  try {
    return new Date(d).toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatDateTime = (d: string | Date): string => {
  try {
    return new Date(d).toLocaleString("ar-SA", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string | React.ReactNode;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  trend?: number;
  trendLabel?: string;
  loading: boolean;
}

const StatCard = ({
  label,
  value,
  sub,
  Icon,
  gradient,
  trend,
  trendLabel,
  loading,
}: StatCardProps) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} shadow-sm border border-white/20 group hover:shadow-md transition-all duration-300`}
  >
    <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
    <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-white/5 translate-x-1/2 translate-y-1/2 pointer-events-none" />
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">
          {label}
        </p>
        {loading ? (
          <div className="w-12 h-8 bg-white/20 rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-3xl font-black text-white leading-none">
            {value ?? 0}
          </p>
        )}
        {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <Icon size={22} className="text-white" />
      </div>
    </div>
    {trend !== undefined && (
      <div className="relative z-10 mt-4 flex items-center gap-1.5">
        {trend >= 0 ? (
          <ArrowUpRight size={14} className="text-emerald-300" />
        ) : (
          <ArrowDownRight size={14} className="text-red-300" />
        )}
        <span
          className={`text-xs font-semibold ${trend >= 0 ? "text-emerald-300" : "text-red-300"}`}
        >
          {Math.abs(trend)}% {trendLabel}
        </span>
      </div>
    )}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  sub?: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SectionHeader = ({ title, sub, Icon }: SectionHeaderProps) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-9 h-9 rounded-xl bg-[#1B5E4F]/10 flex items-center justify-center">
      <Icon size={18} className="text-[#1B5E4F]" />
    </div>
    <div>
      <h2 className="text-base font-bold text-[#1B5E4F] leading-tight">
        {title}
      </h2>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border border-[#B8976B]/20 rounded-xl shadow-xl p-3 text-sm"
      dir="rtl"
    >
      {label && <p className="font-bold text-[#1B5E4F] mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p
          key={i}
          style={{ color: p.color }}
          className="flex items-center gap-2"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const opts = { staleTime: 30_000 };
  const { data: budgetsRaw, isLoading: lB } = useQuery({
    queryKey: ["dash-budgets"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Budget/Get-All`),
    ...opts,
  });

  const { data: expensesRaw, isLoading: lEx } = useQuery({
    queryKey: ["dash-expenses"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Expense/Get-All`),
    ...opts,
  });

  const budgets = norm(budgetsRaw) as Budget[];
  const expenses = norm(expensesRaw) as Expense[];

  const totalBudget = budgets.reduce(
    (sum: number, b: Budget) => sum + (b.totalBudget ?? 0),
    0,
  );
  const totalSpent = expenses.reduce(
    (sum: number, e: Expense) => sum + (e.amount ?? 0),
    0,
  );

  const { data: customersRaw, isLoading: lC } = useQuery({
    queryKey: ["dash-customers"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Customer/Get-All`),
    ...opts,
  });
  const { data: leadsRaw, isLoading: lL } = useQuery({
    queryKey: ["dash-leads"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Lead/Get-All`),
    ...opts,
  });
  const { data: dealsRaw, isLoading: lD } = useQuery({
    queryKey: ["dash-deals"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Deal/Get-All`),
    ...opts,
  });
  const { data: employeesRaw, isLoading: lE } = useQuery({
    queryKey: ["dash-employees"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Employee/Get-All`),
    ...opts,
  });
  const { data: activitiesRaw, isLoading: lAc } = useQuery({
    queryKey: ["dash-activities"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Activity/Get-All`),
    ...opts,
  });
  const { data: attendanceRaw, isLoading: lAt } = useQuery({
    queryKey: ["dash-attendance"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Attendance/Get-All`),
    ...opts,
  });
  const { data: sectorsRaw, isLoading: lS } = useQuery({
    queryKey: ["dash-sectors"],
    queryFn: () => authFetch(`${API_BASE}/Api/V1/Sector/Get-All`),
    ...opts,
  });
  const { data: usersRaw, isLoading: lU } = useQuery({
    queryKey: ["dash-users"],
    queryFn: () =>
      authFetch(`${API_BASE}/Api/V1/users/get?PageIndex=1&PageSize=100`),
    ...opts,
  });

  const customers = norm(customersRaw) as Customer[];
  const leads = norm(leadsRaw) as Lead[];
  const deals = norm(dealsRaw) as Deal[];
  const employees = norm(employeesRaw) as Employee[];
  const activities = norm(activitiesRaw) as ActivityItem[];
  const attendance = norm(attendanceRaw) as Attendance[];
  const sectors = norm(sectorsRaw) as Sector[];
  const users = norm(usersRaw) as User[];

  const usersMap = Object.fromEntries(users.map((u: User) => [u.id, u]));

  const ATTENDANCE_STATUS = [
    "Present",
    "Absent",
    "Late",
    "OnLeave",
    "WorkFromHome",
  ];

  const normalizeAttendanceStatus = (status: number | string): string => {
    if (typeof status === "number") {
      return ATTENDANCE_STATUS[status] ?? "Present";
    }
    return status;
  };

  // ── Computed Stats ──────────────────────────────────────────────────────────
  const today = todayStr();
  const todayAttendance = attendance.filter((a: Attendance) => {
    return (
      a.date?.slice(0, 10) === today || a.checkInTime?.slice(0, 10) === today
    );
  });
  const presentToday = todayAttendance.filter((a: Attendance) => {
    const status = normalizeAttendanceStatus(a.status);
    return status === "Present" || status === "WorkFromHome" || a.checkInTime;
  }).length;

  const activeCustomers = customers.filter(
    (c: Customer) => c.status === "Active",
  ).length;
  const inactiveCustomers = customers.filter(
    (c: Customer) => c.status === "Inactive",
  ).length;
  const blockedCustomers = customers.filter(
    (c: Customer) => c.status === "Blocked",
  ).length;

  const newLeads = leads.filter((l: Lead) => l.status === "New").length;
  const oldLeads = leads.filter((l: Lead) => l.status === "Contacted").length;
  const qualifiedLeads = leads.filter(
    (l: Lead) => l.status === "Qualified",
  ).length;

  const totalDealValue = deals.reduce(
    (s: number, d: Deal) => s + (d.value ?? 0),
    0,
  );
  const openDeals = deals.filter((d: Deal) => d.status === "Open").length;
  const wonDeals = deals.filter((d: Deal) => d.status === "Won").length;
  const onholdDeals = deals.filter((d: Deal) => d.status === "OnHold").length;

  const completedActivities = activities.filter(
    (a: ActivityItem) => a.status === "Completed",
  ).length;
  const plannedActivities = activities.filter(
    (a: ActivityItem) => a.status === "Planned",
  ).length;
  const cancelledActivities = activities.filter(
    (a: ActivityItem) => a.status === "Cancelled",
  ).length;
  const overdueActivities = activities.filter(
    (a: ActivityItem) =>
      a.status === "Planned" && new Date(a.activityDate) < new Date(),
  ).length;

  const activeEmployees = employees.filter(
    (e: Employee) => e.status === "Active",
  ).length;
  const inactiveEmployees = employees.filter(
    (e: Employee) => e.status === "Inactive",
  ).length;

  // ── Charts Data ─────────────────────────────────────────────────────────────
  const activityTypeData = ["Call", "Email", "Meeting", "Note", "Task"]
    .map((type) => ({
      name: getActivityLabel(type),
      value: activities.filter((a: ActivityItem) => a.type === type).length,
    }))
    .filter((d) => d.value > 0);

  const activityStatusData = [
    { name: "مخطط", value: plannedActivities, color: "#3B82F6" },
    { name: "مكتمل", value: completedActivities, color: "#10B981" },
    {
      name: "ملغي",
      value: cancelledActivities,
      color: "#EF4444",
    },
  ].filter((d) => d.value > 0);

  const dealStatusData = [
    { name: "مادى", value: openDeals, fill: "#1B5E4F" },
    { name: "عينى", value: wonDeals, fill: "#B8976B" },
    { name: "معلق", value: onholdDeals, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Attendance by date (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const attendanceByDay = last7Days.map((date) => {
    const dayAtt = attendance.filter(
      (a: Attendance) => a.checkInTime?.slice(0, 10) === date,
    );
    return {
      name: formatDate(date),
      حاضر: dayAtt.filter((a: Attendance) => a.status === "Present").length,
      "من المنزل": dayAtt.filter((a: Attendance) => a.status === "WorkFromHome")
        .length,
      متأخر: dayAtt.filter((a: Attendance) => a.status === "Late").length,
    };
  });

  // Recent activities (last 8)
  const recentActivities = [...activities]
    .sort(
      (a: ActivityItem, b: ActivityItem) =>
        new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime(),
    )
    .slice(0, 8);

  // Latest attendance records
  const recentAttendance = [...attendance]
    .sort(
      (a: Attendance, b: Attendance) =>
        new Date(b.checkInTime ?? 0).getTime() -
        new Date(a.checkInTime ?? 0).getTime(),
    )
    .slice(0, 6);
  const recentAttendanceWithUsers = recentAttendance.map((att: Attendance) => {
    const user = usersMap[att.userId ?? ""];
    return {
      ...att,
      userName: user?.name ?? att.employeeFullName ?? "Unknown",
      email: user?.email ?? null,
      phone: user?.phone ?? null,
    };
  });

  // Customer status for pie chart
  const customerStatusData = [
    { name: "نشط", value: activeCustomers, fill: "#22C55E" },
    { name: "غير نشط", value: inactiveCustomers, fill: "#6B7280" },
    { name: "محظور", value: blockedCustomers, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

 
  return (
    <div className="min-h-screen bg-[#F5F1E8]/40" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center shadow-lg">
                <BarChart2 size={20} className="text-white" />
              </div>
              <h1 className="text-3xl font-black bg-gradient-to-l from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent">
                لوحة التحكم
              </h1>
            </div>
            <p className="text-gray-400 text-sm mr-13">
              آخر تحديث: {formatDateTime(new Date())} — نظرة شاملة على أداء
              المنظمة
            </p>
          </div>
        </div>

        {/* ── Stats Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="إجمالي المانحين"
            value={customers.length}
            sub={
              <>
                {activeCustomers} نشط <br />
                {inactiveCustomers} غير نشط <br /> {blockedCustomers} داعم
              </>
            }
            Icon={Star}
            gradient="from-[#1B5E4F] to-[#2A7A67]"
            loading={lC}
          />
          <StatCard
            label="إجمالي الجمعيات"
            value={leads.length}
            sub={
              <>
                {newLeads} جديد <br />
                {oldLeads} قديم <br /> {qualifiedLeads} محظورة
              </>
            }
            Icon={Target}
            gradient="from-[#B8976B] to-[#D4B48A]"
            loading={lL}
          />
          <StatCard
            label="إجمالي الدعومات"
            value={deals.length}
            sub={
              <>
                {openDeals} مادى <br />
                {wonDeals} عينى <br /> {onholdDeals} معلق
              </>
            }
            Icon={Briefcase}
            gradient="from-[#0F4F3E] to-[#1B5E4F]"
            loading={lD}
          />
          <StatCard
            label="عدد الموظفين"
            value={employees.length}
            sub={
              <>
                {activeEmployees} نشط <br />
                {inactiveEmployees} غير نشط
              </>
            }
            Icon={UserCheck}
            gradient="from-[#8B6B45] to-[#B8976B]"
            loading={lE}
          />
          <StatCard
            label="عدد الأنشطة"
            value={activities.length}
            sub={
              <>
                {completedActivities} مكتمل <br />
                {plannedActivities} مخطط <br /> {cancelledActivities} ملغى
              </>
            }
            Icon={Activity}
            gradient="from-[#2A7A67] to-[#3D9B85]"
            loading={lAc}
          />
          <StatCard
            label="الحضور اليومي"
            value={presentToday}
            sub={`من أصل ${users.length} موظف`}
            Icon={Clock}
            gradient="from-[#D4B48A] to-[#E8C89A]"
            loading={lAt}
          />
          <StatCard
            label="إجمالي الميزانية"
            value={totalBudget.toLocaleString("ar-SA")}
            Icon={DollarSign}
            gradient="from-[#1B5E4F] to-[#2A7A67]"
            loading={lB}
          />
          <StatCard
            label="إجمالي المصروفات"
            value={totalSpent.toLocaleString("ar-SA")}
            Icon={Briefcase}
            gradient="from-[#B8976B] to-[#D4B48A]"
            loading={lEx}
          />
        </div>

        {/* ── Alert Banner ─────────────────────────────────────────────────── */}
        {overdueActivities > 0 && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-orange-700 text-sm">
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-orange-600" />
            </div>
            <div>
              <span className="font-bold">تنبيه: </span>
              يوجد{" "}
              <span className="font-black text-orange-700">
                {overdueActivities}
              </span>{" "}
              نشاط متأخر لم يتم إنجازه بعد موعده المحدد
            </div>
          </div>
        )}

        {/* ── Row 1: Attendance Chart + Activity Status ─────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Attendance trend */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="الحضور والغياب - آخر 7 أيام"
              sub="تفاصيل الحضور اليومي للموظفين"
              Icon={Calendar}
            />
            {lAt ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : attendance.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-300 text-sm">
                لا توجد بيانات حضور
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={attendanceByDay} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F1E8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="حاضر" fill="#1B5E4F" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="من المنزل"
                    fill="#B8976B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="متأخر" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Activity Status Pie */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="حالة الأنشطة"
              sub="توزيع الأنشطة حسب الحالة"
              Icon={PieChartIcon}
            />
            {lAc ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : activityStatusData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-300 text-sm">
                لا توجد أنشطة
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={activityStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {activityStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {activityStatusData.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: d.color }}
                        />
                        <span className="text-gray-500">{d.name}</span>
                      </div>
                      <span className="font-bold text-[#1B5E4F]">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 2: Activity Types + Deal Status ──────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Activity types */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="أنواع الأنشطة"
              sub="توزيع الأنشطة حسب النوع"
              Icon={Layers}
            />
            {lAc ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : activityTypeData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-300 text-sm">
                لا توجد أنشطة
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={activityTypeData}
                  layout="vertical"
                  barSize={18}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#F5F1E8"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#1B5E4F" }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="العدد" radius={[0, 6, 6, 0]}>
                    {activityTypeData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Deal Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="الدعومات والتبرعات"
              sub="توزيع الدعومات حسب الحالة"
              Icon={Briefcase}
            />
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {
                  label: "مادى",
                  val: openDeals,
                  cls: "bg-[#1B5E4F]/10 text-[#1B5E4F]",
                },
                {
                  label: "عينى",
                  val: wonDeals,
                  cls: "bg-emerald-50 text-emerald-700",
                },
                {
                  label: "معلق",
                  val: onholdDeals,
                  cls: "bg-red-50 text-red-600",
                },
              ].map(({ label, val, cls }) => (
                <div
                  key={label}
                  className={`rounded-xl p-3 text-center ${cls}`}
                >
                  <p className="text-2xl font-black">{val}</p>
                  <p className="text-xs font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {lD ? (
              <div className="h-28 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : deals.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-gray-300 text-sm">
                لا توجد دعومات
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={dealStatusData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F1E8" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="العدد" radius={[6, 6, 0, 0]}>
                    {dealStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Row 3: Customer Status + Employee by Sector ───────────────────── */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Customer status */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="المانحون"
              sub="توزيع المانحين حسب الحالة"
              Icon={Star}
            />
            {lC ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : customers.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-300 text-sm">
                لا توجد بيانات
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={customerStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {customerStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {customerStatusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ background: d.fill }}
                      />
                      <span className="text-gray-500 truncate">
                        {d.name}:{" "}
                        <strong className="text-[#1B5E4F]">{d.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Employee by sector */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="الأقسام"
              sub="توزيع الموظفين على الأقسام"
              Icon={Building2}
            />
            {lE || lS ? (
              <div className="h-44 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : sectors.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-300 text-sm">
                لا توجد أقسام
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                {sectors.map((s: Sector) => {
                  const count = employees.filter(
                    (e: Employee) => e.sectorId === s.id,
                  ).length;
                  const pct = employees.length
                    ? Math.round((count / employees.length) * 100)
                    : 0;
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-[#1B5E4F] truncate">
                          {s.name}
                        </span>
                        <span className="text-xs font-bold text-[#B8976B] shrink-0">
                          {count} موظف
                        </span>
                      </div>
                      <div className="h-2 bg-[#F5F1E8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-[#B8976B] to-[#1B5E4F] rounded-full transition-all duration-700"
                          style={{ width: `${pct || 5}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick summary */}
          <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -translate-x-1/2 translate-y-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={18} className="text-[#B8976B]" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-white/80">
                  ملخص سريع
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: "إجمالي قيمة الدعومات",
                    val: `${totalDealValue.toLocaleString("ar-SA")} ريال`,
                    Icon: DollarSign,
                  },
                  {
                    label: "الأنشطة المتأخرة",
                    val: overdueActivities,
                    Icon: AlertTriangle,
                  },
                  {
                    label: "الأقسام النشطة",
                    val: sectors.length,
                    Icon: Building2,
                  },
                  {
                    label: "المستخدمون النشطون",
                    val: users.filter((u: User) => u.status === "Active")
                      .length,
                    Icon: Shield,
                  },
                  {
                    label: "نسبة إنجاز الأنشطة",
                    val: activities.length
                      ? `${Math.round((completedActivities / activities.length) * 100)}%`
                      : "—",
                    Icon: CheckCircle,
                  },
                ].map(({ label, val, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[#B8976B]" />
                      <span className="text-xs text-white/70">{label}</span>
                    </div>
                    <span className="font-black text-[#D4B48A] text-sm">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Recent Activities + Latest Attendance ──────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="آخر الأنشطة"
              sub="أحدث الأنشطة المسجلة في النظام"
              Icon={Activity}
            />
            {lAc ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-gray-300 text-sm gap-3">
                <Activity size={32} /> لا توجد أنشطة مسجلة
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((a: ActivityItem) => {
                  const Icon = getActivityIcon(a.type);
                  const { bg, text } = getActivityColor(a.type);
                  const isOverdue =
                    a.status === "Planned" &&
                    new Date(a.activityDate) < new Date();
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F1E8]/50 transition-colors group"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}
                      >
                        <Icon size={15} className={text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[#1B5E4F] truncate">
                            {a.subject}
                          </p>
                          {isOverdue && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                              متأخر
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold ${text}`}>
                            {getActivityLabel(a.type)}
                          </span>
                          <span className="text-[10px] text-gray-300">•</span>
                          <span className="text-[10px] text-gray-400">
                            {formatDate(a.activityDate)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {a.status === "Completed" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            مكتمل
                          </span>
                        ) : a.status === "Cancelled" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                            ملغي
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            مخطط
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Attendance */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="آخر سجلات الحضور"
              sub="أحدث تسجيلات الدخول والخروج"
              Icon={Clock}
            />
            {lAt ? (
              <div className="h-52 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : recentAttendanceWithUsers.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-gray-300 text-sm gap-3">
                <Clock size={32} /> لا توجد سجلات حضور
              </div>
            ) : (
              <div className="space-y-2">
                {recentAttendanceWithUsers.map((a) => {
                  const statusCfg: Record<
                    string,
                    { cls: string; dot: string }
                  > = {
                    Present: {
                      cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
                      dot: "bg-emerald-500",
                    },
                    WorkFromHome: {
                      cls: "bg-blue-50 text-blue-600 border-blue-100",
                      dot: "bg-blue-500",
                    },
                    Late: {
                      cls: "bg-orange-50 text-orange-600 border-orange-100",
                      dot: "bg-orange-500",
                    },
                    Absent: {
                      cls: "bg-red-50 text-red-600 border-red-100",
                      dot: "bg-red-500",
                    },
                    OnLeave: {
                      cls: "bg-gray-50 text-gray-500 border-gray-100",
                      dot: "bg-gray-400",
                    },
                  };
                  const status = normalizeAttendanceStatus(a.status);
                  const cfg = statusCfg[status] ?? statusCfg.Absent;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F1E8]/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#1B5E4F]/10 flex items-center justify-center shrink-0">
                        <UserCheck size={15} className="text-[#1B5E4F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1B5E4F]">
                          {a.userName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {a.checkInTime && (
                            <span className="text-[10px] text-gray-400">
                              دخول:{" "}
                              {new Date(a.checkInTime).toLocaleTimeString(
                                "ar-SA",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          )}
                          {a.checkOutTime && (
                            <>
                              <span className="text-[10px] text-gray-300">
                                •
                              </span>
                              <span className="text-[10px] text-gray-400">
                                خروج:{" "}
                                {new Date(a.checkOutTime).toLocaleTimeString(
                                  "ar-SA",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </>
                          )}
                          {a.hoursWorked > 0 && (
                            <>
                              <span className="text-[10px] text-gray-300">
                                •
                              </span>
                              <span className="text-[10px] font-semibold text-[#1B5E4F]">
                                {a.hoursWorked.toFixed(1)} ساعة
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls} flex items-center gap-1`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                        />
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 5: Leads Overview + Customer List ────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Leads Overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="الجمعيات الأخيرة"
              sub="آخر الجمعيات المسجلة في النظام"
              Icon={Target}
            />
            {lL ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : leads.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-300 text-sm gap-3">
                <Target size={32} /> لا توجد جمعيات مسجلة
              </div>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 5).map((l: Lead) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F1E8]/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#B8976B]/15 flex items-center justify-center shrink-0">
                      <Target size={15} className="text-[#B8976B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B5E4F] truncate">
                        اسم الجمعية: {l.company}
                      </p>
                      <div className="flex flex-col gap-2 mt-0.5">
                        {l.title && (
                          <span className="text-[10px] text-gray-400">
                            صفة مسئول الاتصال: {l.title}
                          </span>
                        )}
                        {l.fullName && (
                          <span className="text-[10px] text-gray-400">
                            اسم المسئول: {l.fullName}
                          </span>
                        )}
                        {l.value && (
                          <span className="text-[10px] font-semibold text-[#B8976B]">
                            {l.value.toLocaleString("ar-SA")} ريال
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B5E4F]/10 text-[#1B5E4F]">
                        {getStatusLabel(l.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customers list */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#B8976B]/15 p-6">
            <SectionHeader
              title="المانحون الأخيرون"
              sub="آخر المانحين المسجلين في النظام"
              Icon={Star}
            />
            {lC ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#1B5E4F]" size={28} />
              </div>
            ) : customers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-300 text-sm gap-3">
                <Star size={32} /> لا توجد مانحون مسجلون
              </div>
            ) : (
              <div className="space-y-2">
                {customers.slice(0, 5).map((c: Customer) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F5F1E8]/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B5E4F] to-[#2A7A67] flex items-center justify-center shrink-0 text-white font-black text-sm">
                      {(c.fullName ?? "؟")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B5E4F] truncate">
                        {c.fullName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.company && (
                          <span className="text-[10px] text-gray-400 truncate">
                            الجهة: {c.company}
                          </span>
                        )}
                        {c.email && (
                          <>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {c.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}
                    >
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Summary ────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-l from-[#F5F1E8] to-white rounded-2xl border border-[#B8976B]/15 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "إجمالي المستخدمين", val: users.length, loading: lU },
              { label: "الأقسام", val: sectors.length, loading: lS },
              { label: "سجلات الحضور", val: attendance.length, loading: lAt },
              {
                label: "معدل الإنجاز",
                val: activities.length
                  ? `${Math.round((completedActivities / activities.length) * 100)}%`
                  : "—",
                loading: lAc,
              },
            ].map(({ label, val, loading }) => (
              <div key={label} className="py-2">
                <p className="text-xs text-[#B8976B] font-bold uppercase tracking-wider mb-1">
                  {label}
                </p>
                {loading ? (
                  <div className="w-10 h-6 bg-[#B8976B]/20 rounded animate-pulse mx-auto" />
                ) : (
                  <p className="text-2xl font-black text-[#1B5E4F]">{val}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
