import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Clock,
  Settings,
  UserCircle,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import EmployeesPage from "../pages/HR/Employees-Users-Sectors/Employees.tsx";
import UsersPage from "../pages/HR/Employees-Users-Sectors/Users.tsx";
import Dashboard from "../pages/Dashboard";
import Sectors from "../pages/HR/Employees-Users-Sectors/Sectors.tsx";
import BudgetsPage from "../pages/FinancialDepartment/BudgetsPage.tsx";
import BudgetAllocationPage from "../pages/FinancialDepartment/BudgetAllocationPage.tsx";
import BudgetTrackingPage from "../pages/FinancialDepartment/BudgetTrackingPage.tsx";
import VarianceAnalysisPage from "../pages/FinancialDepartment/VarianceAnalysisPage.tsx";
import ExpensesPage from "../pages/FinancialDepartment/ExpensesPage.tsx";
import AttendancePage from "../pages/HR/Attendance-salary/Attendance.tsx";
import SalaryPage from "../pages/HR/Attendance-salary/Salary.tsx";
import CustomersPage from "../pages/CRM/Customerspage.tsx";
import LeadsPage from "../pages/CRM/LeadsPage.tsx";
import DealsPage from "../pages/CRM/DealsPage.tsx";
import ActivitiesPage from "../pages/CRM/ActivitiesPage.tsx";
export interface SubItem {
  id: string;
  label: string;
  page: string;
  badge?: string;
  url: string;
  component?: React.ReactNode;
}

export interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  page?: string;
  badge?: string;
  subItems?: SubItem[];
  url?: string;
  component?: React.ReactNode;
}

export interface NavCategory {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_CONFIG: NavCategory[] = [
  {
    id: "dashboard",
    title: "لوحة التحكم",
    items: [
      {
        id: "dashboard",
        label: "لوحة المعلومات الرئيسية",
        icon: LayoutDashboard,
        component: <Dashboard />,
        url: "/dashboard",
      },
    ],
  },
  {
    id: "finance",
    title: "الإدارة المالية",
    items: [
      {
        id: "budgeting",
        label: "الميزانيات والتخطيط",
        icon: TrendingUp,
        subItems: [
          {
            id: "budgets",
            label: "إدارة الميزانيات",
            page: "budgets",
            url: "/budgets",
            component: <BudgetsPage />,
          },
          {
            id: "budget-allocation",
            label: "توزيع الميزانيات",
            page: "budget-allocation",
            url: "/budget-allocation",
            component: <BudgetAllocationPage />,
          },
          {
            id: "budget-tracking",
            label: "متابعة الميزانيات",
            page: "budget-tracking",
            url: "/budget-tracking",
            component: <BudgetTrackingPage />,
          },
          {
            id: "variance-analysis",
            label: "تحليل الانحرافات",
            page: "variance-analysis",
            url: "/variance-analysis",
            component: <VarianceAnalysisPage />,
          },
        ],
      },
      {
        id: "expenses",
        label: "المصروفات والإيرادات",
        icon: CreditCard,
        subItems: [
          {
            id: "expenses",
            label: "إدارة المصروفات",
            page: "expenses",
            url: "/expenses",
            component: <ExpensesPage />,
          },
        ],
      },
    ],
  },
  {
    id: "hr",
    title: "الموارد البشرية",
    items: [
      {
        id: "employees",
        label: "إدارة الموظفين",
        icon: Users,
        subItems: [
          {
            id: "employees",
            label: "قائمة الموظفين",
            page: "employees",
            url: "/employees",
            component: <EmployeesPage />,
          },

          {
            id: "org-structure",
            label: " ادارة القطاعات",
            page: "sectors",
            url: "/sectors",
            component: <Sectors />,
          },
        ],
      },
      {
        id: "attendance",
        label: "الحضور والرواتب",
        icon: Clock,
        subItems: [
          {
            id: "attendance",
            label: "الحضور والانصراف",
            page: "attendance",
            url: "/attendance",
            component: <AttendancePage />,
          },

          {
            id: "payroll",
            label: "الرواتب",
            page: "payroll",
            url: "/payroll",
            component: <SalaryPage />,
          },
        ],
      },
    ],
  },

  {
    id: "sales",
    title: "المبيعات والعملاء",
    items: [
      {
        id: "crm",
        label: "إدارة العملاء (CRM)",
        icon: UserCircle,
        subItems: [
          {
            id: "customers",
            label: "قاعدة العملاء",
            page: "customers",
            url: "/customers",
            component: <CustomersPage />,
          },
          {
            id: "leads",
            label: "العملاء المحتملين",
            page: "leads",
            badge: "12",
            url: "/leads",
            component: <LeadsPage />,
          },
          {
            id: "deals",
            label: "الصفقات",
            page: "deals",
            url: "/deals",
            component: <DealsPage />,
          },
          {
            id: "activities",
            label: "الأنشطة",
            page: "activities",
            url: "/activities",
            component: <ActivitiesPage />,
          },
        ],
      },
    ],
  },
  {
    id: "projects",
    title: "إدارة المشاريع",
    items: [
      {
        id: "project-management",
        label: "المشاريع",
        icon: Briefcase,
        subItems: [
          {
            id: "projects",
            label: "جميع المشاريع",
            page: "projects",
            url: "/projects",
          },
          {
            id: "project-tasks",
            label: "المهام",
            page: "project-tasks",
            url: "/project-tasks",
          },
          {
            id: "project-resources",
            label: "الموارد",
            page: "project-resources",
            url: "/project-resources",
          },
          {
            id: "project-timeline",
            label: "الجدول الزمني",
            page: "project-timeline",
            url: "/project-timeline",
          },
          {
            id: "project-costs",
            label: "التكاليف",
            page: "project-costs",
            url: "/project-costs",
          },
          {
            id: "project-profitability",
            label: "الربحية",
            page: "project-profitability",
            url: "/project-profitability",
          },
        ],
      },
    ],
  },

  {
    id: "settings",
    title: "الإعدادات",
    items: [
      {
        id: "users",
        label: "المستخدمين والصلاحيات",
        icon: Users,
        subItems: [
          {
            id: "users",
            label: "المستخدمين",
            page: "users",
            url: "/users",
            component: <UsersPage />,
          },
          { id: "roles", label: "الأدوار", page: "roles", url: "/roles" },
          {
            id: "permissions",
            label: "الصلاحيات",
            page: "permissions",
            url: "/permissions",
          },
        ],
      },
      {
        id: "system",
        label: "إعدادات النظام",
        icon: Settings,
        subItems: [
          {
            id: "system-config",
            label: "الإعدادات العامة",
            page: "system-config",
            url: "/system-config",
          },
          {
            id: "audit-logs",
            label: "سجلات المراجعة",
            page: "audit-logs",
            url: "/audit-logs",
          },
          {
            id: "workflows",
            label: "سير العمل",
            page: "workflows",
            url: "/workflows",
          },
          {
            id: "notifications",
            label: "الإشعارات",
            page: "notifications",
            url: "/notifications",
          },
        ],
      },
    ],
  },
];
