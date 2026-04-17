import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./MainSidebar";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#F5F1E8] to-[#EBE7DC] relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#B8976B]/30 flex items-center justify-between px-4 z-20 md:hidden shadow-sm">
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="p-2 rounded-lg text-[#1B5E4F] hover:bg-[#EBE7DC] transition-colors"
          aria-label="Toggle menu"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span
              className={`block h-0.5 bg-[#1B5E4F] rounded transition-all duration-300 origin-center ${sidebarOpen ? "rotate-45 translate-y-[7px]" : ""}`}
            />
            <span
              className={`block h-0.5 bg-[#1B5E4F] rounded transition-all duration-300 ${sidebarOpen ? "opacity-0 scale-x-0" : ""}`}
            />
            <span
              className={`block h-0.5 bg-[#1B5E4F] rounded transition-all duration-300 origin-center ${sidebarOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
            />
          </div>
        </button>

        <h1 className="text-base font-bold bg-gradient-to-r from-[#0F4F3E] to-[#1B5E4F] bg-clip-text text-transparent">
          استدامة العطاء الدولية
        </h1>

        <div className="w-9" />
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 h-full overflow-y-auto p-3 transition-all duration-300 ease-in-out pt-16 md:pt-3 md:mr-80">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
