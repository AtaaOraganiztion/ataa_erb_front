import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/home/Home";
import NotFound from "./pages/NotFound";
import Error from "./pages/Error";
import Layout from "./components/layout/Layout";
import AuthWrapper from "./components/layout/AuthWrapper";
import { NAV_CONFIG } from "./lib/utiltis";
import LoginPage from "./pages/Auth/Login";

const DynamicPage = ({ title }: { title: string }) => <div>Page: {title}</div>;

const generateRoutes = () => {
  const routes: any[] = [];

  NAV_CONFIG.forEach((category) => {
    category.items.forEach((item: any) => {
      if (item.url) {
        routes.push({
          path: item.url,
          element: item.component ? item.component : <DynamicPage title={item.label} />,
        });
      }
      if (item.subItems) {
        item.subItems.forEach((sub: any) => {
          routes.push({
            path: sub.url,
            element: sub.component ? sub.component : <DynamicPage title={sub.label} />,
          });
        });
      }
    });
  });

  return routes;
};

export const router = createBrowserRouter([
  {
    element: <AuthWrapper />,       
    errorElement: <Error />,
    children: [
      { path: "/", element: <Home /> },          
      {
        path: "/",
        element: <Layout />,                
        children: generateRoutes(),
      },
      { path: "/login", element: <LoginPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);