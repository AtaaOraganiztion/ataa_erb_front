import { Outlet } from "react-router-dom";
import Sidebar from "./Mainsidebar";

const Layout = () => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 mr-75 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
