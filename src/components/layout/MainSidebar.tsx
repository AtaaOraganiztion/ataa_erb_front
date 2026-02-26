import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
} from "lucide-react";
import { NAV_CONFIG, type SubItem } from "../../lib/utiltis";
import logo from "../../assets/Logo2.jpg";
import { useAuth } from "../../context/AuthContext";

const ModernSidebar = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const { user, logout } = useAuth();

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const NavItem = ({
    item,
    isSubItem = false,
  }: {
    item: any;
    isSubItem?: boolean;
  }) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.id];
    const isActive = activePage === item.page;

    return (
      <div className="mb-1">
        <button
          onClick={() => {
            if (hasSubItems) {
              toggleExpanded(item.id);
            } else if (item.page) {
              setActivePage(item.page);
            }
          }}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-xl
            transition-all duration-300 group relative overflow-hidden
            ${
              isActive
                ? "bg-gradient-to-r from-[#1B5E4F] to-[#0F4F3E] text-white shadow-lg shadow-[#1B5E4F]/30"
                : "text-[#4A4A4A] hover:bg-gradient-to-r hover:from-[#EBE7DC] hover:to-[#F5F1E8]"
            }
            ${isSubItem ? "pr-8 text-sm" : ""}
          `}
        >
          {/* زخرفة جانبية */}
          {isActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#B8976B] rounded-l-full"></div>
          )}

          <div className="flex items-center gap-3 flex-1 relative z-10">
            {Icon && (
              <div
                className={`p-1.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-white/20"
                    : "bg-[#B8976B]/10 group-hover:bg-[#B8976B]/20"
                }`}
              >
                <Icon
                  size={isSubItem ? 16 : 18}
                  className={
                    isActive
                      ? "text-white"
                      : "text-[#1B5E4F] group-hover:text-[#0F4F3E]"
                  }
                />
              </div>
            )}
            <Link to={item.url || "#"} className="flex-1 text-right">
              <span className={`font-semibold ${isActive ? "text-white" : ""}`}>
                {item.label}
              </span>
            </Link>
          </div>

          {hasSubItems && (
            <div className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              {isExpanded ? (
                <ChevronDown
                  size={16}
                  className={isActive ? "text-white" : "text-[#B8976B]"}
                />
              ) : (
                <ChevronRight
                  size={16}
                  className={isActive ? "text-white" : "text-[#B8976B]"}
                />
              )}
            </div>
          )}

          {/* Hover effect */}
          {!isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#B8976B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          )}
        </button>

        {hasSubItems && isExpanded && item.subItems && (
          <div className="mr-6 mt-1 space-y-1 border-r-2 border-[#B8976B]/30 pr-2">
            {item.subItems.map((subItem: SubItem) => (
              <NavItem key={subItem.id} item={subItem} isSubItem={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F5F1E8] overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <div
        className="bg-white border-l-2 border-[#B8976B]/30 shadow-2xl
          transition-all duration-300 ease-in-out w-80
          overflow-y-auto overflow-x-hidden
          h-screen fixed right-0 top-0"
      >
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-[#1B5E4F]/5 to-transparent pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-full h-32 bg-gradient-to-tl from-[#B8976B]/5 to-transparent pointer-events-none"></div>

        <div className="flex flex-col min-h-full relative z-10">
          {/* Header */}
          <div className="p-6 border-b-2 border-[#B8976B]/20 bg-gradient-to-br from-white to-[#F5F1E8]/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-[#B8976B]/20 rounded-tr-lg"></div>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg">
                  <img
                    src={logo}
                    className="overflow-hidden w-full h-full object-cover rounded-full"
                    alt="Logo"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-[#0F4F3E] to-[#1B5E4F] bg-clip-text text-transparent whitespace-nowrap">
                    استدامة العطاء الدولية
                  </h1>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">
                    لوحة التحكم الشاملة
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B8976B] to-transparent"></div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 pb-6">
            {NAV_CONFIG.map((category) => (
              <div key={category.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-3">
                  <div className="w-8 h-px bg-gradient-to-r from-[#B8976B] to-transparent"></div>
                  <h3 className="text-xs font-bold text-[#1B5E4F] uppercase tracking-wider">
                    {category.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        <div className="border-t-2 border-[#B8976B]/20 bg-gradient-to-br from-[#F5F1E8]/50 to-white p-4">
          {user && (
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-[#B8976B]/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1B5E4F] to-[#0F4F3E] flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1B5E4F] truncate">
                    {user.fullName ?? user.email}
                  </p>
                  <p className="text-xs text-[#4A4A4A] truncate">
                    {user.email}
                  </p>
                  {user.roles.length > 0 && (
                    <p className="text-xs text-[#B8976B] truncate mt-0.5">
                      {user.roles[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-gradient-to-r from-red-500 to-red-600 text-white
                  hover:from-red-600 hover:to-red-700
                  transition-all duration-300 shadow-md hover:shadow-lg
                  group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <LogOut size={18} className="relative z-10" />
                <span className="font-semibold relative z-10">تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar;