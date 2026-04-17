import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Users,
  Clock,
  UserCircle,
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
import DonnersPage from "../pages/CRM/DonnersPage.tsx";
import ChariteiesPage from "../pages/CRM/ChariteiesPage.tsx";
import DonationsPage from "../pages/CRM/DonationsPage.tsx";
import ActivitiesPage from "../pages/CRM/ActivitiesPage.tsx";
import DesignerPage from "../pages/Designers/Designers.tsx";

export interface SubItem {
  id: string;
  label: string;
  page: string;
  badge?: string;
  url: string;
  component?: React.ReactNode;
  roles?: string[];
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
  roles?: string[]; // ← Roles that can see this main item
}

export interface NavCategory {
  id: string;
  title: string;
  roles?: string[]; // ← Optional: restrict entire category
  items: NavItem[];
}

// Current user roles (you will pass this from your auth context)
export type UserRole = "Admin" | "Finance" | "HR" | "User" | "Designer";

// Helper function to check if user has permission
export const hasAccess = (
  userRoles: UserRole[],
  allowedRoles?: string[],
): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true; // No restriction = visible to all
  return userRoles.some((role) => allowedRoles.includes(role));
};

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
        roles: ["Admin", "HR"],
      },
    ],
  },

  {
    id: "designers",
    title: "المصممين",
    roles: ["Admin", "Designer"], // Only these roles see the whole category
    items: [
      {
        id: "designers",
        label: "المصممين",
        icon: LayoutDashboard,
        component: <DesignerPage />,
        url: "/designers",
        roles: ["Admin", "Designer"],
      },
    ],
  },

  {
    id: "finance",
    title: "الإدارة المالية",
    roles: ["Admin", "Finance"],
    items: [
      {
        id: "budgeting",
        label: "الميزانيات والتخطيط",
        icon: TrendingUp,
        roles: ["Admin", "Finance"],
        subItems: [
          {
            id: "budgets",
            label: "إدارة الميزانيات",
            page: "budgets",
            url: "/budgets",
            component: <BudgetsPage />,
            roles: ["Admin", "Finance"],
          },
          {
            id: "budget-allocation",
            label: "توزيع الميزانيات",
            page: "budget-allocation",
            url: "/budget-allocation",
            component: <BudgetAllocationPage />,
            roles: ["Admin", "Finance"],
          },
          {
            id: "budget-tracking",
            label: "متابعة الميزانيات",
            page: "budget-tracking",
            url: "/budget-tracking",
            component: <BudgetTrackingPage />,
            roles: ["Admin", "Finance"],
          },
          {
            id: "variance-analysis",
            label: "تحليل الانحرافات",
            page: "variance-analysis",
            url: "/variance-analysis",
            component: <VarianceAnalysisPage />,
            roles: ["Admin", "Finance"],
          },
        ],
      },
      {
        id: "expenses",
        label: "المصروفات والإيرادات",
        icon: CreditCard,
        roles: ["Admin", "Finance"],
        subItems: [
          {
            id: "expenses",
            label: "إدارة المصروفات",
            page: "expenses",
            url: "/expenses",
            component: <ExpensesPage />,
            roles: ["Admin", "Finance"],
          },
        ],
      },
    ],
  },

  {
    id: "hr",
    title: "الموارد البشرية",
    roles: ["Admin", "HR", "User", "Designer"],
    items: [
      {
        id: "employees",
        label: "إدارة الموظفين",
        icon: Users,
        roles: ["Admin", "HR"],
        subItems: [
          {
            id: "employees",
            label: "قائمة الموظفين",
            page: "employees",
            url: "/employees",
            component: <EmployeesPage />,
            roles: ["Admin", "HR"],
          },
          {
            id: "org-structure",
            label: "إدارة القطاعات",
            page: "sectors",
            url: "/sectors",
            component: <Sectors />,
            roles: ["Admin", "HR"],
          },
        ],
      },
      {
        id: "attendance",
        label: "الحضور والرواتب",
        icon: Clock,
        roles: ["Admin", "HR", "User", "Designer"],
        subItems: [
          {
            id: "attendance",
            label: "الحضور والانصراف",
            page: "attendance",
            url: "/attendance",
            component: <AttendancePage />,
            roles: ["Admin", "HR", "User", "Designer"],
          },
          {
            id: "payroll",
            label: "الرواتب",
            page: "payroll",
            url: "/payroll",
            component: <SalaryPage />,
            roles: ["Admin", "HR"],
          },
        ],
      },
    ],
  },

  {
    id: "sales",
    title: " الجمعيات والعملاء",
    roles: ["Admin", "HR", "User", "Finance"],
    items: [
      {
        id: "crm",
        label: "إدارة العملاء (CRM)",
        icon: UserCircle,
        roles: ["Admin", "HR", "User"],
        subItems: [
          {
            id: "donners",
            label: "المانحين",
            page: "donners",
            url: "/donners",
            component: <DonnersPage />,
            roles: ["Admin", "HR", "User"],
          },
          {
            id: "chariteies",
            label: "الجمعيات",
            page: "chariteies",
            badge: "12",
            url: "/chariteies",
            component: <ChariteiesPage />,
            roles: ["Admin", "HR", "User"],
          },
          {
            id: "donations",
            label: "الدعومات",
            page: "donations",
            url: "/donations",
            component: <DonationsPage />,
            roles: ["Admin", "User", "Finance", "HR"],
          },
          {
            id: "activities",
            label: "الأنشطة",
            page: "activities",
            url: "/activities",
            component: <ActivitiesPage />,
            roles: ["Admin", "HR", "User"],
          },
        ],
      },
    ],
  },

  {
    id: "settings",
    title: "الإعدادات",
    roles: ["Admin"], // Only Admin can see Settings
    items: [
      {
        id: "users",
        label: "المستخدمين والصلاحيات",
        icon: Users,
        roles: ["Admin"],
        subItems: [
          {
            id: "users",
            label: "المستخدمين",
            page: "users",
            url: "/users",
            component: <UsersPage />,
            roles: ["Admin"],
          },
        ],
      },
    ],
  },
];
