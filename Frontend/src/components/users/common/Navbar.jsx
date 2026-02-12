import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Leaf, LayoutDashboard, BarChart3 } from "lucide-react";

const Navbar = ({ isAuthenticated, user, onLogout }) => {
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link
          to={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2"
        >
          <Leaf className="text-emerald-600" size={28} />
          <span className="text-2xl font-bold text-emerald-600 tracking-wide">
          GREEN CAMPUS TRACKER
          </span>
        </Link>

        {/* Center Navigation */}
        <div className="hidden md:flex items-center gap-6 bg-gray-50 px-6 py-2 rounded-full shadow-inner">
          
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-600 hover:text-emerald-600"
              }`
            }
          >
            <Leaf size={16} />
            Home
          </NavLink>

          <NavLink
            to="/impact"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-gray-600 hover:text-emerald-600"
              }`
            }
          >
            <BarChart3 size={16} />
            Impact
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to="/donate-trees"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-gray-600 hover:text-emerald-600"
                }`
              }
            >
              <Leaf size={16} />
              Donate Trees
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-gray-600 hover:text-emerald-600"
                }`
              }
            >
              <LayoutDashboard size={16} />
              Dashboard
            </NavLink>
          )}
        </div>

        {/* Right Side Auth */}
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="text-gray-700 font-medium hover:text-emerald-600 transition"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium shadow-md hover:bg-emerald-700 transition"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-emerald-50 transition"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500">
                  <img
                    src={
                      user?.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.full_name || "User",
                      )}&background=16a34a&color=fff`
                    }
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">
                    {user?.full_name || "My Profile"}
                  </p>
                  <p className="text-xs text-emerald-600 leading-tight">
                    View or update
                  </p>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-red-100 hover:text-red-600 transition font-medium"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
