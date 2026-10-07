import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

function Profile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    phone: '',
    location: '',
    summary: '',
    skills: '',
    languages: '',
    certifications: '',
    achievements: '',
    links: { linkedin: '', github: '', portfolio: '' },
    education: [],
    experience: [],
    projects: []
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/profile');
        if (data) {
          setProfile({
            ...data,
            summary: data.summary || '',
            skills: data.skills ? data.skills.join(', ') : '',
            languages: data.languages ? data.languages.join(', ') : '',
            certifications: data.certifications ? data.certifications.join(', ') : '',
            achievements: data.achievements ? data.achievements.join(', ') : '',
            links: data.links || { linkedin: '', github: '', portfolio: '' },
            education: data.education || [],
            experience: data.experience || [],
            projects: data.projects || []
          });
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          setMessage('Error loading profile');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['linkedin', 'github', 'portfolio'].includes(name)) {
      setProfile({ ...profile, links: { ...profile.links, [name]: value } });
    } else {
      setProfile({ ...profile, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...profile,
        summary: profile.summary || '',
        skills: profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        languages: profile.languages ? profile.languages.split(',').map(l => l.trim()).filter(Boolean) : [],
        certifications: profile.certifications ? profile.certifications.split(',').map(c => c.trim()).filter(Boolean) : [],
        achievements: profile.achievements ? profile.achievements.split(',').map(a => a.trim()).filter(Boolean) : []
      };
      await api.post('/profile', payload);
      setMessage('Profile saved successfully!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving profile');
    }
  };

  if (loading) return <div className="container mt-5">Loading profile...</div>;

  return (
    <div className="container mt-5 mb-5">
      <Navbar />
      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Candidate Profile</h3>
          <Link to="/cv" className="btn btn-sm btn-outline-primary">Import / Parse from CV</Link>
        </div>
        <div className="card-body p-4">
          {message && <div className="alert alert-info">{message}</div>}
          
          <form onSubmit={handleSubmit}>
            <h5 className="mb-3 border-bottom pb-2">Personal & Contact Information</h5>
            <div className="row mb-3">
              <div className="col-md-6 mb-2">
                <label className="form-label">Phone</label>
                <input type="text" className="form-control" name="phone" value={profile.phone || ''} onChange={handleChange} />
              </div>
              <div className="col-md-6 mb-2">
                <label className="form-label">Location</label>
                <input type="text" className="form-control" name="location" value={profile.location || ''} onChange={handleChange} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Professional Summary</label>
              <textarea 
                className="form-control" 
                name="summary" 
                value={profile.summary || ''} 
                onChange={handleChange} 
                rows="3" 
                placeholder="Brief summary of your professional background, core expertise, and career goals..." 
              />
            </div>

            <h5 className="mt-4 mb-3 border-bottom pb-2">Online Profiles & Links</h5>
            <div className="row mb-3">
              <div className="col-md-4 mb-2">
                <label className="form-label">LinkedIn</label>
                <input type="text" className="form-control" name="linkedin" value={profile.links.linkedin || ''} onChange={handleChange} />
              </div>
              <div className="col-md-4 mb-2">
                <label className="form-label">GitHub</label>
                <input type="text" className="form-control" name="github" value={profile.links.github || ''} onChange={handleChange} />
              </div>
              <div className="col-md-4 mb-2">
                <label className="form-label">Portfolio</label>
                <input type="text" className="form-control" name="portfolio" value={profile.links.portfolio || ''} onChange={handleChange} />
              </div>
            </div>

            <h5 className="mt-4 mb-3 border-bottom pb-2">Skills, Languages, Certifications & Achievements</h5>
            <div className="mb-3">
              <label className="form-label">Skills (comma separated)</label>
              <textarea className="form-control" name="skills" value={profile.skills || ''} onChange={handleChange} rows="2" />
            </div>
            <div className="row mb-3">
              <div className="col-md-6 mb-2">
                <label className="form-label">Languages (comma separated)</label>
                <input type="text" className="form-control" name="languages" value={profile.languages || ''} onChange={handleChange} />
              </div>
              <div className="col-md-6 mb-2">
                <label className="form-label">Certifications (comma separated)</label>
                <input type="text" className="form-control" name="certifications" value={profile.certifications || ''} onChange={handleChange} />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">Key Achievements & Honors (comma separated)</label>
              <input 
                type="text" 
                className="form-control" 
                name="achievements" 
                value={profile.achievements || ''} 
                onChange={handleChange} 
                placeholder="e.g. Employee of the Year 2025, Open Source Contributor, AWS Community Builder" 
              />
            </div>

            {/* Education Summary */}
            <h5 className="mt-4 mb-3 border-bottom pb-2">Education History ({profile.education.length})</h5>
            {profile.education.length === 0 ? (
              <p className="text-muted fst-italic">No education recorded yet. Parse a CV to automatically import your education.</p>
            ) : (
              <div className="row">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="col-md-6 mb-3">
                    <div className="card h-100 border">
                      <div className="card-body">
                        <h6 className="card-title fw-bold text-primary mb-1">{edu.degree || 'Degree'}</h6>
                        <p className="card-subtitle text-muted mb-2">{edu.institution || 'Institution'}</p>
                        <small className="text-secondary">
                          {edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : edu.startDate || edu.endDate}
                          {edu.gpa && ` | GPA: ${edu.gpa}`}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Experience Summary */}
            <h5 className="mt-4 mb-3 border-bottom pb-2">Work Experience ({profile.experience.length})</h5>
            {profile.experience.length === 0 ? (
              <p className="text-muted fst-italic">No experience recorded yet. Parse a CV to automatically import your experience.</p>
            ) : (
              <div className="row">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="col-md-12 mb-3">
                    <div className="card border">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="card-title fw-bold text-dark mb-1">{exp.position || 'Position'}</h6>
                            <p className="card-subtitle text-muted mb-2">{exp.company || 'Company'}</p>
                          </div>
                          <span className="badge bg-light text-dark border">
                            {exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : exp.startDate || exp.endDate}
                          </span>
                        </div>
                        {exp.responsibilities && (
                          <p className="card-text small text-secondary mt-2 mb-0" style={{ whiteSpace: 'pre-line' }}>
                            {exp.responsibilities}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects Summary */}
            {profile.projects && profile.projects.length > 0 && (
              <>
                <h5 className="mt-4 mb-3 border-bottom pb-2">Projects ({profile.projects.length})</h5>
                <div className="row">
                  {profile.projects.map((proj, idx) => (
                    <div key={idx} className="col-md-6 mb-3">
                      <div className="card h-100 border">
                        <div className="card-body">
                          <h6 className="card-title fw-bold">{proj.name}</h6>
                          <p className="card-text small text-muted">{proj.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary mt-3">Save Profile Updates</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
