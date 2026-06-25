import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminDashboard from "./components/Admin/AdminDashboard";
import ManageCoupons from "./components/Admin/Coupons/ManageCoupons";
import AddCoupon from "./components/Admin/Coupons/AddCoupon";
import Login from "./components/Users/Forms/Login";
import AddProduct from "./components/Admin/Products/AddProduct";
import RegisterForm from "./components/Users/Forms/RegisterForm";
import HomePage from "./components/HomePage/HomePage";
import AboutPage from "./components/HomePage/AboutPage";
import CancellationPolicyPage from "./components/HomePage/CancellationPolicyPage";
import ReturnRefundPolicyPage from "./components/HomePage/ReturnRefundPolicyPage";
import Navbar from "./components/Navbar/Navbar";
import OrderPayment from "./components/Users/Products/OrderPayment";
import ManageCategories from "./components/Admin/Categories/ManageCategories";
import ManageStocks from "./components/Admin/Products/ManageStocks";
import AddCategory from "./components/Admin/Categories/AddCategory";
import AddBrand from "./components/Admin/Categories/AddBrand";
import AddColor from "./components/Admin/Categories/AddColor";
import AllCategories from "./components/HomePage/AllCategories";
import UpdateCoupon from "./components/Admin/Coupons/UpdateCoupon";
import Product from "./components/Users/Products/Product";
import ShoppingCart from "./components/Users/Products/ShoppingCart";
import ProductsFilters from "./components/Users/Products/ProductsFilters";
import CustomerProfile from "./components/Users/Profile/CustomerProfile";
import AddReview from "./components/Users/Reviews/AddReview";
import UpdateCategory from "./components/Admin/Categories/UpdateCategory";
import OrdersList from "./components/Admin/Orders/OdersList";
import AllOrders from "./components/Admin/Orders/AllOrders";
import Customers from "./components/Admin/Orders/Customers";
import BrandsList from "./components/Admin/Categories/BrandsList";
import AuthRoute from "./components/AuthRoute/AuthRoute";
import AdminRoutes from "./components/AuthRoute/AdminRoutes";
import ThanksForOrdering from "./components/Users/Products/ThanksForOrdering";
import ChatUsagePanel from "./components/Admin/Analytics/ChatUsagePanel";
import ProductUpdate from "./components/Admin/Products/ProductUpdate";
import UpdateOrders from "./components/Admin/Orders/UpdateOrders";
import ManageReturns from "./components/Admin/Orders/ManageReturns";
import ColorsList from "./components/Admin/Categories/ColorsList";
import ChatWidget from "./components/ChatBot/ChatWidget";
import AssistantPage from "./components/ChatBot/AssistantPage";
import ForgotPassword from "./components/Users/Forms/ForgotPassword";
import SiteFooter from "./components/Layout/SiteFooter";
import DeveloperAnalyticsLayout from "./components/Admin/Analytics/DeveloperAnalyticsLayout";
import InferencePanel from "./components/Admin/Analytics/InferencePanel";
import ChatbotEvalPanel from "./components/Admin/Analytics/ChatbotEvalPanel";
import NotFoundPage from "./components/NotFound/NotFoundPage";

