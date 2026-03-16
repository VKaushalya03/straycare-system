import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  AlertCircle,
  Stethoscope,
  Home as HomeIcon,
  BookOpen,
  LogOut,
  User,
  PawPrint,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
// import UserProfile from './UserProfile'; // Uncomment this later when you build it!

export default function Navigation({
  isAuthenticated,
  userEmail,
  onLogout,
  accountType = "user",
}) {
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const [showProfile, setShowProfile] = useState(false);

  const userNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: HomeIcon },
    { path: "/report", label: "Report Stray", icon: AlertCircle },
    { path: "/disease-detection", label: "Health Check", icon: Stethoscope },
    { path: "/adoption", label: "Adopt", icon: Heart },
    { path: "/information", label: "Info Centre", icon: BookOpen },
  ];

  const orgNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: ClipboardList },
    { path: "/report", label: "Report Stray", icon: AlertCircle },
    { path: "/disease-detection", label: "Health Check", icon: Stethoscope },
    { path: "/adoption", label: "Adopt", icon: Heart },
    { path: "/information", label: "Info Centre", icon: BookOpen },
  ];

  const navItems = accountType === "organization" ? orgNavItems : userNavItems;

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <PawPrint className="h-8 w-8 text-orange-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Stay Care
              </span>
            </Link>

            <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-4">
              {isAuthenticated && (
                <>
                  <div className="hidden md:flex space-x-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors ${
                            isActive
                              ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md"
                              : "text-gray-700 hover:bg-orange-50"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="hidden lg:inline">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  {/* User Menu */}
                  <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                    <button
                      onClick={() => setShowProfile(true)}
                      className="hidden sm:flex items-center space-x-2 hover:bg-orange-50 rounded-lg px-3 py-2 transition-colors cursor-pointer border-none bg-transparent"
                    >
                      <div className="bg-orange-100 rounded-full p-2">
                        <User className="h-5 w-5 text-orange-700" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {userEmail?.split("@")[0]}
                      </span>
                    </button>
                    <button
                      onClick={onLogout}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer border-none bg-transparent"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="hidden sm:inline font-semibold">
                        Logout
                      </span>
                    </button>
                  </div>
                </>
              )}

              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-bold transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* User Profile Modal (Commented out until you create it) */}
      {/* {showProfile && userEmail && (
        <UserProfile userEmail={userEmail} onClose={() => setShowProfile(false)} />
      )} */}
    </>
  );
}
