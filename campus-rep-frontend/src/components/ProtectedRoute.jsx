import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('access');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (allowedRole && decoded.role !== allowedRole) {
      return <Navigate to="/" replace />;
    }

    return children;
  } catch {
    return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute;