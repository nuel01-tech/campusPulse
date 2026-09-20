import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import StudentDashboard from "./pages/StudentDashboard";
import StudentAttendance from "./pages/StudentAttendance";
import StudentAnnouncements from "./pages/StudentAnnouncements";
import StudentHistory from "./pages/StudentHistory";

import RepDashboard from "./pages/RepDashboard";
import RepSessions from "./pages/RepSessions";
import RepAnnouncements from "./pages/RepAnnouncements";
import RepActivity from "./pages/RepActivity";

import Profile from "./pages/Profile";
import Security from "./pages/Security";
import Preferences from "./pages/Preferences";
import Notifications from "./pages/Notifications";
import Documents from "./pages/Documents";
import Classmates from "./pages/Classmates";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();

    try {
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />

        {/* General authenticated routes */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/security"
          element={
            <ProtectedRoute>
              <Security />
            </ProtectedRoute>
          }
        />

        <Route
          path="/preferences"
          element={
            <ProtectedRoute>
              <Preferences />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />

        {/* Student */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/announcements"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentAnnouncements />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/history"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/classmates"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <Classmates />
            </ProtectedRoute>
          }
        />

        {/* Student fallback */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Class representative */}
        <Route
          path="/rep"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <RepDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rep/sessions"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <RepSessions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rep/announcements"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <RepAnnouncements />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rep/activity"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <RepActivity />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rep/classmates"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <Classmates />
            </ProtectedRoute>
          }
        />

        {/* Representative fallback */}
        <Route
          path="/rep/*"
          element={
            <ProtectedRoute allowedRole="CLASS_REP">
              <RepDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>

      {installPrompt && (
        <button
          type="button"
          className="cp-install-app"
          onClick={handleInstall}
          aria-label="Install CampusPulse"
        >
          <span className="cp-install-app-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </span>

          <span>
            <strong>Install CampusPulse</strong>
            <small>Add it to your device</small>
          </span>

          <svg
            className="cp-install-app-arrow"
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </BrowserRouter>
  );
}

export default App;
