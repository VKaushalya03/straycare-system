import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import all your pages and components
import WelcomeLandingPage from "./components/WelcomeLandingPage";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import Navigation from "./components/Navigation";
import ReportingPage from "./components/ReportingPage";
import AdoptionPage from "./components/AdoptionPage";
import InformationCentre from "./components/InformationCentre";
import { DiseaseDetectionPage } from "./components/DiseasePrediction";

export default function App() {
  // 1. Check if the user is already logged in when they open the app
  const [user, setUser] = useState(() => {
    const loggedInUser = localStorage.getItem("user");
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  // 2. When they successfully log in via AuthPage
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  // 3. When they click "Logout" in the Navigation bar
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      {/* Navigation Bar */}
      <Navigation
        isAuthenticated={!!user}
        // Safely extract email regardless of how the backend structures the user object
        userEmail={user?.email || user?.user?.email}
        accountType={user?.role || user?.user?.role}
        onLogout={handleLogout}
      />

      <Routes>
        {/* Welcome Page */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <WelcomeLandingPage
                onGetStarted={() => (window.location.href = "/auth")}
              />
            )
          }
        />

        {/* Auth Page */}
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to="/dashboard" />
            ) : (
              <AuthPage onLogin={handleLoginSuccess} />
            )
          }
        />

        {/* Dashboard Page: Protected! */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/auth" />}
        />

        {/* Reporting Page: Protected! */}
        <Route
          path="/report"
          element={user ? <ReportingPage /> : <Navigate to="/auth" />}
        />

        {/* Adoption Page: Protected! */}
        <Route
          path="/adoption"
          element={user ? <AdoptionPage /> : <Navigate to="/auth" />}
        />

        {/* Information Centre Page: Protected! */}
        <Route
          path="/information"
          element={user ? <InformationCentre /> : <Navigate to="/auth" />}
        />

        {/* Disease Detection Page: Protected! */}
        <Route
          path="/disease-detection"
          element={user ? <DiseaseDetectionPage /> : <Navigate to="/auth" />}
        />

        {/* Catch-all: If they type a random URL, send them back to the start */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
