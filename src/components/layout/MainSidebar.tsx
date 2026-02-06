import React, { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { NAV_CONFIG, type NavItem } from "../../lib/utiltis";
import { Link } from "react-router-dom";

const ModernSidebar: React.FC = () => {
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const toggleExpanded = (itemId: string): void => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  interface NavItemProps {
    item: NavItem;
    isSubItem?: boolean;
  }

  const NavItem: React.FC<NavItemProps> = ({ item, isSubItem = false }) => {
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
            w-full flex items-center justify-between px-3 py-2.5 rounded-lg
            transition-all duration-200 group
            ${
              isActive
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-100"
            }
            ${isSubItem ? "pr-8 text-sm" : ""}
          `}
        >
          <div className="flex items-center gap-3 flex-1">
            {Icon && (
              <Icon
                size={isSubItem ? 16 : 18}
                className={
                  isActive
                    ? "text-white"
                    : "text-gray-500 group-hover:text-blue-600"
                }
              />
            )}
            <Link to={item.url || "#"} className="flex-1 text-right">
              <span className={`font-medium ${isActive ? "text-white" : ""}`}>
                {item.label}
              </span>
            </Link>
          </div>
          {hasSubItems && (
            <div
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              {isExpanded ? (
                <ChevronDown
                  size={16}
                  className={isActive ? "text-white" : "text-gray-400"}
                />
              ) : (
                <ChevronRight
                  size={16}
                  className={isActive ? "text-white" : "text-gray-400"}
                />
              )}
            </div>
          )}
        </button>

        {hasSubItems && isExpanded && item.subItems && (
          <div className="mr-6 mt-1 space-y-1 border-r-2 border-gray-200 pr-2">
            {item?.subItems.map((subItem: any) => (
              <NavItem key={subItem.id} item={subItem} isSubItem={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden " dir="rtl">
      {/* Sidebar */}
      <div
        className={`
          bg-white border-l border-gray-200 shadow-lg
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "w-72" : "w-0"}
          overflow-y-auto overflow-x-hidden
          h-screen fixed right-0 top-0
        `}
      >
        <div className="flex flex-col min-h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  إستدامة العطاء الدولية
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  لوحة التحكم الشاملة
                </p>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 pb-6">
            {NAV_CONFIG.map((category) => (
              <div key={category.id} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar;
