import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Settings() {
  const { user } = useContext(AuthContext);
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
          <p className="text-muted mb-0">Configure your personal preferences, notifications, and AI assistant defaults.</p>
        </div>

        {savedNotice && (
          <div className="alert alert-success d-flex align-items-center mb-4">
            <span className="me-2">✓</span>
            <span>Preferences saved successfully.</span>
          </div>
        )}

        <div className="row g-4">
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
