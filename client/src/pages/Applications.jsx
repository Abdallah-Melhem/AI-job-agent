import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  discovered:       { label: 'Discovered',       color: 'secondary', icon: '🔍' },
  saved:            { label: 'Saved',             color: 'info',      icon: '🔖' },
  preparing:        { label: 'Preparing',         color: 'warning',   icon: '✏️' },
  ready_for_review: { label: 'Ready for Review',  color: 'primary',   icon: '👁️' },
  applied:          { label: 'Applied',           color: 'success',   icon: '📤' },
  interview:        { label: 'Interview',         color: 'success',   icon: '🎤' },
  rejected:         { label: 'Rejected',          color: 'danger',    icon: '❌' },
  offer:            { label: 'Offer',             color: 'success',   icon: '🎉' },
  withdrawn:        { label: 'Withdrawn',         color: 'secondary', icon: '↩️' }
};

// Which statuses a user can manually transition to from a given status
const ALLOWED_TRANSITIONS = {
  discovered:       ['saved', 'withdrawn'],
  saved:            ['preparing', 'withdrawn'],
  preparing:        ['ready_for_review', 'saved', 'withdrawn'],
  ready_for_review: ['applied', 'preparing', 'withdrawn'],
  applied:          ['interview', 'rejected', 'offer', 'withdrawn'],
  interview:        ['offer', 'rejected', 'withdrawn'],
  rejected:         ['withdrawn'],
  offer:            ['withdrawn'],
  withdrawn:        []
};