function AppShell() {
  const location = useLocation();
  const isAssistant = location.pathname === "/assistant";
  const isAdmin = location.pathname.startsWith("/admin");
  const hideFloatingChat =
    isAssistant ||
    location.pathname.startsWith("/admin/developer-analytics");
  // The assistant and the admin console are full-screen, app-like experiences
  // (à la ChatGPT/Claude). They supply their own header + sidebar, so the global
  // chrome is hidden there to avoid the awkward double-navbar / double-hamburger.
  const hideGlobalChrome = isAssistant || isAdmin;

  return (
    <div className="flex min-h-screen flex-col">
      {!hideGlobalChrome && <Navbar />}
      <main className="flex-1">
        <Routes>
        {/* admin route */}
        <Route
          path="admin"
          element={
            <AdminRoutes>
              <AdminDashboard />
            </AdminRoutes>
          }
        >
          {/* products */}
          <Route
            path=""
            element={
              <AdminRoutes>
                <OrdersList />
              </AdminRoutes>
            }
          />
          <Route
            path="all-orders"
            element={
              <AdminRoutes>
                <AllOrders />
              </AdminRoutes>
            }
          />
          <Route
            path="return-requests"
            element={
              <AdminRoutes>
                <ManageReturns />
              </AdminRoutes>
            }
          />
          <Route
            path="add-product"
            element={
              <AdminRoutes>
                <AddProduct />
              </AdminRoutes>
            }
          />
          <Route
            path="manage-products"
            element={
              <AdminRoutes>
                <ManageStocks />
              </AdminRoutes>
            }
          />
          <Route
            path="products/edit/:id"
            element={
              <AdminRoutes>
                <ProductUpdate />
              </AdminRoutes>
            }
          />
          {/* coupons */}
          <Route
            path="add-coupon"
            element={
              <AdminRoutes>
                <AddCoupon />
              </AdminRoutes>
            }
          />
          <Route path="manage-coupon" element={<AdminRoutes><ManageCoupons /></AdminRoutes>} />
          <Route
            path="manage-coupon/edit/:code"
            element={
              <AdminRoutes>
                <UpdateCoupon />
              </AdminRoutes>
            }
          />
          {/* Category */}
          <Route
            path="category-to-add"
            element={<Navigate to="/admin/add-category" replace />}
          />
          <Route path="add-category" element={<AdminRoutes><AddCategory /></AdminRoutes>} />
          <Route
            path="manage-category"
            element={
              <AdminRoutes>
                <ManageCategories />
              </AdminRoutes>
            }
          />
          <Route
            path="edit-category/:id"
            element={
              <AdminRoutes>
                <UpdateCategory />
              </AdminRoutes>
            }
          />
          {/* brand category */}
          <Route
            path="add-brand"
            element={
              <AdminRoutes>
                <AddBrand />
              </AdminRoutes>
            }
          />
          <Route path="all-brands" element={<AdminRoutes><BrandsList /></AdminRoutes>} />
          {/* color category */}
          <Route
            path="add-color"
            element={
              <AdminRoutes>
                <AddColor />
              </AdminRoutes>
            }
          />
          <Route path="all-colors" element={<AdminRoutes><ColorsList /></AdminRoutes>} />
          {/* Orders */}
          <Route
            path="orders/:id"
            element={
              <AdminRoutes>
                <UpdateOrders />
              </AdminRoutes>
            }
          />
          <Route
            path="customers"
            element={
              <AdminRoutes>
                <Customers />
              </AdminRoutes>
            }
          />
        </Route>
        <Route
          path="admin/developer-analytics"
          element={
            <AdminRoutes>
              <DeveloperAnalyticsLayout />
            </AdminRoutes>
          }
        >
          <Route index element={<Navigate to="inference" replace />} />
          <Route path="inference" element={<InferencePanel />} />
          <Route path="chat-eval" element={<ChatbotEvalPanel />} />
          <Route path="chat-usage" element={<ChatUsagePanel />} />
        </Route>
        {/* public links */}
        {/* Products */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/cancellation-policy" element={<CancellationPolicyPage />} />
        <Route path="/return-refund-policy" element={<ReturnRefundPolicyPage />} />
        <Route path="/products-filters" element={<ProductsFilters />} />
        <Route path="/products/:id" element={<Product />} />
        <Route path="/all-categories" element={<AllCategories />} />
        <Route
          path="/success"
          element={
            <AuthRoute>
              <ThanksForOrdering />
            </AuthRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <AuthRoute>
              <AssistantPage />
            </AuthRoute>
          }
        />
        {/* review */}
        <Route
          path="/add-review/:id"
          element={
            <AuthRoute>
              <AddReview />
            </AuthRoute>
          }
        />

        {/* shopping cart */}
        <Route path="/shopping-cart" element={<ShoppingCart />} />
        <Route
          path="/order-payment"
          element={
            <AuthRoute>
              <OrderPayment />
            </AuthRoute>
          }
        />
        {/* users */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/customer-profile"
          element={
            <AuthRoute>
              <CustomerProfile />
            </AuthRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </main>
      {!hideGlobalChrome && <SiteFooter />}
      {!hideFloatingChat && <ChatWidget />}
    </div>
  );
}

const App = () => (
  <BrowserRouter>
    <AppShell />
  </BrowserRouter>
);

export default App;
