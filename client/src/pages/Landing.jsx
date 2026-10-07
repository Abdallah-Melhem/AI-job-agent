import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function Landing() {
  return (
    <>
      <Navbar />
      <div className="app-container">
        {/* Hero Section */}
        <div className="text-center py-5 my-3">
          <div className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 mb-3 fs-6">
            ✨ Intelligent Job Discovery & Autonomous Application Assistant
          </div>
          <h1 className="display-4 fw-bold mb-3" style={{ letterSpacing: '-0.03em' }}>
            Land Your Next Role With <br />
            <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Precision AI Matching
            </span>
          </h1>
          <p className="lead text-muted mx-auto mb-4" style={{ maxWidth: '640px' }}>
            Automate job searching across real verified job boards, match positions against your verifiable experience, and tailor ATS resumes with zero fabrication.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" className="btn btn-primary btn-lg px-4 shadow-sm">
              Get Started Free →
            </Link>
            <Link to="/jobs" className="btn btn-outline-secondary btn-lg px-4">
              Browse Open Jobs
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="row g-4 my-4">
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0 p-3">
              <div className="card-body">
                <div className="fs-2 mb-2">📡</div>
                <h5 className="card-title fw-bold">Live Aggregated Sources</h5>
                <p className="card-text text-muted">
                  Access live opportunities from remote and global adapters (Jobicy, Arbeitnow, RemoteOK) normalized across 25+ career categories.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0 p-3">
              <div className="card-body">
                <div className="fs-2 mb-2">🎯</div>
                <h5 className="card-title fw-bold">Hybrid Explainable Matching</h5>
                <p className="card-text text-muted">
                  Inspect six-dimensional compatibility scores with skill breakdown, seniority checks, and grounded semantic insights.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 shadow-sm border-0 p-3">
              <div className="card-body">
                <div className="fs-2 mb-2">🛡️</div>
                <h5 className="card-title fw-bold">Strict Anti-Fabrication</h5>
                <p className="card-text text-muted">
                  Every tailored resume and application is verified against your source document to prevent invented skills or employment history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Showcase */}
        <div className="card bg-light border-0 shadow-sm p-4 my-4 text-center">
          <h4 className="fw-bold mb-2">Controlled 9-Stage Application Pipeline</h4>
          <p className="text-muted mx-auto mb-4" style={{ maxWidth: '600px' }}>
            From initial discovery to offer acceptance, keep full control over every application submission with strict manual approval steps.
          </p>
          <div className="d-flex justify-content-center flex-wrap gap-2">
            <span className="badge bg-secondary p-2">1. Discovered</span>
            <span className="badge bg-info text-dark p-2">2. Saved</span>
            <span className="badge bg-warning text-dark p-2">3. Preparing</span>
            <span className="badge bg-primary p-2">4. Ready for Review</span>
            <span className="badge bg-success p-2">5. Applied</span>
            <span className="badge bg-success p-2">6. Interview</span>
            <span className="badge bg-success p-2">7. Offer</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;
