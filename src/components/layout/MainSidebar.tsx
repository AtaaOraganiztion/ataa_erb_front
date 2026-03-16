import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import { NAV_CONFIG, type SubItem } from "../../lib/utiltis";
import logo from "../../assets/Logo2.jpg";
import { useAuth } from "../../context/AuthContext";

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MainSidebar = ({ isOpen, onClose }: ModernSidebarProps) => {
  const [activePage, setActivePage] = useState("dashboard");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

  const navigate = useNavigate();
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
    parentId,
  }: {
    item: any;
    isSubItem?: boolean;
    parentId?: string;
  }) => {
    const Icon = item.icon;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems[item.id];
    const isActive = activePage === item.page;

    const handleClick = () => {
      if (hasSubItems) {
        toggleExpanded(item.id);
        return;
      }

      if (item.url) {
        setActivePage(item.page || item.id);

        // collapse parent when sub item clicked
        if (isSubItem && parentId) {
          setExpandedItems((prev) => ({
            ...prev,
            [parentId]: false,
          }));
        }

        navigate(item.url);
        onClose();
      }
    };

    return (
      <div className="mb-1">
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl
            transition-all duration-300 group relative overflow-hidden
            ${
              isActive
                ? "bg-gradient-to-r from-[#1B5E4F] to-[#0F4F3E] text-white shadow-lg"
                : "text-[#4A4A4A] hover:bg-gradient-to-r hover:from-[#EBE7DC] hover:to-[#F5F1E8]"
            }
            ${isSubItem ? "pr-8 text-sm" : ""}
          `}
        >
          {isActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#B8976B] rounded-l-full" />
          )}

          <div className="flex items-center gap-3 flex-1 relative z-10">
            {Icon && (
              <div
                className={`p-1.5 rounded-lg ${
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

            <span
              className={`flex-1 text-right font-semibold ${
                isActive ? "text-white" : ""
              }`}
            >
              {item.label}
            </span>
          </div>

          {hasSubItems && (
            <div
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
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
        </button>

        {hasSubItems && isExpanded && item.subItems && (
          <div className="mr-6 mt-1 space-y-1 border-r-2 border-[#B8976B]/30 pr-2">
            {item.subItems.map((subItem: SubItem) => (
              <NavItem
                key={subItem.id}
                item={subItem}
                isSubItem={true}
                parentId={item.id}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl">
      <div
        className={`bg-white border-l-2 border-[#B8976B]/30 shadow-2xl
        transition-all duration-300 ease-in-out w-80
        overflow-y-auto overflow-x-hidden
        h-screen fixed right-0 top-0 z-40
        md:translate-x-0
        ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col min-h-full relative z-10">
          {/* Header */}
          <div className="p-6 border-b-2 border-[#B8976B]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full shadow-lg">
                  <img
                    src={logo}
                    className="w-full h-full object-cover rounded-full"
                    alt="Logo"
                  />
                </div>

                <div>
                  <h1 className="text-xl font-bold text-[#1B5E4F]">
                    استدامة العطاء الدولية
                  </h1>
                  <p className="text-xs text-[#4A4A4A]">
                    لوحة التحكم الشاملة
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-[#EBE7DC]"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 pb-6">
            {NAV_CONFIG.map((category) => (
              <div key={category.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-3">
                  <div className="w-8 h-px bg-gradient-to-r from-[#B8976B] to-transparent" />
                  <h3 className="text-xs font-bold text-[#1B5E4F] uppercase">
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

          {/* Profile */}
          <div className="border-t-2 border-[#B8976B]/20 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-[#1B5E4F] flex items-center justify-center text-white">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-[#1B5E4F]">
                      {user.fullName ?? user.email}
                    </p>
                    <p className="text-xs text-[#4A4A4A]">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-red-500 text-white hover:bg-red-600 transition"
                >
                  <LogOut size={18} />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainSidebar;