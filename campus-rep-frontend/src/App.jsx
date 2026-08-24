import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentDashboard from './pages/StudentDashboard';
import RepDashboard from './pages/RepDashboard';
import Settings from './pages/Settings';
import StudentAttendance from './pages/StudentAttendance';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentHistory from './pages/StudentHistory';
import RepSessions from './pages/RepSessions';
import RepAnnouncements from './pages/RepAnnouncements';
import RepActivity from './pages/RepActivity';
import ProtectedRoute from './components/ProtectedRoute';
import api from './api/axios';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

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

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array("BMA60yU__lAMmo7NC28f9eeZoYNp7Xc1h4sSbZiR03CH9Bp8ZayODNYnaddzWODzRnALlCoQOIrAyyaVkO9qEhM"),
      });

      await api.post('/accounts/save-subscription/', subscription.toJSON());
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute allowedRole="STUDENT"><StudentAttendance /></ProtectedRoute>} />
        <Route path="/student/announcements" element={<ProtectedRoute allowedRole="STUDENT"><StudentAnnouncements /></ProtectedRoute>} />
        <Route path="/student/history" element={<ProtectedRoute allowedRole="STUDENT"><StudentHistory /></ProtectedRoute>} />
        <Route path="/student/*" element={<ProtectedRoute allowedRole="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/rep" element={<ProtectedRoute allowedRole="CLASS_REP"><RepDashboard /></ProtectedRoute>} />
        <Route path="/rep/sessions" element={<ProtectedRoute allowedRole="CLASS_REP"><RepSessions /></ProtectedRoute>} />
        <Route path="/rep/announcements" element={<ProtectedRoute allowedRole="CLASS_REP"><RepAnnouncements /></ProtectedRoute>} />
        <Route path="/rep/activity" element={<ProtectedRoute allowedRole="CLASS_REP"><RepActivity /></ProtectedRoute>} />
        <Route path="/rep/*" element={<ProtectedRoute allowedRole="CLASS_REP"><RepDashboard /></ProtectedRoute>} />
      </Routes>

      {installPrompt && (
        <button
          onClick={handleInstall}
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000,
            background: '#E2E8F0', color: '#0F172A', padding: '10px 16px',
            borderRadius: '12px', border: 'none', fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)', cursor: 'pointer',
          }}
        >
          ⬇ Install App
        </button>
      )}

      <button
        onClick={subscribeToPush}
        style={{
          position: 'fixed', bottom: '80px', right: '20px', zIndex: 1000,
          background: '#F8FAFC', color: '#0F172A', padding: '10px 16px',
          borderRadius: '12px', border: '1px solid #CBD5E1', fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
        }}
      >
        🔔 Notifications
      </button>
    </BrowserRouter>
  );
}

export default App;