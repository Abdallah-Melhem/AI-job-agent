import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

function Integrations() {
  const { user } = useContext(AuthContext);
  const [providers, setProviders] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectModal, setConnectModal] = useState(null);
  const [toolResult, setToolResult] = useState(null);
  const [toolCalling, setToolCalling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, intRes] = await Promise.all([
        api.get('/integrations/providers'),
        api.get('/integrations')
      ]);
      setProviders(provRes.data.providers || []);
      setIntegrations(intRes.data || []);
    } catch (err) {
      setMessage('Error loading integrations data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConnect = async (providerName) => {
    try {
      setMessage('');
      setLoading(true);
      const authRes = await api.get(`/integrations/${providerName}/auth?toolkit=github`);
      const { url, sessionId, toolkit, instructions } = authRes.data;

      setConnectModal({
        provider: providerName,
        url,
        sessionId,
        toolkit: toolkit || 'github',
        instructions
      });
    } catch (err) {
      setMessage(`Error initiating ${providerName}: ` + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmConnect = async () => {
    if (!connectModal) return;
    try {
      setLoading(true);
      await api.post(`/integrations/${connectModal.provider}/connect`, {
        sessionId: connectModal.sessionId,
        toolkit: connectModal.toolkit
      });
      setMessage(`${connectModal.provider} connected successfully!`);
      setConnectModal(null);
      fetchData();
    } catch (err) {
      setMessage(`Error confirming connection: ` + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (providerName) => {
    try {
      setMessage('');
      setLoading(true);
      await api.post(`/integrations/${providerName}/disconnect`);
      setMessage(`${providerName} disconnected.`);
      setToolResult(null);
      fetchData();
    } catch (err) {
      setMessage(`Error disconnecting ${providerName}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestToolCall = async (providerName) => {
    try {
      setToolCalling(true);
      setToolResult(null);
      setMessage('');
      const res = await api.post(`/integrations/${providerName}/execute`, {
        action: 'COMPOSIO_SEARCH_TOOLS',
        params: { query: 'github repository' }
      });
      setToolResult(res.data);
      setMessage(`Composio tool call executed! Log ID: ${res.data.logId || 'success'}`);
    } catch (err) {
      setMessage(`Tool call error: ` + (err.response?.data?.message || err.message));
    } finally {
      setToolCalling(false);
    }
  };

  const getIntegration = (providerName) => {
    return integrations.find(i => i.provider === providerName);
  };

  return (
    <>
      <Navbar />
      <div className="app-container">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h3 className="mb-1">🔌 Integrations & External Toolkits</h3>
            <p className="text-muted small mb-0">
              Connect verified third-party tools via <strong>Composio Platform</strong> to empower your AI Agent with GitHub, Gmail, and developer APIs.
            </p>
          </div>
          <span className="badge bg-primary px-3 py-2">Composio SDK Ready</span>
        </div>

      {message && (
        <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} alert-dismissible`}>
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
        </div>
      )}

      {/* Connect Link Modal / Banner */}
      {connectModal && (
        <div className="card border-primary mb-4 shadow-sm">
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Connect {connectModal.provider.toUpperCase()} ({connectModal.toolkit})</h5>
            <button className="btn btn-sm btn-light" onClick={() => setConnectModal(null)}>Cancel</button>
          </div>
          <div className="card-body">
            <p>{connectModal.instructions}</p>
            <div className="mb-3">
              <a
                href={connectModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success me-2"
              >
                🔗 Open Connect Link (OAuth)
              </a>
              <button
                className="btn btn-primary"
                onClick={handleConfirmConnect}
                disabled={loading}
              >
                {loading ? 'Verifying...' : '✅ I Authorized, Confirm Connection'}
              </button>
            </div>
            <small className="text-muted">
              Connect Link: <code className="text-break">{connectModal.url}</code>
            </small>
          </div>
        </div>
      )}

      <div className="row mt-4">
        {providers.map(provider => {
          const integration = getIntegration(provider);
          const isConnected = integration && integration.status === 'active';

          return (
            <div className="col-md-6 mb-4" key={provider}>
              <div className="card shadow-sm h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="card-title text-capitalize mb-0">{provider}</h5>
                    {isConnected ? (
                      <span className="badge bg-success">Active Connection</span>
                    ) : (
                      <span className="badge bg-secondary">Not Connected</span>
                    )}
                  </div>

                  <p className="card-text text-muted small flex-grow-1">
                    Connect apps like GitHub, Gmail, and Slack using Composio Sessions. Once connected, your AI Agent can search tools, execute actions, and interact with external APIs on your behalf.
                  </p>

                  {isConnected && (
                    <div className="bg-light p-2 rounded mb-3 small font-monospace">
                      <div><strong>Session ID:</strong> {integration.accountId || 'active'}</div>
                      <div><strong>Status:</strong> {integration.status}</div>
                      <div><strong>Connected:</strong> {new Date(integration.updatedAt || Date.now()).toLocaleTimeString()}</div>
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    {isConnected ? (
                      <>
                        <button
                          className="btn btn-outline-primary btn-sm flex-grow-1"
                          onClick={() => handleTestToolCall(provider)}
                          disabled={toolCalling}
                        >
                          {toolCalling ? 'Executing Tool...' : '⚡ Test Real Tool Call'}
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDisconnect(provider)}
                          disabled={loading}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm w-100"
                        onClick={() => handleStartConnect(provider)}
                        disabled={loading}
                      >
                        Connect {provider}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && providers.length === 0 && (
          <p className="text-muted">No integration providers registered.</p>
        )}
      </div>

      {/* Tool Call Result Display */}
      {toolResult && (
        <div className="card shadow-sm mt-4 border-success">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">⚡ Live Composio Tool Call Output</h5>
            {toolResult.logId && (
              <span className="badge bg-light text-dark font-monospace">Log ID: {toolResult.logId}</span>
            )}
          </div>
          <div className="card-body">
            <div className="alert alert-info py-2">
              <strong>Action Executed:</strong> <code>{toolResult.action}</code>
              <br />
              <strong>Composio Cloud Log ID:</strong> <code>{toolResult.logId}</code>
            </div>
            <h6>Response Data:</h6>
            <pre className="bg-dark text-light p-3 rounded" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {JSON.stringify(toolResult.data || toolResult.result || toolResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  </>
);
}

export default Integrations;
