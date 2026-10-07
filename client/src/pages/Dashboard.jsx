import React, { useContext, useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

function Dashboard() {
  const { user, loading } = useContext(AuthContext);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [recentApplications, setRecentApplications] = useState([]);
  const [cvCount, setCvCount] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setFetching(true);
        const [statsRes, appsRes, cvsRes, profileRes] = await Promise.allSettled([
          api.get('/applications/stats'),
          api.get('/applications'),
          api.get('/cv'),
          api.get('/profile')
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data || { total: 0, byStatus: {} });
        }
        if (appsRes.status === 'fulfilled') {
          setRecentApplications(appsRes.value.data?.slice(0, 5) || []);
        }
        if (cvsRes.status === 'fulfilled') {
          setCvCount(cvsRes.value.data?.length || 0);
        }
        if (profileRes.status === 'fulfilled') {
          const prof = profileRes.value.data;
          setProfileComplete(Boolean(prof && (prof.skills?.length > 0 || prof.summary)));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setFetching(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="state-loading">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Loading workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Navbar />
      <div className="app-container">
        {/* Header Greeting */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h2 className="mb-1">Welcome back, {user.name}! 👋</h2>
            <p className="text-muted mb-0">Here is your job search activity and application overview.</p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/jobs" className="btn btn-primary">
              🔍 Explore Jobs
            </Link>
            <Link to="/agent" className="btn btn-outline-primary">
              🤖 Launch Agent
            </Link>
          </div>
        </div>

        {/* Real Metrics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <span className="text-muted small fw-bold text-uppercase">Tracked Jobs</span>
                <div className="fs-3 fw-bold text-dark mt-1">{stats.total || 0}</div>
                <small className="text-muted">Applications in your pipeline</small>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <span className="text-muted small fw-bold text-uppercase">Active Submissions</span>
                <div className="fs-3 fw-bold text-primary mt-1">
                  {(stats.byStatus?.applied || 0) + (stats.byStatus?.interview || 0)}
                </div>
                <small className="text-muted">Applied or Interview stage</small>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <span className="text-muted small fw-bold text-uppercase">Uploaded CVs</span>
                <div className="fs-3 fw-bold text-success mt-1">{cvCount}</div>
                <small className="text-muted">Resumes parsed in system</small>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <span className="text-muted small fw-bold text-uppercase">Profile Status</span>
                <div className="fs-3 fw-bold mt-1">
                  {profileComplete ? (
                    <span className="text-success fs-5">✓ Configured</span>
                  ) : (
                    <span className="text-warning fs-5">Needs Setup</span>
                  )}
                </div>
                <small className="text-muted">Candidate skills profile</small>
              </div>
            </div>
          </div>
        </div>

        {/* Action Center & Recent Applications */}
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">📋 Recent Applications</h5>
                <Link to="/applications" className="btn btn-sm btn-outline-secondary">
                  View All Tracker ↗
                </Link>
              </div>
              <div className="card-body p-0">
                {fetching ? (
                  <div className="p-4 text-center text-muted">
                    <div className="spinner-border spinner-border-sm me-2 text-primary" />
                    Loading recent applications...
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="state-empty my-0 border-0">
                    <span className="state-empty-icon">📭</span>
                    <h6 className="state-empty-title">No applications tracked yet</h6>
                    <p className="state-empty-text">
                      Browse job listings and start tracking positions to organize your preparation and submission timeline.
                    </p>
                    <Link to="/jobs" className="btn btn-sm btn-primary">
                      Search Jobs Now
                    </Link>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Role & Company</th>
                          <th>Status</th>
                          <th>Last Activity</th>
                          <th className="text-end pe-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => (
                          <tr key={app._id}>
                            <td className="ps-3">
                              <strong>{app.job?.title || 'Job Listing'}</strong>
                              <small className="d-block text-muted">{app.job?.company || 'Company'}</small>
                            </td>
                            <td>
                              <span className="badge bg-secondary text-capitalize">
                                {app.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <small className="text-muted">
                                {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : 'N/A'}
                              </small>
                            </td>
                            <td className="text-end pe-3">
                              <Link to="/applications" className="btn btn-sm btn-outline-primary">
                                Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-white">
                <h5 className="mb-0">⚡ Quick Start Checklist</h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush mb-3">
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <strong>1. Upload Master CV</strong>
                      <small className="d-block text-muted">Parse resume for AI skills indexing</small>
                    </div>
                    {cvCount > 0 ? (
                      <span className="badge bg-success">Done</span>
                    ) : (
                      <Link to="/cv" className="btn btn-sm btn-outline-primary">Upload</Link>
                    )}
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <strong>2. Setup Profile</strong>
                      <small className="d-block text-muted">Review contact & work experience</small>
                    </div>
                    {profileComplete ? (
                      <span className="badge bg-success">Done</span>
                    ) : (
                      <Link to="/profile" className="btn btn-sm btn-outline-primary">Edit</Link>
                    )}
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <div>
                      <strong>3. Find Matching Jobs</strong>
                      <small className="d-block text-muted">Run hybrid scoring & tailored ATS preview</small>
                    </div>
                    <Link to="/jobs" className="btn btn-sm btn-outline-primary">Search</Link>
                  </li>
                </ul>

                <div className="p-3 bg-light rounded border">
                  <small className="fw-bold d-block text-primary mb-1">🤖 AI Agent Ready</small>
                  <small className="text-muted d-block mb-2">
                    Let the agent search, match, and tailor applications autonomously under strict safety boundaries.
                  </small>
                  <Link to="/agent" className="btn btn-sm btn-primary w-100">
                    Open Assistant
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
