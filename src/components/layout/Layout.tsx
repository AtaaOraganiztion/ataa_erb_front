import { Outlet } from "react-router-dom";
import Sidebar from "./MainSidebar";


const Layout = () => {


  return (
    <div className="flex h-screen bg-linear-to-br from-[#F5F1E8] to-[#EBE7DC] relative">



      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={`flex-1 h-full overflow-y-auto p-3  mr-78
        transition-all duration-300 ease-in-out`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
