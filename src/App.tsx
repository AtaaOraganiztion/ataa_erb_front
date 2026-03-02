import { RouterProvider } from "react-router-dom";
import { router } from "./route";
import AuthContextProvider from "../src/context/AuthContext";
const App = () => {
  return (
    <AuthContextProvider>
      <RouterProvider router={router} />
    </AuthContextProvider>
  );
};

export default App;
