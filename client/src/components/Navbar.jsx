import React, { useContext, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
          <Link className="navbar-brand-badge" to="/">
            <span className="navbar-brand-icon">💼</span>
            <span>AI Job Agent</span>
          </Link>
          <button
            className="btn btn-sm btn-outline-secondary d-md-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className={`d-md-flex align-items-center ${mobileMenuOpen ? 'd-block w-100 mt-2' : 'd-none d-md-flex'}`}>
          <ul className="nav-links-cluster">
            {user ? (
              <>
                <li>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>📊</span>
                    <span>Dashboard</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/jobs"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🔍</span>
                    <span>Find Jobs</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/applications"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>📋</span>
                    <span>Applications</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/cv"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>📄</span>
                    <span>CV / Resume</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/agent"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🤖</span>
                    <span>AI Assistant</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/integrations"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🔌</span>
                    <span>Integrations</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </NavLink>
                </li>
                <li className="ms-md-2 mt-2 mt-md-0 d-flex align-items-center">
                  <div className="theme-switcher-group" title="Select UI Theme">
                    <button
                      type="button"
                      className={`theme-switcher-btn ${theme === THEMES.LIGHT ? 'is-active' : ''}`}
                      onClick={() => setTheme(THEMES.LIGHT)}
                      aria-label="Light Theme"
                    >
                      ☀️ Light
                    </button>
                    <button
                      type="button"
                      className={`theme-switcher-btn ${theme === THEMES.DARK ? 'is-active' : ''}`}
                      onClick={() => setTheme(THEMES.DARK)}
                      aria-label="Dark Theme"
                    >
                      🌙 Dark
                    </button>
                    <button
                      type="button"
                      className={`theme-switcher-btn ${theme === THEMES.PURPLE ? 'is-active' : ''}`}
                      onClick={() => setTheme(THEMES.PURPLE)}
                      aria-label="Purple Theme"
                    >
                      💜 Purple
                    </button>
                  </div>
                </li>
                <li className="ms-md-2 mt-2 mt-md-0">
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleLogout}
                    title="Sign out of account"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink
                    to="/login"
                    className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log In
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/register"
                    className="btn btn-sm btn-primary ms-1"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
