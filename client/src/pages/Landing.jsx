import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import 'bootstrap/dist/css/bootstrap.min.css';

function Landing() {
  return (
    <div className="container mt-5">
      <Navbar />
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <h1 className="display-4 fw-bold mb-4">AI Job Agent</h1>
          <p className="lead mb-5">
            Discover suitable job opportunities, evaluate them against your CV, and automate your applications with your personal AI Job Agent.
          </p>
          <Link to="/dashboard" className="btn btn-primary btn-lg">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Landing;
