import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <>
      <main className="flex-1 w-full  min-h-screen">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
