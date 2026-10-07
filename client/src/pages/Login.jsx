import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="app-container d-flex align-items-center justify-content-center" style={{ minHeight: '75vh' }}>
        <div className="card shadow-md border-0 p-3" style={{ maxWidth: '440px', width: '100%' }}>
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <span className="fs-1 d-block mb-1">🔐</span>
              <h3 className="fw-bold mb-1">Sign In</h3>
              <p className="text-muted small">Access your job matches and application tracker</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center">
                <span className="me-2">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">Email address</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="text-center mt-4 pt-2 border-top">
              <small className="text-muted">
                Don't have an account yet? <Link to="/register" className="fw-semibold text-primary">Create Account</Link>
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