const PIPELINE_ORDER = [
  'discovered', 'saved', 'preparing', 'ready_for_review',
  'applied', 'interview', 'offer', 'rejected', 'withdrawn'
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'secondary', icon: '?' };
  return (
    <span className={`badge bg-${cfg.color} me-1`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ApplicationCard({ app, onStatusChange, onDelete, onSelect }) {
  const job = app.job || {};
  const allowed = ALLOWED_TRANSITIONS[app.status] || [];
  const cfg = STATUS_CONFIG[app.status] || {};

  return (
    <div
      className={`card mb-3 shadow-sm border-start border-4 border-${cfg.color || 'secondary'}`}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(app)}
    >
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-1">
          <div>
            <strong className="d-block">{job.title || 'Unknown Position'}</strong>
            <small className="text-muted">
              {job.company || 'Unknown Company'}
              {job.location ? ` · ${job.location}` : ''}
              {job.remote && job.remote !== 'unknown' ? ` · ${job.remote}` : ''}
            </small>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap mt-2" onClick={e => e.stopPropagation()}>
          {allowed.map(s => (
            <button
              key={s}
              className={`btn btn-sm btn-outline-${STATUS_CONFIG[s]?.color || 'secondary'}`}
              onClick={() => onStatusChange(app._id, s)}
              title={`Move to ${STATUS_CONFIG[s]?.label || s}`}
            >
              → {STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
          <button
            className="btn btn-sm btn-outline-danger ms-auto"
            onClick={() => onDelete(app._id)}
            title="Remove tracking"
          >
            🗑
          </button>
        </div>

        {app.appliedAt && (
          <small className="text-muted d-block mt-1">
            Applied: {new Date(app.appliedAt).toLocaleDateString()}
          </small>
        )}
      </div>
    </div>
  );
}

function ApplicationDetail({ app, onClose, onStatusChange, onSave }) {
  const [notes, setNotes] = useState(app.notes || '');
  const [appUrl, setAppUrl] = useState(app.applicationUrl || '');
  const [source, setSource] = useState(app.source || '');
  const [saving, setSaving] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const job = app.job || {};
  const allowed = ALLOWED_TRANSITIONS[app.status] || [];

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await onSave(app._id, { notes, applicationUrl: appUrl, source });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/applications/${app._id}/notes`, { note: noteInput.trim() });
      setNoteInput('');
      onSave(app._id, {}); // refresh
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="card shadow border-0 h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">📋 Application Details</h6>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕ Close</button>
      </div>
      <div className="card-body overflow-auto">
        {/* Job Info */}
        <h5>{job.title || 'Unknown Position'}</h5>
        <p className="text-muted mb-1">
          {job.company || 'Unknown'} · {job.location || 'Remote/Unknown'}
        </p>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary mb-3">
            View Original Listing ↗
          </a>
        )}

        {/* Status */}
        <div className="mb-3">
          <label className="form-label fw-bold">Current Status</label>
          <div className="mb-1"><StatusBadge status={app.status} /></div>
          {allowed.length > 0 && (
            <div className="d-flex gap-2 flex-wrap">
              <small className="text-muted align-self-center">Move to:</small>
              {allowed.map(s => (
                <button
                  key={s}
                  className={`btn btn-sm btn-${STATUS_CONFIG[s]?.color || 'secondary'}`}
                  onClick={() => onStatusChange(app._id, s)}
                >
                  {STATUS_CONFIG[s]?.icon} {STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tailored Resume link */}
        {app.tailoredResume && (
          <div className="alert alert-info py-2 mb-3">
            ✅ Tailored resume linked: <strong>{app.tailoredResume.summary?.slice(0, 60) || 'Resume on file'}…</strong>
            {app.tailoredResume.isAtsCompliant && <span className="badge bg-success ms-2">ATS</span>}
            {app.tailoredResume.isTruthful && <span className="badge bg-primary ms-1">Verified</span>}
          </div>
        )}

        {/* Timeline */}
        <div className="mb-3">
          <label className="form-label fw-bold">Timeline</label>
          <ul className="list-unstyled mb-0 small">
            {app.savedAt          && <li>🔖 Saved: {new Date(app.savedAt).toLocaleDateString()}</li>}
            {app.preparingAt      && <li>✏️ Preparing: {new Date(app.preparingAt).toLocaleDateString()}</li>}
            {app.readyForReviewAt && <li>👁️ Ready for Review: {new Date(app.readyForReviewAt).toLocaleDateString()}</li>}
            {app.appliedAt        && <li>📤 Applied: {new Date(app.appliedAt).toLocaleDateString()}</li>}
            {app.interviewAt      && <li>🎤 Interview: {new Date(app.interviewAt).toLocaleDateString()}</li>}
            {app.offerAt          && <li>🎉 Offer: {new Date(app.offerAt).toLocaleDateString()}</li>}
            {app.rejectedAt       && <li>❌ Rejected: {new Date(app.rejectedAt).toLocaleDateString()}</li>}
            {app.withdrawnAt      && <li>↩️ Withdrawn: {new Date(app.withdrawnAt).toLocaleDateString()}</li>}
          </ul>
        </div>

        {/* Metadata */}
        <div className="mb-3">
          <label className="form-label fw-bold">Application URL</label>
          <input
            type="url"
            className="form-control form-control-sm"
            value={appUrl}
            onChange={e => setAppUrl(e.target.value)}
            placeholder="https://company.com/apply/..."
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-bold">Source</label>
          <select className="form-select form-select-sm" value={source} onChange={e => setSource(e.target.value)}>
            <option value="">Not specified</option>
            <option value="linkedin">LinkedIn</option>
            <option value="company-site">Company Website</option>
            <option value="referral">Referral</option>
            <option value="job-board">Job Board</option>
            <option value="recruiter">Recruiter</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label fw-bold">Notes</label>
          <textarea
            className="form-control form-control-sm"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this application..."
          />
        </div>

        <div className="d-flex gap-2 mb-3">
          <button className="btn btn-sm btn-primary" onClick={handleSaveDetails} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Details'}
          </button>
        </div>

        {/* Add quick note */}
        <div className="mb-3">
          <label className="form-label fw-bold">Quick Note</label>
          <div className="input-group input-group-sm">
            <input
              type="text"
              className="form-control"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              placeholder="Type a note and press Enter or Add"
            />
            <button className="btn btn-outline-secondary" onClick={handleAddNote} disabled={addingNote}>
              {addingNote ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Activity Log */}
        {app.logs && app.logs.length > 0 && (
          <div>
            <label className="form-label fw-bold">Activity Log</label>
            <ul className="list-unstyled mb-0">
              {[...app.logs].reverse().slice(0, 10).map((log, i) => (
                <li key={i} className={`small text-${log.level === 'error' ? 'danger' : 'muted'} mb-1`}>
                  <span className="text-secondary">{new Date(log.timestamp).toLocaleDateString()}</span> — {log.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const { data } = await api.get(`/applications${params}`);
      setApps(data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error loading applications');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/applications/stats');
      setStats(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [fetchApplications, fetchStats]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      setMessage('');
      const { data } = await api.patch(`/applications/${appId}/status`, { status: newStatus });
      setApps(prev => prev.map(a => a._id === appId ? data : a));
      if (selectedApp?._id === appId) setSelectedApp(data);
      fetchStats();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleDelete = async (appId) => {
    if (!window.confirm('Remove this application from tracking?')) return;
    try {
      await api.delete(`/applications/${appId}`);
      setApps(prev => prev.filter(a => a._id !== appId));
      if (selectedApp?._id === appId) setSelectedApp(null);
      fetchStats();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error deleting application');
    }
  };

  const handleSaveDetails = async (appId, updates) => {
    try {
      const { data } = await api.patch(`/applications/${appId}`, updates);
      setApps(prev => prev.map(a => a._id === appId ? data : a));
      setSelectedApp(data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving details');
    }
  };

  const handleSelect = (app) => {
    setSelectedApp(prev => prev?._id === app._id ? null : app);
  };

  // Pipeline kanban view — group by status
  const byStatus = {};
  for (const app of apps) {
    if (!byStatus[app.status]) byStatus[app.status] = [];
    byStatus[app.status].push(app);
  }

  return (
    <>
      <Navbar />
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h4 className="mb-0">📋 Application Tracker</h4>
          <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/jobs')}>
            ← Browse Jobs
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="row g-2 mb-4">
            <div className="col-auto">
              <div className="card text-center px-3 py-2 bg-light border-0">
                <div className="fw-bold fs-5">{stats.total}</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
            {PIPELINE_ORDER.map(s => stats.byStatus?.[s] ? (
              <div key={s} className="col-auto">
                <div className={`card text-center px-3 py-2 border-${STATUS_CONFIG[s]?.color || 'secondary'} border-2`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setFilterStatus(prev => prev === s ? '' : s)}
                >
                  <div className={`fw-bold fs-5 text-${STATUS_CONFIG[s]?.color || 'secondary'}`}>
                    {stats.byStatus[s]}
                  </div>
                  <small className="text-muted">{STATUS_CONFIG[s]?.label || s}</small>
                </div>
              </div>
            ) : null)}
          </div>
        )}

        {message && (
          <div className="alert alert-danger alert-dismissible mb-3">
            {message}
            <button type="button" className="btn-close" onClick={() => setMessage('')} />
          </div>
        )}

        {/* Filter */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <label className="form-label mb-0 fw-bold">Filter:</label>
          <button
            className={`btn btn-sm ${filterStatus === '' ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setFilterStatus('')}
          >
            All
          </button>
          {PIPELINE_ORDER.map(s => (
            <button
              key={s}
              className={`btn btn-sm btn-${filterStatus === s ? '' : 'outline-'}${STATUS_CONFIG[s]?.color || 'secondary'}`}
              onClick={() => setFilterStatus(prev => prev === s ? '' : s)}
            >
              {STATUS_CONFIG[s]?.icon} {STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-5"><div className="spinner-border text-primary" /></div>}

        {!loading && apps.length === 0 && (
          <div className="text-center py-5 text-muted">
            <p className="mb-2">No applications tracked yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
              Browse Jobs & Track Applications
            </button>
          </div>
        )}

        <div className={selectedApp ? 'row g-3' : ''}>
          {/* Application list */}
          <div className={selectedApp ? 'col-12 col-lg-6' : ''}>
            {apps.map(app => (
              <ApplicationCard
                key={app._id}
                app={app}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selectedApp && (
            <div className="col-12 col-lg-6">
              <ApplicationDetail
                app={selectedApp}
                onClose={() => setSelectedApp(null)}
                onStatusChange={handleStatusChange}
                onSave={handleSaveDetails}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
