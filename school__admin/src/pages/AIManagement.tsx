import React, { useState, useEffect, useRef } from 'react';
import './ManagementPage.css';
import './AIManagement.css';
import LoadingScreen from '../components/LoadingScreen';
import api from '../services/api';

interface AiSettings {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  enabled: boolean;
  lastUpdated: any;
  lastTestedAt: any;
  lastTestResult: string | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Chat testing state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await api.post('/ai/test-key', { apiKey });
      setTestResult({
        success: response.data.success,
        message: response.data.message,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to test API key',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/ai/settings', {
        apiKey,
        enabled: true,
      });

      if (response.data.success) {
        setTestResult({ success: true, message: 'AI settings saved successfully!' });
        fetchSettings();
        setApiKey(''); // Clear the input after saving
      } else {
        setTestResult({ success: false, message: response.data.message || 'Failed to save settings' });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAi = async () => {
    if (!settings?.hasApiKey) {
      setTestResult({ success: false, message: 'Please configure an API key first' });
      return;
    }

    try {
      const response = await api.post('/ai/toggle', {
        enabled: !settings.enabled,
      });

      if (response.data.success) {
        fetchSettings();
        setTestResult({ success: true, message: response.data.message });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to toggle AI status',
      });
    }
  };

  const handleSendTestMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await api.post('/ai/test-chat', { message: chatInput });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.success 
          ? response.data.response 
          : `Error: ${response.data.message}`,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTestMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="management-page ai-management">
      <div className="page-header">
        <div>
          <h1>🤖 AI Management</h1>
          <p className="page-subtitle">Configure and test the AI assistant for students</p>
        </div>
      </div>

      {/* Status Alert */}
      {testResult && (
        <div className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
          <span className="alert-icon">
            {testResult.success ? '✓' : '✕'}
          </span>
          <span>{testResult.message}</span>
          <button className="alert-close" onClick={() => setTestResult(null)}>×</button>
        </div>
      )}

      <div className="ai-management-grid">
        {/* Configuration Card */}
        <div className="ai-card">
          <div className="ai-card-header">
            <h2>⚙️ Configuration</h2>
            <div className={`status-badge ${settings?.enabled ? 'status-active' : 'status-inactive'}`}>
              {settings?.enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <div className="ai-card-content">
            {/* Current Status */}
            {settings?.hasApiKey && (
              <div className="current-key-info">
                <div className="info-row">
                  <span className="info-label">Current API Key:</span>
                  <code className="api-key-preview">{settings.apiKeyPreview}</code>
                </div>
                {settings.lastUpdated && (
                  <div className="info-row">
                    <span className="info-label">Last Updated:</span>
                    <span>{new Date(settings.lastUpdated._seconds * 1000).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* API Key Input */}
            <div className="form-group">
              <label htmlFor="apiKey">
                {settings?.hasApiKey ? 'Update API Key' : 'Gemini API Key'}
              </label>
              <div className="api-key-input-wrapper">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="form-input"
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="form-hint">
                Get your free API key from{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                onClick={handleTestKey}
                disabled={testing || !apiKey.trim()}
              >
                {testing ? (
                  <>
                    <span className="spinner"></span>
                    Testing...
                  </>
                ) : (
                  '🧪 Test Key'
                )}
              </button>

              <button
                className="btn btn-primary"
                onClick={handleSaveSettings}
                disabled={saving || !apiKey.trim()}
              >
                {saving ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : (
                  '💾 Save Settings'
                )}
              </button>
            </div>

            {/* Toggle Button */}
            {settings?.hasApiKey && (
              <div className="toggle-section">
                <div className="toggle-info">
                  <h3>AI Assistant Status</h3>
                  <p>Enable or disable the AI assistant for all students</p>
                </div>
                <button
                  className={`toggle-btn ${settings.enabled ? 'toggle-on' : 'toggle-off'}`}
                  onClick={handleToggleAi}
                >
                  <span className="toggle-slider"></span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Testing Card */}
        <div className="ai-card chat-card">
          <div className="ai-card-header">
            <h2>💬 Test Chat</h2>
            {chatMessages.length > 0 && (
              <button className="btn btn-text" onClick={clearChat}>
                Clear
              </button>
            )}
          </div>

          <div className="chat-container" ref={chatContainerRef}>
            {chatMessages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">💬</div>
                <p>Send a test message to verify the AI is working correctly</p>
                {!settings?.hasApiKey && (
                  <p className="chat-warning">⚠️ Configure an API key first</p>
                )}
              </div>
            ) : (
              <div className="chat-messages">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.role}`}>
                    <div className="message-avatar">
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{msg.content}</div>
                      <div className="message-time">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message assistant">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={settings?.hasApiKey ? "Type a test message..." : "Configure API key first"}
              disabled={!settings?.hasApiKey || chatLoading}
              className="chat-input"
            />
            <button
              className="send-btn"
              onClick={handleSendTestMessage}
              disabled={!settings?.hasApiKey || chatLoading || !chatInput.trim()}
            >
              {chatLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="info-card-icon">📚</div>
          <h3>How it works</h3>
          <p>
            The AI assistant helps students with their studies by providing context-aware responses 
            based on their courses and homework assignments. Students can use /courses and /homework 
            commands to get personalized help.
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-icon">🔒</div>
          <h3>Security</h3>
          <p>
            Your API key is stored securely and is used server-side only. Students never see or 
            have access to the API key. All AI requests are processed through your backend.
          </p>
        </div>

        <div className="info-card">
          <div className="info-card-icon">💡</div>
          <h3>Tips</h3>
          <p>
            Use the test chat to verify your configuration before enabling for students. 
            Monitor your API usage in Google AI Studio to track costs and usage patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIManagement;
