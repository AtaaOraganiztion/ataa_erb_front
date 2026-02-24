import { useState } from "react";
import {
    Search,
    Filter,
    Mail,
    Phone,
    MapPin,
    Calendar,
    DollarSign,
    Briefcase,
    Building2,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    UserPlus,
    Download,
    ChevronDown
} from "lucide-react";

// نوع بيانات الموظف
interface Employee {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    department: string;
    departmentName: string;
    position: string;
    salary: number;
    hireDate: string;
    status: 'active' | 'inactive' | 'vacation';
    contractType: 'permanent' | 'temporary' | 'contract';
    address: string;
}

const EmployeesPage = () => {
    // بيانات الموظفين
    const [employees] = useState<Employee[]>([
        {
            id: 1,
            firstName: 'أحمد',
            lastName: 'محمد',
            email: 'ahmed@example.com',
            phone: '0501234567',
            department: 'catering',
            departmentName: 'قطاع الإعاشة',
            position: 'مدير العمليات',
            salary: 12000,
            hireDate: '2023-01-15',
            status: 'active',
            contractType: 'permanent',
            address: 'الرياض، المملكة العربية السعودية'
        },
        {
            id: 2,
            firstName: 'فاطمة',
            lastName: 'علي',
            email: 'fatima@example.com',
            phone: '0502345678',
            department: 'hr',
            departmentName: 'الموارد البشرية',
            position: 'مدير الموارد البشرية',
            salary: 15000,
            hireDate: '2022-03-20',
            status: 'active',
            contractType: 'permanent',
            address: 'جدة، المملكة العربية السعودية'
        },
        {
            id: 3,
            firstName: 'محمد',
            lastName: 'خالد',
            email: 'mohammed@example.com',
            phone: '0503456789',
            department: 'finance',
            departmentName: 'المالية',
            position: 'محاسب',
            salary: 8000,
            hireDate: '2023-06-10',
            status: 'vacation',
            contractType: 'permanent',
            address: 'الدمام، المملكة العربية السعودية'
        },
        {
            id: 4,
            firstName: 'سارة',
            lastName: 'حسن',
            email: 'sara@example.com',
            phone: '0504567890',
            department: 'catering',
            departmentName: 'قطاع الإعاشة',
            position: 'طاهي رئيسي',
            salary: 9000,
            hireDate: '2023-02-28',
            status: 'active',
            contractType: 'contract',
            address: 'مكة المكرمة، المملكة العربية السعودية'
        },
        {
            id: 5,
            firstName: 'عبدالله',
            lastName: 'أحمد',
            email: 'abdullah@example.com',
            phone: '0505678901',
            department: 'it',
            departmentName: 'تقنية المعلومات',
            position: 'مطور برمجيات',
            salary: 11000,
            hireDate: '2022-11-05',
            status: 'active',
            contractType: 'permanent',
            address: 'الرياض، المملكة العربية السعودية'
        },
        {
            id: 6,
            firstName: 'نورة',
            lastName: 'سعيد',
            email: 'noura@example.com',
            phone: '0506789012',
            department: 'marketing',
            departmentName: 'التسويق',
            position: 'منسقة تسويق',
            salary: 7500,
            hireDate: '2023-04-12',
            status: 'inactive',
            contractType: 'temporary',
            address: 'جدة، المملكة العربية السعودية'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    // الحصول على الأقسام الفريدة
    const departments = Array.from(new Set(employees.map(emp => emp.departmentName)));

    // تصفية الموظفين
    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.position.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = selectedDepartment === "all" || employee.departmentName === selectedDepartment;
        const matchesStatus = selectedStatus === "all" || employee.status === selectedStatus;

        return matchesSearch && matchesDepartment && matchesStatus;
    });

    // دالة للحصول على لون الحالة
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 border-green-300';
            case 'inactive':
                return 'bg-red-100 text-red-700 border-red-300';
            case 'vacation':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300';
        }
    };

    // دالة للحصول على نص الحالة
    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'نشط';
            case 'inactive': return 'غير نشط';
            case 'vacation': return 'في إجازة';
            default: return status;
        }
    };

    // دالة للحصول على نوع العقد
    const getContractTypeText = (type: string) => {
        switch (type) {
            case 'permanent': return 'دائم';
            case 'temporary': return 'مؤقت';
            case 'contract': return 'عقد';
            default: return type;
        }
    };

    return (
        <div className="min-h-screen  " dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#1B5E4F] to-[#0F4F3E] bg-clip-text text-transparent mb-2">
                                إدارة الموظفين
                            </h1>
                            <p className="text-[#4A4A4A]">
                                إجمالي الموظفين: <span className="font-bold text-[#1B5E4F]">{filteredEmployees.length}</span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-[#B8976B] text-[#1B5E4F] rounded-xl hover:bg-[#F5F1E8] transition-all duration-300 shadow-md hover:shadow-lg">
                                <Download size={20} />
                                <span className="font-semibold">تصدير</span>
                            </button>
                            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl hover:shadow-xl transition-all duration-300 shadow-md">
                                <UserPlus size={20} />
                                <span className="font-semibold">إضافة موظف</span>
                            </button>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-[#B8976B]/20 p-6">
                        <div className="flex gap-4 items-center flex-wrap">
                            {/* Search Bar */}
                            <div className="flex-1 min-w-[300px] relative">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B8976B]" size={20} />
                                <input
                                    type="text"
                                    placeholder="البحث عن موظف..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pr-12 pl-4 py-3 border-2 border-[#B8976B]/30 rounded-xl
                    focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/20
                    outline-none transition-all duration-300"
                                />
                            </div>

                            {/* Filter Button */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all duration-300 ${showFilters
                                        ? 'bg-[#1B5E4F] text-white border-[#1B5E4F]'
                                        : 'bg-white text-[#1B5E4F] border-[#B8976B]/30 hover:border-[#1B5E4F]'
                                    }`}
                            >
                                <Filter size={20} />
                                <span className="font-semibold">تصفية</span>
                            </button>
                        </div>

                        {/* Filters Dropdown */}
                        {showFilters && (
                            <div className="mt-4 pt-4 border-t-2 border-[#B8976B]/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Department Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#1B5E4F] mb-2">القسم</label>
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-[#B8976B]/30 rounded-xl
                      focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/20
                      outline-none transition-all duration-300"
                                    >
                                        <option value="all">جميع الأقسام</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#1B5E4F] mb-2">الحالة</label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-[#B8976B]/30 rounded-xl
                      focus:border-[#1B5E4F] focus:ring-2 focus:ring-[#1B5E4F]/20
                      outline-none transition-all duration-300"
                                    >
                                        <option value="all">جميع الحالات</option>
                                        <option value="active">نشط</option>
                                        <option value="inactive">غير نشط</option>
                                        <option value="vacation">في إجازة</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Employees Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((employee) => (
                        <div
                            key={employee.id}
                            className="bg-white rounded-2xl shadow-lg border-2 border-[#B8976B]/20 overflow-hidden
                hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B8976B] to-[#9A7D5B] 
                      flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                                {employee.firstName} {employee.lastName}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(employee.status)}`}>
                                                    {getStatusText(employee.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === employee.id ? null : employee.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
                                        >
                                            <MoreVertical className="text-white" size={20} />
                                        </button>

                                        {activeDropdown === employee.id && (
                                            <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border-2 border-[#B8976B]/20 overflow-hidden z-20">
                                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F1E8] transition-all text-right">
                                                    <Eye size={16} className="text-[#1B5E4F]" />
                                                    <span className="text-sm font-semibold text-[#1B5E4F]">عرض التفاصيل</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F1E8] transition-all text-right">
                                                    <Edit size={16} className="text-blue-600" />
                                                    <span className="text-sm font-semibold text-blue-600">تعديل</span>
                                                </button>
                                                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-all text-right">
                                                    <Trash2 size={16} className="text-red-600" />
                                                    <span className="text-sm font-semibold text-red-600">حذف</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 space-y-4">
                                {/* Position & Department */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[#1B5E4F]">
                                        <Briefcase size={16} className="text-[#B8976B]" />
                                        <span className="font-semibold text-sm">{employee.position}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                                        <Building2 size={16} className="text-[#B8976B]" />
                                        <span className="text-sm">{employee.departmentName}</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-[#B8976B]/30 to-transparent"></div>

                                {/* Contact Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                                        <Mail size={16} className="text-[#B8976B]" />
                                        <span className="text-sm truncate">{employee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                                        <Phone size={16} className="text-[#B8976B]" />
                                        <span className="text-sm" dir="ltr">{employee.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                                        <MapPin size={16} className="text-[#B8976B]" />
                                        <span className="text-sm">{employee.address}</span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gradient-to-r from-transparent via-[#B8976B]/30 to-transparent"></div>

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center gap-1 text-[#B8976B] mb-1">
                                            <Calendar size={14} />
                                            <span className="text-xs font-semibold">تاريخ التعيين</span>
                                        </div>
                                        <p className="text-sm font-semibold text-[#1B5E4F]">
                                            {new Date(employee.hireDate).toLocaleDateString('ar-SA')}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-[#B8976B] mb-1">
                                            <DollarSign size={14} />
                                            <span className="text-xs font-semibold">الراتب</span>
                                        </div>
                                        <p className="text-sm font-semibold text-[#1B5E4F]">
                                            {employee.salary.toLocaleString('ar-SA')} ريال
                                        </p>
                                    </div>
                                </div>

                                {/* Contract Type */}
                                <div className="pt-2">
                                    <span className="inline-block px-3 py-1 bg-[#F5F1E8] text-[#1B5E4F] text-xs font-semibold rounded-lg border border-[#B8976B]/20">
                                        نوع العقد: {getContractTypeText(employee.contractType)}
                                    </span>
                                </div>
                            </div>

                            {/* Card Footer - Hover Action */}
                            <div className="px-6 pb-6">
                                <button className="w-full py-3 bg-gradient-to-r from-[#1B5E4F] to-[#0F4F3E] text-white rounded-xl
                  font-semibold hover:shadow-lg transition-all duration-300
                  opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0">
                                    عرض الملف الكامل
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results */}
                {filteredEmployees.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                            <Search className="text-[#B8976B]" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#1B5E4F] mb-2">لا توجد نتائج</h3>
                        <p className="text-[#4A4A4A]">لم يتم العثور على موظفين مطابقين لمعايير البحث</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeesPage;