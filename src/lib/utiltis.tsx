import {
  LayoutDashboard, DollarSign, TrendingUp, CreditCard, FileText,
  Users, Clock, Award, Utensils, Package, Building, Smartphone,
  Settings, UserCircle, Briefcase, ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EmployeesPage from "../pages/HR/Employees/Employees";

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
        component: "Dashboard",
        url: "/dashboard",
      },
    ],
  },
  {
    id: "finance",
    title: "الإدارة المالية",
    items: [
      {
        id: "accounting",
        label: "المحاسبة المالية",
        icon: DollarSign,
        subItems: [
          {
            id: "chart-of-accounts",
            label: "دليل الحسابات",
            page: "chart-of-accounts",
            url: "/chart-of-accounts",
          },
          {
            id: "general-ledger",
            label: "دفتر الأستاذ العام",
            page: "general-ledger",
            url: "/general-ledger",
          },
          {
            id: "journal-entries",
            label: "القيود اليومية",
            page: "journal-entries",
            url: "/journal-entries",
          },
          {
            id: "trial-balance",
            label: "ميزان المراجعة",
            page: "trial-balance",
            url: "/trial-balance",
          },
        ],
      },
      {
        id: "budgeting",
        label: "الميزانيات والتخطيط",
        icon: TrendingUp,
        subItems: [
          { id: "budgets", label: "إدارة الميزانيات", page: "budgets", url: "/budgets" },
          {
            id: "budget-allocation",
            label: "توزيع الميزانيات",
            page: "budget-allocation",
            url: "/budget-allocation",
          },
          {
            id: "budget-tracking",
            label: "متابعة الميزانيات",
            page: "budget-tracking",
            url: "/budget-tracking",
          },
          {
            id: "variance-analysis",
            label: "تحليل الانحرافات",
            page: "variance-analysis",
            url: "/variance-analysis",
          },
        ],
      },
      {
        id: "expenses",
        label: "المصروفات والإيرادات",
        icon: CreditCard,
        subItems: [
          { id: "expenses", label: "إدارة المصروفات", page: "expenses", url: "/expenses" },
          { id: "revenues", label: "إدارة الإيرادات", page: "revenues", url: "/revenues" },
          { id: "cash-flow", label: "التدفقات النقدية", page: "cash-flow", url: "/cash-flow" },
          {
            id: "profitability",
            label: "تحليل الربحية",
            page: "profitability",
            url: "/profitability",
          },
        ],
      },
      {
        id: "reports",
        label: "التقارير المالية",
        icon: FileText,
        badge: "جديد",
        subItems: [
          { id: "pl-report", label: "قائمة الدخل", page: "pl-report", url: "/pl-report" },
          {
            id: "balance-sheet",
            label: "الميزانية العمومية",
            page: "balance-sheet",
            url: "/balance-sheet",
          },
          {
            id: "cashflow-report",
            label: "قائمة التدفقات النقدية",
            page: "cashflow-report",
            url: "/cashflow-report",
          },
          {
            id: "consolidated-reports",
            label: "التقارير المجمعة",
            page: "consolidated-reports",
            url: "/consolidated-reports",
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
            id: "employees", label: "قائمة الموظفين", page: "employees",
            url: "/employees",
            component: <EmployeesPage />,
          },
          {
            id: "recruitment",
            label: "التوظيف",
            page: "recruitment",
            badge: "3",
            url: "/recruitment",
          },
          {
            id: "org-structure",
            label: "الهيكل التنظيمي",
            page: "org-structure",
            url: "/org-structure",
          },
          {
            id: "job-descriptions",
            label: "الأوصاف الوظيفية",
            page: "job-descriptions",
            url: "/job-descriptions",
          },
        ],
      },
      {
        id: "attendance",
        label: "الحضور والرواتب",
        icon: Clock,
        subItems: [
          { id: "attendance", label: "الحضور والانصراف", page: "attendance", url: "/attendance" },
          { id: "timesheets", label: "جداول الساعات", page: "timesheets", url: "/timesheets" },
          { id: "payroll", label: "الرواتب", page: "payroll", url: "/payroll" },
          { id: "leaves", label: "الإجازات", page: "leaves", url: "/leaves" },
        ],
      },
      {
        id: "performance",
        label: "الأداء والتطوير",
        icon: Award,
        subItems: [
          { id: "performance", label: "تقييم الأداء", page: "performance", url: "/performance" },
          { id: "kpis", label: "مؤشرات الأداء", page: "kpis", url: "/kpis" },
          { id: "training", label: "التدريب", page: "training", url: "/training" },
        ],
      },
    ],
  },
  {
    id: "business",
    title: "وحدات الأعمال",
    items: [
      {
        id: "catering",
        label: "قطاع الإعاشة",
        icon: Utensils,
        subItems: [
          {
            id: "catering-contracts",
            label: "العقود",
            page: "catering-contracts",
            url: "/catering-contracts",
          },
          {
            id: "catering-operations",
            label: "التشغيل",
            page: "catering-operations",
            url: "/catering-operations",
          },
          {
            id: "catering-procurement",
            label: "المشتريات",
            page: "catering-procurement",
            url: "/catering-procurement",
          },
          { id: "catering-quality", label: "الجودة", page: "catering-quality", url: "/catering-quality" },
          {
            id: "catering-reports",
            label: "التقارير",
            page: "catering-reports",
            url: "/catering-reports",
          },
        ],
      },
      {
        id: "supply",
        label: "قطاع التوريدات",
        icon: Package,
        subItems: [
          { id: "supply-sales", label: "المبيعات", page: "supply-sales", url: "/supply-sales" },
          {
            id: "supply-purchasing",
            label: "المشتريات",
            page: "supply-purchasing",
            url: "/supply-purchasing",
          },
          {
            id: "supply-inventory",
            label: "المخزون",
            page: "supply-inventory",
            url: "/supply-inventory",
          },
          {
            id: "supply-distribution",
            label: "التوزيع",
            page: "supply-distribution",
            url: "/supply-distribution",
          },
        ],
      },
      {
        id: "construction",
        label: "قطاع المقاولات",
        icon: Building,
        badge: "5 مشاريع",
        subItems: [
          {
            id: "construction-projects",
            label: "المشاريع",
            page: "construction-projects",
            url: "/construction-projects",
          },
          {
            id: "construction-contracts",
            label: "العقود",
            page: "construction-contracts",
            url: "/construction-contracts",
          },
          {
            id: "construction-execution",
            label: "التنفيذ",
            page: "construction-execution",
            url: "/construction-execution",
          },
          {
            id: "construction-costs",
            label: "التكاليف",
            page: "construction-costs",
            url: "/construction-costs",
          },
        ],
      },
      {
        id: "marketing",
        label: "الوكالة التسويقية",
        icon: Smartphone,
        subItems: [
          {
            id: "marketing-clients",
            label: "العملاء",
            page: "marketing-clients",
            url: "/marketing-clients",
          },
          {
            id: "marketing-campaigns",
            label: "الحملات",
            page: "marketing-campaigns",
            url: "/marketing-campaigns",
          },
          {
            id: "marketing-performance",
            label: "الأداء",
            page: "marketing-performance",
            url: "/marketing-performance",
          },
        ],
      },
      {
        id: "operations",
        label: "الخدمات التشغيلية",
        icon: Settings,
        subItems: [
          { id: "ops-requests", label: "طلبات الخدمة", page: "ops-requests", url: "/ops-requests" },
          { id: "ops-scheduling", label: "الجدولة", page: "ops-scheduling", url: "/ops-scheduling" },
          { id: "ops-execution", label: "التنفيذ", page: "ops-execution", url: "/ops-execution" },
          { id: "ops-billing", label: "الفوترة", page: "ops-billing", url: "/ops-billing" },
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
          { id: "clients", label: "قاعدة العملاء", page: "clients", url: "/clients" },
          {
            id: "leads",
            label: "العملاء المحتملين",
            page: "leads",
            badge: "12",
            url: "/leads"
          },
          {
            id: "opportunities",
            label: "الفرص البيعية",
            page: "opportunities",
            url: "/opportunities"
          },
          { id: "client-contracts", label: "العقود", page: "client-contracts", url: "/client-contracts" },
        ],
      },
      {
        id: "sales-cycle",
        label: "دورة المبيعات",
        icon: TrendingUp,
        subItems: [
          { id: "quotations", label: "عروض الأسعار", page: "quotations", url: "/quotations" },
          { id: "invoices", label: "الفواتير", page: "invoices", url: "/invoices" },
          { id: "collections", label: "التحصيلات", page: "collections", url: "/collections" },
          {
            id: "sales-reports",
            label: "تقارير المبيعات",
            page: "sales-reports",
            url: "/sales-reports"
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
          { id: "projects", label: "جميع المشاريع", page: "projects", url: "/projects" },
          { id: "project-tasks", label: "المهام", page: "project-tasks", url: "/project-tasks" },
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
          { id: "project-costs", label: "التكاليف", page: "project-costs", url: "/project-costs" },
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
    id: "procurement",
    title: "المشتريات والمخازن",
    items: [
      {
        id: "purchasing",
        label: "المشتريات",
        icon: ShoppingCart,
        subItems: [
          {
            id: "purchase-requests",
            label: "طلبات الشراء",
            page: "purchase-requests",
            url: "/purchase-requests",
          },
          { id: "rfq", label: "طلبات عروض الأسعار", page: "rfq", url: "/rfq" },
          {
            id: "purchase-orders",
            label: "أوامر الشراء",
            page: "purchase-orders",
            url: "/purchase-orders",
          },
          { id: "vendors", label: "الموردين", page: "vendors", url: "/vendors" },
        ],
      },
      {
        id: "inventory",
        label: "إدارة المخزون",
        icon: Package,
        subItems: [
          { id: "inventory", label: "المخزون", page: "inventory", url: "/inventory" },
          { id: "warehouses", label: "المخازن", page: "warehouses", url: "/warehouses" },
          {
            id: "stock-movement",
            label: "حركة المخزون",
            page: "stock-movement",
            url: "/stock-movement",
          },
          {
            id: "stock-levels",
            label: "مستويات المخزون",
            page: "stock-levels",
            url: "/stock-levels",
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
          { id: "users", label: "المستخدمين", page: "users", url: "/users" },
          { id: "roles", label: "الأدوار", page: "roles", url: "/roles" },
          { id: "permissions", label: "الصلاحيات", page: "permissions", url: "/permissions" },
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
          { id: "audit-logs", label: "سجلات المراجعة", page: "audit-logs", url: "/audit-logs" },
          { id: "workflows", label: "سير العمل", page: "workflows", url: "/workflows" },
          { id: "notifications", label: "الإشعارات", page: "notifications", url: "/notifications" },
        ],
      },
    ],
  },
];
