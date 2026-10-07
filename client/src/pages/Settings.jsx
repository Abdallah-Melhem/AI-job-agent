import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import Navbar from '../components/Navbar';

function Settings() {
  const { user } = useContext(AuthContext);
  const { theme, setTheme } = useTheme();
  const [notificationStatus, setNotificationStatus] = useState('All updates enabled');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <>
      <Navbar />
      <div className="app-container">
        <div className="mb-4">
          <h2 className="mb-1">⚙️ Account & Workspace Settings</h2>
          <p className="text-muted mb-0">Configure your personal preferences, UI theme selection, and AI safety controls.</p>
        </div>

        {savedNotice && (
          <div className="alert alert-success d-flex align-items-center mb-4">
            <span className="me-2">✓</span>
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <div className="row g-4">
          {/* Theme System Panel */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="mb-0">🎨 Appearance & Theme System</h5>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Select your preferred interface color scheme. Your choice applies across all pages, modals, forms, and cards, and persists across sessions.
                </p>
                <div className="row g-3">
                  {/* Light Theme Card */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 h-100 ${theme === THEMES.LIGHT ? 'border-primary shadow-sm' : ''}`}
                      style={{ cursor: 'pointer', borderWidth: theme === THEMES.LIGHT ? '2px' : '1px' }}
                      onClick={() => setTheme(THEMES.LIGHT)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="fs-6">☀️ Light Mode</strong>
                        {theme === THEMES.LIGHT && <span className="badge bg-primary">Active</span>}
                      </div>
                      <small className="text-muted mb-3 d-block">
                        Clean high-contrast palette with soft slate surfaces and vivid royal blue accents.
                      </small>
                      <div className="p-2 rounded bg-light border d-flex gap-2 align-items-center">
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#2563eb' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#ffffff', border: '1px solid #cbd5e1' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#0f172a' }} />
                        <small className="text-muted ms-auto">Default</small>
                      </div>
                    </div>
                  </div>

                  {/* Dark Theme Card */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 h-100 ${theme === THEMES.DARK ? 'border-primary shadow-sm' : ''}`}
                      style={{ cursor: 'pointer', borderWidth: theme === THEMES.DARK ? '2px' : '1px' }}
                      onClick={() => setTheme(THEMES.DARK)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="fs-6">🌙 Dark Mode</strong>
                        {theme === THEMES.DARK && <span className="badge bg-primary">Active</span>}
                      </div>
                      <small className="text-muted mb-3 d-block">
                        Deep midnight background designed for low-light environments and reduced eye strain.
                      </small>
                      <div className="p-2 rounded bg-dark border border-secondary d-flex gap-2 align-items-center">
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#3b82f6' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#1e293b' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#f8fafc' }} />
                        <small className="text-muted ms-auto">Night</small>
                      </div>
                    </div>
                  </div>

                  {/* Purple Theme Card */}
                  <div className="col-md-4">
                    <div
                      className={`card p-3 h-100 ${theme === THEMES.PURPLE ? 'border-primary shadow-sm' : ''}`}
                      style={{ cursor: 'pointer', borderWidth: theme === THEMES.PURPLE ? '2px' : '1px' }}
                      onClick={() => setTheme(THEMES.PURPLE)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="fs-6">💜 Purple Mode</strong>
                        {theme === THEMES.PURPLE && <span className="badge bg-primary">Active</span>}
                      </div>
                      <small className="text-muted mb-3 d-block">
                        Vibrant violet & lavender palette with glowing purple accents and styled surfaces.
                      </small>
                      <div className="p-2 rounded border d-flex gap-2 align-items-center" style={{ background: '#261642', borderColor: '#4a2d7a' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#a855f7' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#3a2263' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: '#f5f3ff' }} />
                        <small className="text-muted ms-auto">Vibrant</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <h5 className="mb-0">User Profile Information</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">Full Name</label>
                  <input type="text" className="form-control" value={user?.name || ''} disabled readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold">Email Address</label>
                  <input type="email" className="form-control" value={user?.email || ''} disabled readOnly />
                  <small className="text-muted">Managed via authentication provider.</small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <h5 className="mb-0">Preferences & Controls</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSave}>
                  <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Job Search Alert Frequency</label>
                    <select
                      className="form-select"
                      value={notificationStatus}
                      onChange={(e) => setNotificationStatus(e.target.value)}
                    >
                      <option value="All updates enabled">Immediate (Real-time updates)</option>
                      <option value="Daily digest">Daily summary</option>
                      <option value="Manual only">Manual search only</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-muted small fw-bold">Application Safety Mode</label>
                    <div className="p-3 bg-light rounded border">
                      <div className="form-check form-switch mb-1">
                        <input className="form-check-input" type="checkbox" id="requireConfirmSwitch" defaultChecked disabled />
                        <label className="form-check-label fw-bold text-dark" htmlFor="requireConfirmSwitch">
                          Explicit Review Required Before Submission
                        </label>
                      </div>
                      <small className="text-muted d-block">
                        Enforces user review of prepared drafts before external job application submission. (Strict safety enforced)
                      </small>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Save Preferences
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Settings;
