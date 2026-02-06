import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/home/Home";

import NotFound from "./pages/NotFound";
import Error from "./pages/Error";
import Layout from "./components/layout/Layout";

export const router = createBrowserRouter([
  { path: "*", element: <NotFound /> },

  {
    path: "/",
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
    ],
  },
]);
