import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/users/common/Navbar.jsx";
import Footer from "./components/users/common/Footer.jsx";

import Register from "./components/pages/Register.jsx";
import VerifyOTP from "./components/pages/Otp.jsx";
import Login from "./components/pages/Login.jsx";
import Profile from "./components/pages/Profile.jsx";
import DonateTrees from "./components/pages/DonateTrees.jsx";
import Dashboard from "./components/pages/Dashboard.jsx";
import OrderTracking from "./components/pages/OrderTracking.jsx";
import Certificate from "./components/pages/Certificate.jsx";
import LandingPage from "./components/users/landingPage/LandingPage.jsx";
import ImpactPage from "./components/users/landingPage/ImpactPage.jsx";

const AUTH_STORAGE_KEY = "gogreen_user";

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(loadStoredUser);
  const location = useLocation();
  const isAuthenticated = Boolean(user);
  const isCertificateRoute = location.pathname.startsWith("/certificate/");

  const persistUser = (userData) => {
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  };

  const handleLogin = (userData) => {
    persistUser(userData);
  };

  const handleProfileUpdate = (userData) => {
    persistUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <>
      {!isCertificateRoute && (
        <Navbar
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
        />
      )}

      <Routes>
        <Route
          path="/"
          element={<LandingPage isAuthenticated={isAuthenticated} />}
        />
        <Route
          path="/impact"
          element={<ImpactPage isAuthenticated={isAuthenticated} />}
        />
        <Route path="/signup" element={<Register />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/verify-otp" element={<VerifyOTP onLogin={handleLogin} />} />
        <Route
          path="/donate-trees"
          element={
            isAuthenticated ? (
              <DonateTrees user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard user={user} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Profile user={user} onProfileUpdated={handleProfileUpdate} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/track/:token" element={<OrderTracking />} />
        <Route path="/certificate/:token" element={<Certificate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isCertificateRoute && <Footer />}
    </>
  );
}

export default App;
