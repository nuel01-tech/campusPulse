import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch {
    decoded = null;
  }

  if (!decoded) {
    return <Navigate to="/" replace />;
  }

  if (
    allowedRole &&
    decoded.role === "LECTURER" &&
    allowedRole !== "LECTURER"
  ) {
    return <Navigate to="/lecturer" replace />;
  }

  if (allowedRole && decoded.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
