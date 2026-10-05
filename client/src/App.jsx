import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CVManager from './pages/CVManager';
import Jobs from './pages/Jobs';
import AgentDashboard from './pages/AgentDashboard';
import Integrations from './pages/Integrations';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/cv" element={<CVManager />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/agent" element={<AgentDashboard />} />
          <Route path="/integrations" element={<Integrations />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
