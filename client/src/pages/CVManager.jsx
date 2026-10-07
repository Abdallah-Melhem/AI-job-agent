import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api, { FILE_BASE_URL } from '../services/api';

function CVManager() {
  const { user } = useContext(AuthContext);
  const [cvs, setCvs] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Parsing & Review State
  const [parsingId, setParsingId] = useState(null);
  const [parsedReview, setParsedReview] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchCVs = async () => {
    try {
      const { data } = await api.get('/cv');
      setCvs(data);
    } catch (err) {
      setMessage('Error loading CVs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('cv', file);

    try {
      setMessage('Uploading...');
      await api.post('/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('CV uploaded successfully!');
      setFile(null);
      const inputEl = document.getElementById('cv-upload-input');
      if (inputEl) inputEl.value = '';
      fetchCVs();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error uploading CV');
    }
  };

  const handleDownload = async (cv) => {
    try {
      setMessage('Downloading...');
      const response = await api.get(`/cv/${cv._id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: cv.mimetype || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cv.originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error downloading CV');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this CV?')) return;
    try {
      await api.delete(`/cv/${id}`);
      setMessage('CV deleted');
      if (parsedReview && parsedReview.cvId === id) {
        setParsedReview(null);
      }
      fetchCVs();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error deleting CV');
    }
  };

  const handleParse = async (cv) => {
    try {
      setParsingId(cv._id);
      setMessage('');
      setSaveSuccess('');
      const response = await api.post(`/cv/${cv._id}/parse`);
      const extracted = response.data.data;
      const isScanned = Boolean(response.data.isScanned);
      const warningMsg = response.data.warning || (isScanned ? response.data.message : '');

      if (isScanned) {
        setMessage(warningMsg);
      }

      // Initialize review form with extracted data
      setParsedReview({
        cvId: cv._id,
        originalName: cv.originalName,
        candidateName: extracted.name || extracted.personalInfo?.name || '',
        phone: extracted.contact?.phone || extracted.personalInfo?.phone || '',
        location: extracted.contact?.location || extracted.personalInfo?.location || '',
        summary: extracted.summary || extracted.personalInfo?.summary || '',
        isScanned: isScanned,
        warning: warningMsg,
        links: {
          linkedin: extracted.contact?.links?.linkedin || extracted.personalInfo?.links?.linkedin || '',
          github: extracted.contact?.links?.github || extracted.personalInfo?.links?.github || '',
          portfolio: extracted.contact?.links?.portfolio || extracted.personalInfo?.links?.portfolio || ''
        },
        skills: extracted.skills ? extracted.skills.join(', ') : '',
        languages: extracted.languages ? extracted.languages.join(', ') : '',
        education: extracted.education || [],
        experience: extracted.experience || [],
        projects: extracted.projects || [],
        certifications: extracted.certifications ? extracted.certifications.join(', ') : '',
        achievements: extracted.achievements ? extracted.achievements.join(', ') : ''
      });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to parse CV');
    } finally {
      setParsingId(null);
    }
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    if (['linkedin', 'github', 'portfolio'].includes(name)) {
      setParsedReview(prev => ({
        ...prev,
        links: { ...prev.links, [name]: value }
      }));
    } else {
      setParsedReview(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Education array handlers
  const handleAddEdu = () => {
    setParsedReview(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', startDate: '', endDate: '', gpa: '' }]
    }));
  };

  const handleEduChange = (index, field, value) => {
    setParsedReview(prev => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const handleRemoveEdu = (index) => {
    setParsedReview(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  // Experience array handlers
  const handleAddExp = () => {
    setParsedReview(prev => ({
      ...prev,
      experience: [...prev.experience, { company: '', position: '', startDate: '', endDate: '', responsibilities: '' }]
    }));
  };

  const handleExpChange = (index, field, value) => {
    setParsedReview(prev => {
      const updated = [...prev.experience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  };

  const handleRemoveExp = (index) => {
    setParsedReview(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  // Confirm and Save to Profile
  const handleSaveToProfile = async (e) => {
    e.preventDefault();
    try {
      setSaveSuccess('');
      const payload = {
        phone: parsedReview.phone,
        location: parsedReview.location,
        summary: parsedReview.summary,
        links: parsedReview.links,
        skills: parsedReview.skills ? parsedReview.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        languages: parsedReview.languages ? parsedReview.languages.split(',').map(l => l.trim()).filter(Boolean) : [],
        certifications: parsedReview.certifications ? parsedReview.certifications.split(',').map(c => c.trim()).filter(Boolean) : [],
        achievements: parsedReview.achievements ? parsedReview.achievements.split(',').map(a => a.trim()).filter(Boolean) : [],
        education: parsedReview.education,
        experience: parsedReview.experience,
        projects: parsedReview.projects
      };

      await api.post('/profile', payload);
      setSaveSuccess('Extracted candidate information successfully verified and saved to your Candidate Profile!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving to profile');
    }
  };

  if (loading) {
    return (
      <div className="state-loading">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading CVs and resumes...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="app-container">
        <div className="mb-4">
          <h3 className="mb-1">📄 CV & Resume Documents</h3>
          <p className="text-muted small mb-0">Upload master CVs, run structured text extraction, and review extracted profile data.</p>
        </div>

      {/* Upload Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h3 className="mb-0">Upload CV</h3>
        </div>
        <div className="card-body p-4">
          {message && <div className={`alert ${message.includes('Error') || message.includes('Failed') ? 'alert-danger' : 'alert-info'}`}>{message}</div>}
          <form onSubmit={handleUpload}>
            <div className="mb-3">
              <label className="form-label">Select CV File (PDF, DOCX, TXT, or RTF, max 5MB)</label>
              <input 
                id="cv-upload-input"
                type="file" 
                className="form-control" 
                accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,text/rtf" 
                onChange={handleFileChange} 
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!file}>Upload CV</button>
          </form>
        </div>
      </div>

      {/* Uploaded CVs List */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h4 className="mb-0">Your Uploaded CVs</h4>
        </div>
        <div className="card-body p-4">
          {cvs.length === 0 ? (
            <div className="state-empty my-1 border-0">
              <span className="state-empty-icon">📁</span>
              <h6 className="state-empty-title">No CV documents uploaded yet</h6>
              <p className="state-empty-text">
                Upload your primary PDF or DOCX resume above. The parser will extract your experience, skills, and education for automated job matching.
              </p>
            </div>
          ) : (
            <ul className="list-group">
              {cvs.map((cv) => (
                <li key={cv._id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <strong>{cv.originalName}</strong> <br />
                    <small className="text-muted">
                      Uploaded: {new Date(cv.createdAt).toLocaleDateString()} | 
                      Size: {(cv.size / 1024 / 1024).toFixed(2)} MB
                    </small>
                  </div>
                  <div>
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={() => handleParse(cv)}
                      disabled={parsingId === cv._id}
                    >
                      {parsingId === cv._id ? 'Parsing CV...' : 'Parse CV'}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => handleDownload(cv)}
                    >
                      Download / View
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger" 
                      onClick={() => handleDelete(cv._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* CV Parsing Review & Correction Section */}
      {parsedReview && (
        <div className="card shadow border-primary mb-4">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h4 className="mb-0">Review & Correct Parsed CV ({parsedReview.originalName})</h4>
            <button className="btn btn-sm btn-light" onClick={() => setParsedReview(null)}>Close Review</button>
          </div>
          <div className="card-body p-4">
            <p className="text-muted">
              The CV text has been extracted and parsed into structured fields. Please review and correct any details before saving them to your Candidate Profile.
            </p>

            {saveSuccess && (
              <div className="alert alert-success d-flex justify-content-between align-items-center">
                <span>{saveSuccess}</span>
                <Link to="/profile" className="btn btn-sm btn-primary">View Candidate Profile</Link>
              </div>
            )}

            {parsedReview.isScanned && (
              <div className="alert alert-warning mb-3">
                <strong>⚠️ Scanned / Image Document Notice:</strong> {parsedReview.warning || 'Scanned or image-only PDF detected (no text layer). OCR is not enabled. Please enter your information manually below or upload a text-based document.'}
              </div>
            )}

            <form onSubmit={handleSaveToProfile}>
              {/* Contact Information */}
              <h5 className="border-bottom pb-2 mb-3">Extracted Personal & Contact Info</h5>
              <div className="row mb-3">
                <div className="col-md-6 mb-2">
                  <label className="form-label">Detected Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="candidateName"
                    value={parsedReview.candidateName}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-6 mb-2">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={parsedReview.phone}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-12 mb-2">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-control"
                    name="location"
                    value={parsedReview.location}
                    onChange={handleReviewChange}
                    placeholder="e.g. New York, USA or Remote"
                  />
                </div>
              </div>

              {/* Professional Summary */}
              <h5 className="border-bottom pb-2 mb-3">Professional Summary</h5>
              <div className="mb-3">
                <textarea
                  className="form-control"
                  name="summary"
                  rows="3"
                  value={parsedReview.summary || ''}
                  onChange={handleReviewChange}
                  placeholder="Overview of professional background, expertise, and objectives..."
                />
              </div>

              {/* Links */}
              <h5 className="border-bottom pb-2 mb-3">Online Presence / Links</h5>
              <div className="row mb-3">
                <div className="col-md-4 mb-2">
                  <label className="form-label">LinkedIn</label>
                  <input
                    type="text"
                    className="form-control"
                    name="linkedin"
                    value={parsedReview.links.linkedin}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-4 mb-2">
                  <label className="form-label">GitHub</label>
                  <input
                    type="text"
                    className="form-control"
                    name="github"
                    value={parsedReview.links.github}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-4 mb-2">
                  <label className="form-label">Portfolio</label>
                  <input
                    type="text"
                    className="form-control"
                    name="portfolio"
                    value={parsedReview.links.portfolio}
                    onChange={handleReviewChange}
                  />
                </div>
              </div>

              {/* Skills & Languages */}
              <h5 className="border-bottom pb-2 mb-3">Skills, Languages & Achievements</h5>
              <div className="mb-3">
                <label className="form-label">Skills (comma separated)</label>
                <textarea
                  className="form-control"
                  name="skills"
                  rows="3"
                  value={parsedReview.skills}
                  onChange={handleReviewChange}
                />
              </div>
              <div className="row mb-3">
                <div className="col-md-6 mb-2">
                  <label className="form-label">Languages (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="languages"
                    value={parsedReview.languages}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-6 mb-2">
                  <label className="form-label">Certifications (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="certifications"
                    value={parsedReview.certifications}
                    onChange={handleReviewChange}
                  />
                </div>
                <div className="col-md-12 mb-2">
                  <label className="form-label">Key Achievements & Awards (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="achievements"
                    value={parsedReview.achievements || ''}
                    onChange={handleReviewChange}
                    placeholder="e.g. Dean's List 2024, Hackathon Winner, Published Researcher"
                  />
                </div>
              </div>

              {/* Education Section */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="mb-0">Education</h5>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleAddEdu}>+ Add Education</button>
              </div>
              {parsedReview.education.length === 0 ? (
                <p className="text-muted fst-italic">No education entries extracted. Click above to add one.</p>
              ) : (
                parsedReview.education.map((edu, idx) => (
                  <div key={idx} className="p-3 mb-3 bg-light rounded border">
                    <div className="d-flex justify-content-between">
                      <h6>Education #{idx + 1}</h6>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveEdu(idx)}>Remove</button>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Degree / Program</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={edu.degree || ''}
                          onChange={(e) => handleEduChange(idx, 'degree', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Institution / University</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={edu.institution || ''}
                          onChange={(e) => handleEduChange(idx, 'institution', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4 mb-2">
                        <label className="form-label">Start Date / Year</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={edu.startDate || ''}
                          onChange={(e) => handleEduChange(idx, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4 mb-2">
                        <label className="form-label">End Date / Year</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={edu.endDate || ''}
                          onChange={(e) => handleEduChange(idx, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-4 mb-2">
                        <label className="form-label">GPA (optional)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={edu.gpa || ''}
                          onChange={(e) => handleEduChange(idx, 'gpa', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Experience Section */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3 mt-4">
                <h5 className="mb-0">Work Experience</h5>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleAddExp}>+ Add Experience</button>
              </div>
              {parsedReview.experience.length === 0 ? (
                <p className="text-muted fst-italic">No experience entries extracted. Click above to add one.</p>
              ) : (
                parsedReview.experience.map((exp, idx) => (
                  <div key={idx} className="p-3 mb-3 bg-light rounded border">
                    <div className="d-flex justify-content-between">
                      <h6>Experience #{idx + 1}</h6>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveExp(idx)}>Remove</button>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Position / Job Title</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={exp.position || ''}
                          onChange={(e) => handleExpChange(idx, 'position', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Company</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={exp.company || ''}
                          onChange={(e) => handleExpChange(idx, 'company', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Start Date</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={exp.startDate || ''}
                          onChange={(e) => handleExpChange(idx, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">End Date</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={exp.endDate || ''}
                          onChange={(e) => handleExpChange(idx, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="col-md-12 mb-2">
                        <label className="form-label">Responsibilities / Description</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows="3"
                          value={exp.responsibilities || ''}
                          onChange={(e) => handleExpChange(idx, 'responsibilities', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary btn-lg">
                  Confirm & Save to Candidate Profile
                </button>
                <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => setParsedReview(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </>
);
}

export default CVManager;
