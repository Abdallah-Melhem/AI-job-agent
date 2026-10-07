import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api, { FILE_BASE_URL } from '../services/api';

function Jobs() {
  const { user } = useContext(AuthContext);
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedJob, setSelectedJob] = useState(null);

  // AI Matching state
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState('');

  // Resume Tailoring state
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [tailorError, setTailorError] = useState('');

  // Filters
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [remote, setRemote] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState('all');
  const [experienceLevel, setExperienceLevel] = useState('all');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Available sources and categories from backend
  const [sources, setSources] = useState(['all']);
  const [categories, setCategories] = useState(['all']);

  // Tab
  const [tab, setTab] = useState('search'); // 'search' | 'saved'

  useEffect(() => {
    api.get('/jobs/sources')
      .then(r => setSources(r.data.sources || ['all']))
      .catch(() => {});
    api.get('/jobs/categories')
      .then(r => setCategories(['all', ...(r.data.categories || [])]))
      .catch(() => {});
  }, []);

  const fetchJobs = async (page = 1) => {
    try {
      setLoading(true);
      setMessage('');
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (type) params.append('type', type);
      if (remote) params.append('remote', remote);
      if (location) params.append('location', location);
      if (country) params.append('country', country);
      if (company) params.append('company', company);
      if (source && source !== 'all') params.append('source', source);
      if (category && category !== 'all') params.append('category', category);
      if (experienceLevel && experienceLevel !== 'all') params.append('experienceLevel', experienceLevel);
      if (minSalary) params.append('minSalary', minSalary);
      if (maxSalary) params.append('maxSalary', maxSalary);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', page);
      params.append('limit', 20);

      const { data } = await api.get(`/jobs/search?${params.toString()}`);
      setJobs(data.jobs || []);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error searching jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setType('');
    setRemote('');
    setLocation('');
    setCountry('');
    setCompany('');
    setSource('all');
    setCategory('all');
    setExperienceLevel('all');
    setMinSalary('');
    setMaxSalary('');
    setSortBy('newest');
  };

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/jobs/saved');
      setJobs(data);
      setSavedIds(new Set(data.map(j => j._id)));
      setPagination({ page: 1, pages: 1, total: data.length });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error fetching saved jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'search') fetchJobs();
    else fetchSavedJobs();
  }, [tab]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(1);
  };

  const handleSelectJob = async (job) => {
    setSelectedJob(job);
    setMatchResult(null);
    setMatchError('');
    setTailorError('');
    setTrackingState(null);
    // Check if a tailored resume already exists for this job
    try {
      const { data } = await api.get(`/jobs/${job._id}/tailor`);
      setTailoredResume(data);
    } catch {
      setTailoredResume(null);
    }
  };

  const handleToggleSave = async (jobId) => {
    try {
      const { data } = await api.post(`/jobs/${jobId}/save`);
      if (data.saved) {
        setSavedIds(prev => new Set([...prev, jobId]));
      } else {
        setSavedIds(prev => { const s = new Set(prev); s.delete(jobId); return s; });
        if (tab === 'saved') {
          setJobs(prev => prev.filter(j => j._id !== jobId));
        }
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving job');
    }
  };

  const handleMatchJob = async (jobId) => {
    try {
      setMatching(true);
      setMatchError('');
      setMatchResult(null);
      const { data } = await api.post(`/jobs/${jobId}/match`);
      setMatchResult(data.match);
    } catch (err) {
      setMatchError(err.response?.data?.message || 'Error analyzing job match');
    } finally {
      setMatching(false);
    }
  };

  const handleTailorResume = async (jobId) => {
    try {
      setTailoring(true);
      setTailorError('');
      const { data } = await api.post(`/jobs/${jobId}/tailor`);
      setTailoredResume(data.tailoredResume);
    } catch (err) {
      setTailorError(err.response?.data?.message || 'Error tailoring resume');
    } finally {
      setTailoring(false);
    }
  };

  const [trackingState, setTrackingState] = useState(null); // { tracked: bool, appId: str, status: str, error: str }
  const [tracking, setTracking] = useState(false);

  const handleTrackJob = async (jobId) => {
    try {
      setTracking(true);
      setTrackingState(null);
      const { data } = await api.post(`/applications/job/${jobId}/track`);
      setTrackingState({ tracked: true, appId: data._id, status: data.status });
    } catch (err) {
      setTrackingState({ error: err.response?.data?.message || err.message });
    } finally {
      setTracking(false);
    }
  };

  const formatSalary = (salary) => {
    if (!salary || !salary.min) return '';
    const fmt = (n) => n.toLocaleString();
    const cur = salary.currency || 'USD';
    const period = salary.period ? `/${salary.period}` : '';
    if (salary.max) return `${cur} ${fmt(salary.min)} – ${fmt(salary.max)}${period}`;
    return `${cur} ${fmt(salary.min)}+${period}`;
  };

  const remoteBadge = (r) => {
    const colors = { remote: 'success', hybrid: 'warning', onsite: 'secondary', unknown: 'light' };
    return <span className={`badge bg-${colors[r] || 'light'} text-dark`}>{r}</span>;
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <>
      <Navbar />
      <div className="app-container">
        {/* Header Title */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h3 className="mb-1">🔍 Find & Match Jobs</h3>
            <p className="text-muted small mb-0">Search live opportunities, calculate hybrid match scores, and generate tailored ATS resumes.</p>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 bg-light p-1 rounded border d-inline-flex">
          <li className="nav-item">
            <button className={`nav-link py-2 px-3 fw-semibold ${tab === 'search' ? 'active shadow-sm' : ''}`} onClick={() => setTab('search')}>
              Live Search
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link py-2 px-3 fw-semibold ${tab === 'saved' ? 'active shadow-sm' : ''}`} onClick={() => setTab('saved')}>
              Saved Jobs ({savedIds.size})
            </button>
          </li>
        </ul>

      {message && <div className="alert alert-danger">{message}</div>}

      {/* Search Filters */}
      {tab === 'search' && (
        <form className="card shadow-sm mb-4 p-3" onSubmit={handleSearch}>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-bold">Keyword</label>
              <input className="form-control" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. React, Sales, Finance" />
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold">Seniority</label>
              <select className="form-select" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                <option value="all">All Levels</option>
                <option value="entry-level">Entry-level / Intern</option>
                <option value="junior">Junior</option>
                <option value="mid-level">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Manager</option>
                <option value="executive">Executive / Director</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-bold">Sort By</label>
              <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="relevance">Best Relevance</option>
                <option value="salary-desc">Highest Salary</option>
                <option value="salary-asc">Lowest Salary</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>
            <div className="col-md-1">
              <button 
                type="button" 
                className={`btn w-100 ${showAdvanced ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setShowAdvanced(!showAdvanced)}
                title="Toggle Advanced Filters"
              >
                {showAdvanced ? '▲ Less' : '⚙ Filters'}
              </button>
            </div>
          </div>

          {/* Advanced Filter Collapse */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-top">
              <div className="row g-2 align-items-end">
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Employment Type</label>
                  <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                    <option value="">All Types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Work Mode</label>
                  <select className="form-select" value={remote} onChange={e => setRemote(e.target.value)}>
                    <option value="">All Modes</option>
                    <option value="remote">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite Only</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Location</label>
                  <input className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="City / State" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Country</label>
                  <input className="form-control" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Germany, USA" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Company</label>
                  <input className="form-control" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Source</label>
                  <select className="form-select" value={source} onChange={e => setSource(e.target.value)}>
                    {sources.map(s => (
                      <option key={s} value={s}>{s === 'all' ? 'All Sources' : s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="row g-2 align-items-end mt-1">
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Min Salary ($/yr)</label>
                  <input type="number" className="form-control" value={minSalary} onChange={e => setMinSalary(e.target.value)} placeholder="e.g. 60000" />
                </div>
                <div className="col-md-2">
                  <label className="form-label small fw-bold">Max Salary ($/yr)</label>
                  <input type="number" className="form-control" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} placeholder="e.g. 150000" />
                </div>
                <div className="col-md-2">
                  <button type="button" className="btn btn-outline-danger w-100" onClick={handleResetFilters}>
                    ✕ Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Results */}
      {loading && (
        <div className="state-loading">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted fw-medium">Searching live jobs across adapters...</p>
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="state-empty">
          <span className="state-empty-icon">🔎</span>
          <h5 className="state-empty-title">
            {tab === 'search' ? 'No matching jobs found' : 'No saved jobs yet'}
          </h5>
          <p className="state-empty-text">
            {tab === 'search'
              ? 'Try widening your filters, adjusting keywords, or clearing specific location constraints.'
              : 'Save jobs from your search results to easily track and revisit them later.'}
          </p>
          {tab === 'search' && (
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleResetFilters}>
              Reset Filters
            </button>
          )}
        </div>
      )}

      <div className="row">
        {/* Job List */}
        <div className={selectedJob ? 'col-md-5' : 'col-md-12'}>
          {jobs.map(job => (
            <div
              key={job._id}
              className={`job-item-card mb-3 ${selectedJob?._id === job._id ? 'is-selected' : ''}`}
              onClick={() => handleSelectJob(job)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title mb-1">{job.title}</h5>
                  <p className="text-muted mb-1">{job.company} — {job.location || 'N/A'}</p>
                </div>
                <button
                  className={`btn btn-sm ${savedIds.has(job._id) ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={(e) => { e.stopPropagation(); handleToggleSave(job._id); }}
                  title={savedIds.has(job._id) ? 'Unsave' : 'Save'}
                >
                  {savedIds.has(job._id) ? '★' : '☆'}
                </button>
              </div>
              <div className="d-flex gap-2 mt-2 flex-wrap align-items-center">
                <span className="badge bg-secondary">{job.category || 'Other'}</span>
                <span className="badge bg-primary text-capitalize">{job.type}</span>
                {remoteBadge(job.remote)}
                {job.experienceLevel && job.experienceLevel !== 'not-specified' && (
                  <span className="badge bg-dark text-capitalize">{job.experienceLevel}</span>
                )}
                {formatSalary(job.salary) ? (
                  <span className="badge bg-info text-dark">{formatSalary(job.salary)}</span>
                ) : (
                  <span className="badge bg-light text-muted border">Salary unavailable</span>
                )}
                {job.country && (
                  <span className="badge bg-light text-dark border">📍 {job.country}</span>
                )}
              </div>
              {job.skills && job.skills.length > 0 && (
                <div className="mt-2">
                  {job.skills.slice(0, 5).map((s, i) => (
                    <span key={i} className="badge bg-light text-dark border me-1">{s}</span>
                  ))}
                  {job.skills.length > 5 && <span className="text-muted small">+{job.skills.length - 5} more</span>}
                </div>
              )}
              <small className="text-muted d-block mt-2">
                Posted: {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A'} | Source: {job.source}
              </small>
            </div>
          ))}
        </div>

        {/* Job Detail Panel */}
        {selectedJob && (
          <div className="col-md-7">
            <div className="card shadow sticky-top" style={{ top: '1rem' }}>
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h4 className="mb-0">{selectedJob.title}</h4>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedJob(null); setMatchResult(null); setTailoredResume(null); }}>✕</button>
              </div>
              <div className="card-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Structured Job Meta Summary Card */}
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body p-3">
                    <div className="row g-2 small">
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Role:</span>
                        <strong className="text-dark">{selectedJob.title || 'Unavailable'}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Company:</span>
                        <strong className="text-dark">{selectedJob.company || 'Unavailable'}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Location:</span>
                        <span>{selectedJob.location || 'Unavailable'} {selectedJob.country ? `(${selectedJob.country})` : ''}</span>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Category:</span>
                        <span className="badge bg-secondary">{selectedJob.category || 'Other'}</span>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Employment Type:</span>
                        <span className="badge bg-primary text-capitalize">{selectedJob.type || 'Unavailable'}</span>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Work Mode:</span>
                        {remoteBadge(selectedJob.remote)}
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Seniority:</span>
                        <strong className="text-capitalize">{selectedJob.experienceLevel && selectedJob.experienceLevel !== 'not-specified' ? selectedJob.experienceLevel : 'Not specified'}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Salary:</span>
                        <strong>{formatSalary(selectedJob.salary) || 'Salary unavailable'}</strong>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Date Posted:</span>
                        <span>{selectedJob.postedAt ? new Date(selectedJob.postedAt).toLocaleDateString() : 'Unavailable'}</span>
                      </div>
                      <div className="col-sm-6">
                        <span className="text-muted d-block">Source:</span>
                        <span className="badge bg-dark text-uppercase">{selectedJob.source || 'Unavailable'}</span>
                      </div>
                    </div>

                    {(selectedJob.sourceUrl || selectedJob.url) && (
                      <div className="mt-2 pt-2 border-top">
                        <a 
                          href={selectedJob.sourceUrl || selectedJob.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-sm btn-outline-primary"
                        >
                          🔗 Open Original Job Listing ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons: AI Match & Tailor Resume */}
                <div className="d-flex gap-2 mb-3 flex-wrap">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleMatchJob(selectedJob._id)}
                    disabled={matching}
                  >
                    {matching ? 'Analyzing Match...' : '⚡ AI Match Analysis'}
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleTailorResume(selectedJob._id)}
                    disabled={tailoring}
                  >
                    {tailoring ? 'Tailoring Resume (PDF/DOCX)...' : '✨ Tailor Resume for this Job'}
                  </button>
                </div>

                {/* Match Results — Phase 6 Explainable AI */}
                {matchError && <div className="alert alert-warning py-2 small">{matchError}</div>}
                {matchResult && (
                  <div className="card border-info mb-3 bg-light">
                    <div className="card-header d-flex justify-content-between align-items-center py-2">
                      <span className="fw-bold">⚡ Match Analysis</span>
                      <div className="d-flex align-items-center gap-2">
                        {matchResult.aiEnhanced && (
                          <span className="badge bg-primary" title="Score enriched with AI semantic analysis">AI Enhanced</span>
                        )}
                        {matchResult.confidence && (
                          <span className="badge bg-secondary" title="Confidence based on profile completeness">
                            Confidence: {matchResult.confidence}
                          </span>
                        )}
                        <span className={`badge bg-${getScoreColor(matchResult.score)} fs-6`}>
                          {matchResult.score}%
                        </span>
                      </div>
                    </div>
                    <div className="card-body">

                      {/* Score Breakdown */}
                      {matchResult.breakdown && (
                        <div className="mb-3">
                          <small className="fw-bold text-dark d-block mb-1">Score Breakdown:</small>
                          <div className="row g-1">
                            {Object.entries(matchResult.breakdown).map(([dim, { score }]) => (
                              <div key={dim} className="col-6 col-md-4">
                                <div className="d-flex justify-content-between align-items-center bg-white rounded p-1 border">
                                  <span className="small text-muted text-capitalize">{dim}</span>
                                  <span className={`badge bg-${getScoreColor(score)} small`}>{score}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                            Weights: Skills 40% · Experience 25% · Work Mode 10% · Job Type 10% · Salary 10% · Extras 5%
                          </small>
                        </div>
                      )}

                      {/* Matching Skills */}
                      <div className="mb-2">
                        <small className="fw-bold text-success d-block">✅ Strengths (Matching Skills):</small>
                        {matchResult.matchingSkills && matchResult.matchingSkills.length > 0 ? (
                          matchResult.matchingSkills.map((s, i) => (
                            <span key={i} className="badge bg-success me-1 mb-1">{s}</span>
                          ))
                        ) : (
                          <span className="small text-muted">None of the job's listed skills found in your profile</span>
                        )}
                      </div>

                      {/* Missing Skills */}
                      <div className="mb-2">
                        <small className="fw-bold text-danger d-block">⚠️ Potential Gaps (Missing Skills):</small>
                        {matchResult.missingSkills && matchResult.missingSkills.length > 0 ? (
                          matchResult.missingSkills.map((s, i) => (
                            <span key={i} className="badge bg-danger me-1 mb-1">{s}</span>
                          ))
                        ) : (
                          <span className="small text-muted">No major skill gaps detected</span>
                        )}
                      </div>

                      {/* Experience Assessment */}
                      {matchResult.experienceAssessment && (
                        <div className="mb-2">
                          <small className="fw-bold text-dark d-block">📋 Experience:</small>
                          <p className="small mb-1 text-secondary">{matchResult.experienceAssessment}</p>
                        </div>
                      )}

                      {/* Semantic Insights (AI only) */}
                      {matchResult.semanticInsights && (
                        <div className="mb-2">
                          <small className="fw-bold text-primary d-block">🔍 Skill Depth Insights:</small>
                          <p className="small mb-1 text-secondary">{matchResult.semanticInsights}</p>
                        </div>
                      )}

                      {/* Other Gaps (work mode, salary, etc.) */}
                      {matchResult.gaps && matchResult.gaps.length > 0 && (
                        <div className="mb-2">
                          <small className="fw-bold text-warning d-block">💡 Other Considerations:</small>
                          <ul className="small mb-1 ps-3 text-secondary">
                            {matchResult.gaps.map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Overall Explanation */}
                      {matchResult.explanation && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <small className="fw-bold text-primary d-block">
                            {matchResult.aiEnhanced ? '🤖 AI Analysis:' : '📊 Analysis:'}
                          </small>
                          <p className="small mb-0">{matchResult.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tailored Resume Section */}
                {tailorError && <div className="alert alert-danger py-2 small">{tailorError}</div>}
                {tailoredResume && (
                  <div className="card border-success mb-3 bg-white">
                    <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">📄 Tailored ATS Resume Ready</h6>
                      <div className="d-flex gap-2">
                        {tailoredResume.pdfPath && (
                          <a 
                            href={`${FILE_BASE_URL}${tailoredResume.pdfPath}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm btn-light"
                          >
                            Download PDF
                          </a>
                        )}
                        {tailoredResume.docxPath && (
                          <a 
                            href={`${FILE_BASE_URL}${tailoredResume.docxPath}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-sm btn-outline-light"
                          >
                            Download DOCX
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <h6 className="fw-bold text-primary mb-0">{tailoredResume.targetTitle}</h6>
                        <div className="d-flex gap-1">
                          <span className="badge bg-success" title="Structured single-column ATS layout">✓ ATS-Friendly</span>
                          {tailoredResume.isTruthful !== false && (!tailoredResume.unsupportedClaims || tailoredResume.unsupportedClaims.length === 0) ? (
                            <span className="badge bg-info text-dark" title="Grounded in candidate source profile">✓ Verified Truthful</span>
                          ) : (
                            <span className="badge bg-warning text-dark" title="Contains unverified or unsupported claims">⚠️ Review Claims</span>
                          )}
                          <span className="badge bg-secondary" title="Sorted newest to oldest">📅 Reverse Chronological</span>
                        </div>
                      </div>

                      {tailoredResume.unsupportedClaims && tailoredResume.unsupportedClaims.length > 0 && (
                        <div className="alert alert-warning py-1 px-2 small mb-2">
                          <strong>⚠️ Flagged Claims:</strong>
                          <ul className="mb-0 ps-3">
                            {tailoredResume.unsupportedClaims.map((claim, idx) => (
                              <li key={idx}>{claim}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <p className="small text-secondary mb-2">{tailoredResume.summary}</p>
                      
                      <small className="fw-bold d-block">Prioritized Skills:</small>
                      <div className="mb-2">
                        {tailoredResume.skills && tailoredResume.skills.map((s, i) => (
                          <span key={i} className="badge bg-light text-dark border me-1 mb-1">{s}</span>
                        ))}
                      </div>

                      {tailoredResume.experience && tailoredResume.experience.length > 0 && (
                        <>
                          <small className="fw-bold d-block mt-2">Tailored Experience Highlights:</small>
                          {tailoredResume.experience.map((exp, i) => (
                            <div key={i} className="small mb-2">
                              <strong>{exp.position}</strong> — {exp.company}
                              <ul className="mb-0 ps-3">
                                {(exp.highlights || []).map((h, hi) => <li key={hi}>{h}</li>)}
                              </ul>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Track Application Section */}
                <div className="card border-primary mb-3 mt-3 bg-white shadow-sm">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">📋 Track This Application</h6>
                    <a href="/applications" className="btn btn-sm btn-light text-primary fw-bold">
                      View All Applications ↗
                    </a>
                  </div>
                  <div className="card-body py-2">
                    {trackingState?.error && (
                      <p className="text-danger small mb-2">⚠️ {trackingState.error}</p>
                    )}
                    {trackingState?.tracked ? (
                      <div>
                        <p className="text-success small fw-bold mb-1">
                          ✅ Job is being tracked — status: <strong>{trackingState.status}</strong>
                        </p>
                        <p className="text-muted small mb-0">
                          Manage this application in the{' '}
                          <a href="/applications" className="text-primary">Applications Tracker</a>{' '}
                          to update status, add notes, and link your tailored resume.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="small text-muted mb-2">
                          Save this job to your application tracker. You can then manage the full
                          workflow: <em>Saved → Preparing → Ready for Review → Applied → Interview → Offer</em>.
                        </p>
                        <button
                          className="btn btn-primary btn-sm fw-bold"
                          onClick={() => handleTrackJob(selectedJob._id)}
                          disabled={tracking}
                        >
                          {tracking ? 'Adding…' : '🔖 Track This Job'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h6>Job Description</h6>
                <p style={{ whiteSpace: 'pre-line' }}>{selectedJob.description || <span className="text-muted small fst-italic">Description unavailable.</span>}</p>

                <h6>Requirements</h6>
                {selectedJob.requirements && selectedJob.requirements.length > 0 ? (
                  <ul>
                    {selectedJob.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : (
                  <p className="text-muted small fst-italic">Requirements were not specified in the original posting.</p>
                )}

                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <>
                    <h6>Skills</h6>
                    <div className="mb-3">
                      {selectedJob.skills.map((s, i) => (
                        <span key={i} className="badge bg-light text-dark border me-1 mb-1">{s}</span>
                      ))}
                    </div>
                  </>
                )}

                <div className="d-flex gap-2 mt-3">
                  <button
                    className={`btn ${savedIds.has(selectedJob._id) ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => handleToggleSave(selectedJob._id)}
                  >
                    {savedIds.has(selectedJob._id) ? '★ Saved' : '☆ Save Job'}
                  </button>
                  {selectedJob.url && (
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
                      View Original Listing ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {tab === 'search' && pagination.pages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <li key={p} className={`page-item ${p === pagination.page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => fetchJobs(p)}>{p}</button>
              </li>
            ))}
          </ul>
          <p className="text-center text-muted">{pagination.total} jobs found</p>
        </nav>
      )}
    </div>
  </>
);
}

export default Jobs;
