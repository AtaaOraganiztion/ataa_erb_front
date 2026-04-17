import { RouterProvider } from "react-router-dom";
import { router } from "./route";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();
// import ClockInDeviceTest from "./components/ClockInDeviceTest";
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
    // <ClockInDeviceTest />
  );
};

export default App;
