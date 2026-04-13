import { Outlet } from "react-router-dom";
import AuthContextProvider from "../../context/AuthContext";

const AuthWrapper = () => (
  <AuthContextProvider>
    <Outlet />
  </AuthContextProvider>
);

export default AuthWrapper;
