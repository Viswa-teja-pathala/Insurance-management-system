import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <span className="font-bold text-lg">InsureMS</span>
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link to="/policies" className="text-gray-600 hover:text-gray-900">Policies</Link>
          <Link to="/claims" className="text-gray-600 hover:text-gray-900">Claims</Link>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-500">{user?.name} ({user?.role})</span>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}