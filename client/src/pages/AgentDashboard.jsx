import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api, { FILE_BASE_URL } from '../services/api';

function AgentDashboard() {
  const { user } = useContext(AuthContext);
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const PRESET_GOALS = [
    'Find internships matching my profile, remote or hybrid, using React or JavaScript.',
    'Search for remote full-stack developer roles and tailor my resume for the top match.',
    'Find backend engineering positions using Node.js and PostgreSQL.'
  ];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/agent/tasks');
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleRunAgent = async (selectedGoal) => {
    const targetGoal = selectedGoal || goal;
    if (!targetGoal.trim()) return;

    try {
      setRunning(true);
      setError('');
      setCurrentTask(null);

      const { data } = await api.post('/agent/run', { goal: targetGoal.trim() });
      setCurrentTask(data);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Agent failed to run');
    } finally {
      setRunning(false);
    }
  };

  const getStepBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge bg-success">Completed</span>;
      case 'running': return <span className="badge bg-primary">In Progress</span>;
      case 'failed': return <span className="badge bg-danger">Failed</span>;
      case 'skipped': return <span className="badge bg-secondary">Skipped</span>;
      default: return <span className="badge bg-light text-dark border">Pending</span>;
    }
  };

  return (
    <div className="container mt-5 mb-5">
      <Navbar />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">🤖 Autonomous AI Job Agent</h2>
          <p className="text-muted mb-0">Give the AI agent high-level instructions to search, match, and tailor applications.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Goal Input & Controls */}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="card-title fw-bold mb-3">Instruct Your Agent</h5>
          <form onSubmit={(e) => { e.preventDefault(); handleRunAgent(); }}>
            <div className="mb-3">
              <textarea
                className="form-control"
                rows="3"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Find internships matching my profile from the last 7 days, minimum salary $1000, remote or hybrid, using React or JavaScript."
                disabled={running}
              />
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <div className="d-flex flex-wrap gap-1">
                <small className="text-muted d-block w-100 mb-1">Quick Presets:</small>
                {PRESET_GOALS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => { setGoal(preset); handleRunAgent(preset); }}
                    disabled={running}
                  >
                    {preset.slice(0, 40)}...
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg px-4 mt-2 mt-md-0"
                disabled={running || !goal.trim()}
              >
                {running ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Agent Working...
                  </>
                ) : 'Launch Agent 🚀'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Active / Latest Task View */}
      {currentTask && (
        <div className="card shadow border-primary mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Active Agent Task State</h5>
            <span className="badge bg-light text-primary fs-6 text-uppercase">{currentTask.status}</span>
          </div>
          <div className="card-body p-4">
            <h6 className="text-muted mb-3">Goal: <span className="text-dark fw-bold">{currentTask.goal}</span></h6>

            {/* Execution Plan Tracker */}
            <h6 className="fw-bold border-bottom pb-2 mb-3">Multi-Step Execution Plan</h6>
            <div className="list-group mb-4">
              {currentTask.plan && currentTask.plan.map((s) => (
                <div key={s.step} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Step {s.step}: {s.action}</strong>
                    <br />
                    <small className="text-muted">Tool: <code>{s.tool}</code> {s.resultSummary ? `• ${s.resultSummary}` : ''}</small>
                  </div>
                  <div>{getStepBadge(s.status)}</div>
                </div>
              ))}
            </div>

            {/* Results / Matched Jobs */}
            {currentTask.results && currentTask.results.matchedJobs && currentTask.results.matchedJobs.length > 0 && (
              <div className="mt-4">
                <h6 className="fw-bold border-bottom pb-2 mb-3">Discovered & Matched Opportunities</h6>
                <div className="row">
                  {currentTask.results.matchedJobs.map((job, idx) => (
                    <div key={idx} className="col-md-6 mb-3">
                      <div className="card h-100 border">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title fw-bold text-dark mb-0">{job.title}</h6>
                            <span className="badge bg-success">{job.score}% Match</span>
                          </div>
                          <p className="text-muted small mb-2">{job.company}</p>

                          {job.pdfPath && (
                            <div className="mt-2 p-2 bg-light rounded border">
                              <small className="fw-bold text-success d-block mb-1">✨ Tailored ATS Resume Ready:</small>
                              <div className="d-flex gap-2">
                                <a href={`${FILE_BASE_URL}${job.pdfPath}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                                  Download PDF
                                </a>
                                {job.docxPath && (
                                  <a href={`${FILE_BASE_URL}${job.docxPath}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                    Download DOCX
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {currentTask.results?.summary && (
              <div className="alert alert-info mt-3 mb-0">
                <strong>Agent Summary:</strong> {currentTask.results.summary}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task History */}
      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <h5 className="mb-0 fw-bold">Agent Task History</h5>
        </div>
        <div className="card-body p-4">
          {tasks.length === 0 ? (
            <p className="text-muted mb-0">No past agent tasks recorded.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Goal</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t._id}>
                      <td><small className="text-muted">{new Date(t.createdAt).toLocaleString()}</small></td>
                      <td><strong>{t.goal}</strong></td>
                      <td>{getStepBadge(t.status)}</td>
                      <td><span className="badge bg-light text-dark border">{t.plan?.length || 0} steps</span></td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setCurrentTask(t)}>
                          View Details
                        </button>
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
  );
}

export default AgentDashboard;
