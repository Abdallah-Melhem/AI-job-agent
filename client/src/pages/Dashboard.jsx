import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Dashboard() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="container mt-5">
      <Navbar />
      <div className="card shadow-sm">
        <div className="card-body text-center p-5">
          <h2 className="card-title">Welcome to your Dashboard, {user.name}!</h2>
          <p className="card-text text-muted mt-3">
            The AI Job Agent dashboard is ready. Features will be implemented in upcoming phases.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
