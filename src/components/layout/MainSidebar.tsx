import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import {
  NAV_CONFIG,
  type SubItem,
  hasAccess,
  type UserRole,
} from "../../lib/utiltis";
import logo from "../../assets/Logo2.jpg";
import { useAuth } from "../../context/AuthContext";

interface ModernSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MainSidebar = ({ isOpen, onClose }: ModernSidebarProps) => {
  const [activePage, setActivePage] = useState("dashboard");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const userRoles = (user?.roles || []) as UserRole[];

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

  const filteredNav = NAV_CONFIG.filter((category) =>
    hasAccess(userRoles, category.roles),
  )
    .map((category) => ({
      ...category,
      items: category.items
        .filter((item) => hasAccess(userRoles, item.roles))
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter((sub) =>
            hasAccess(userRoles, sub.roles),
          ),
        }))
        .filter((item) => !item.subItems || item.subItems.length > 0),
    }))
    .filter((category) => category.items.length > 0);

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
    const isActive = activePage === (item.page || item.id);

    const handleClick = () => {
      if (hasSubItems) {
        toggleExpanded(item.id);
        return;
      }

      if (item.url) {
        setActivePage(item.page || item.id);

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
          transition-all duration-200 ease-out group relative
          ${
            isActive
              ? "bg-brand-primary text-white"
              : "text-brand-text hover:bg-brand-soft"
          }
          ${isSubItem ? "pr-8 text-sm" : ""}
        `}
        >
          {isActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-brand-accent rounded-l-full" />
          )}

          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <div
                className={`p-1.5 rounded-lg transition
                ${
                  isActive
                    ? "bg-white/20"
                    : "bg-brand-primary/5 group-hover:bg-brand-primary/10"
                }`}
              >
                <Icon
                  size={isSubItem ? 16 : 18}
                  className={isActive ? "text-white" : "text-brand-primary"}
                />
              </div>
            )}

            <span className="flex-1 text-right font-medium tracking-wide">
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
                  className={isActive ? "text-white" : "text-brand-accent"}
                />
              ) : (
                <ChevronRight
                  size={16}
                  className={isActive ? "text-white" : "text-brand-accent"}
                />
              )}
            </div>
          )}
        </button>

        {hasSubItems && isExpanded && item.subItems && (
          <div className="mr-6 mt-1 space-y-1 border-r border-brand-accent/30 pr-2">
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
        className={`bg-brand-bg border-l border-brand-accent/30 shadow-xl
        transition-all duration-300 ease-in-out w-80
        overflow-y-auto h-screen fixed right-0 top-0 z-40
        ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col min-h-full">
          {/* Header */}
          <div className="p-6 border-b border-brand-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-brand-soft flex items-center justify-center shadow-sm">
                  <img
                    src={logo}
                    className="w-10 h-10 object-contain"
                    alt="Logo"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-bold text-brand-primary">
                    مؤسسة مانح المميزة
                  </h1>
                  <p className="text-xs text-brand-subtext">
                    لوحة التحكم الشاملة
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-brand-soft"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 pb-6">
            {filteredNav.length === 0 ? (
              <div className="text-center py-10 text-brand-subtext">
                لا توجد صلاحيات لعرض القائمة
              </div>
            ) : (
              filteredNav.map((category) => (
                <div key={category.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3 px-3">
                    <div className="w-6 h-[2px] bg-brand-accent/60 rounded-full" />
                    <h3 className="text-[11px] font-semibold text-brand-accent tracking-widest">
                      {category.title}
                    </h3>
                  </div>

                  <div className="space-y-1">
                    {category.items.map((item) => (
                      <NavItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Profile */}
          <div className="border-t border-brand-accent/20 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-brand-soft rounded-2xl border border-brand-accent/20">
                  <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-primary truncate">
                      {user.fullName ?? user.email}
                    </p>
                    <p className="text-xs text-brand-subtext truncate">
                      {user.email}
                    </p>
                    {user.roles && (
                      <p className="text-[10px] text-brand-accent mt-0.5">
                        {user.roles.join(" • ")}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  bg-brand-primary text-white hover:bg-brand-primaryDark transition"
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
