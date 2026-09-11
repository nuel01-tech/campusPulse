import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import RepDashboard from './pages/RepDashboard';
import Profile from './pages/Profile';
import Security from './pages/Security';
import Preferences from './pages/Preferences';
import Notifications from './pages/Notifications';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Terms from './pages/Terms';
import StudentAttendance from './pages/StudentAttendance';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentHistory from './pages/StudentHistory';
import RepSessions from './pages/RepSessions';
import RepAnnouncements from './pages/RepAnnouncements';
import RepActivity from './pages/RepActivity';
import Documents from './pages/Documents';
import Classmates from './pages/Classmates';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/student" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute allowedRole="STUDENT"><StudentAttendance /></ProtectedRoute>} />
        <Route path="/student/announcements" element={<ProtectedRoute allowedRole="STUDENT"><StudentAnnouncements /></ProtectedRoute>} />
        <Route path="/student/history" element={<ProtectedRoute allowedRole="STUDENT"><StudentHistory /></ProtectedRoute>} />
        <Route path="/student/classmates" element={<ProtectedRoute allowedRole="STUDENT"><Classmates /></ProtectedRoute>} />
        <Route path="/student/*" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/rep" element={<ProtectedRoute allowedRole="CLASS_REP"><RepDashboard /></ProtectedRoute>} />
        <Route path="/rep/sessions" element={<ProtectedRoute allowedRole="CLASS_REP"><RepSessions /></ProtectedRoute>} />
        <Route path="/rep/announcements" element={<ProtectedRoute allowedRole="CLASS_REP"><RepAnnouncements /></ProtectedRoute>} />
        <Route path="/rep/activity" element={<ProtectedRoute allowedRole="CLASS_REP"><RepActivity /></ProtectedRoute>} />
        <Route path="/rep/classmates" element={<ProtectedRoute allowedRole="CLASS_REP"><Classmates /></ProtectedRoute>} />
        <Route path="/rep/*" element={<ProtectedRoute allowedRole="CLASS_REP"><RepDashboard /></ProtectedRoute>} />
      </Routes>

      {installPrompt && (
        <button className="install-app-button" onClick={handleInstall}>
          <span>⬇ Install App</span>
        </button>
      )}
    </BrowserRouter>
  );
}

export default App;