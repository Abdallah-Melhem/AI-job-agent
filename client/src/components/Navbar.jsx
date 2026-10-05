import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4 rounded px-3">
      <Link className="navbar-brand fw-bold" to="/">AI Job Agent</Link>
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav ms-auto">
          {user ? (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/profile">Profile</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/cv">CV Upload</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/jobs">Jobs</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link text-primary fw-bold" to="/agent">AI Agent 🤖</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/integrations">Integrations</Link>
              </li>
              <li className="nav-item">
                <button className="btn nav-link" onClick={handleLogout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
