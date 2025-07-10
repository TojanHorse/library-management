import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Mail, Settings, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function EmailConfigPanel() {
  const { state, dispatch } = useApp();
  const [config, setConfig] = useState({
    emailProvider: state.settings.emailProvider,
    emailUser: state.settings.emailUser,
    emailPassword: state.settings.emailPassword,
    smtpHost: state.settings.smtpHost || '',
    smtpPort: state.settings.smtpPort || 587,
    smtpSecure: state.settings.smtpSecure || false
  });
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('myashmengwal1@gmail.com');
  const [result, setResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);

    try {
      const updatedSettings = {
        ...state.settings,
        ...config
      };

      // Make API call to save settings
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const savedSettings = await response.json();
      dispatch({ type: 'SET_SETTINGS', payload: savedSettings });
      
      setResult({
        type: 'success',
        message: 'Email configuration saved successfully! You can now test email sending.'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setResult({
        type: 'error',
        message: 'Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setResult({ type: 'error', message: 'Please enter a test email address' });
      return;
    }

    setTestingEmail(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();
      setResult({
        type: data.success ? 'success' : 'error',
        message: data.message
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to send test email'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const isConfigurationComplete = config.emailUser !== 'your-email@gmail.com' && 
                                  config.emailPassword !== 'your-app-password' &&
                                  config.emailUser && config.emailPassword;

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Configuration
          </h3>
          
          {result && (
            <div className={`mb-4 p-3 rounded-lg flex items-center ${
              result.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {result.type === 'success' ? (
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>

        {/* Email Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Provider
          </label>
          <select
            value={config.emailProvider}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              emailProvider: e.target.value as 'gmail' | 'outlook' | 'custom',
              smtpHost: e.target.value === 'gmail' ? 'smtp.gmail.com' : 
                       e.target.value === 'outlook' ? 'smtp-mail.outlook.com' : '',
              smtpPort: 587,
              smtpSecure: false
            }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="custom">Custom SMTP</option>
          </select>
        </div>

        {/* Email Configuration */}
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={config.emailUser}
            onChange={(e) => setConfig(prev => ({ ...prev, emailUser: e.target.value }))}
            placeholder="your-email@gmail.com"
            required
          />
          
          <Input
            label={config.emailProvider === 'gmail' ? 'App Password' : 'Email Password'}
            type="password"
            value={config.emailPassword}
            onChange={(e) => setConfig(prev => ({ ...prev, emailPassword: e.target.value }))}
            placeholder={config.emailProvider === 'gmail' ? 'Your Gmail app password' : 'Your email password'}
            required
          />

          {config.emailProvider === 'custom' && (
            <>
              <Input
                label="SMTP Host"
                value={config.smtpHost}
                onChange={(e) => setConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                placeholder="smtp.your-provider.com"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SMTP Port"
                  type="number"
                  value={config.smtpPort}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                  placeholder="587"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secure Connection
                  </label>
                  <select
                    value={config.smtpSecure ? 'true' : 'false'}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtpSecure: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="false">STARTTLS (587)</option>
                    <option value="true">SSL/TLS (465)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Gmail Setup Instructions */}
        {config.emailProvider === 'gmail' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-2 flex items-center">
              <Info className="h-4 w-4 mr-2" />
              Gmail Setup Instructions
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <p><strong>Step-by-step setup:</strong></p>
              <p>1. Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline">Google Account Security</a></p>
              <p>2. Enable 2-Factor Authentication if not already enabled</p>
              <p>3. Go to "App passwords" section</p>
              <p>4. Create a new app password for "VidhyaDham"</p>
              <p>5. Copy the generated 16-character password</p>
              <p>6. Use your Gmail address and the app password above</p>
              <p className="text-xs mt-2 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                <strong>Important:</strong> Use the app password (16 characters), not your regular Gmail password!
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleSave}
            disabled={saving || !config.emailUser || !config.emailPassword}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Test Email Section */}
        {isConfigurationComplete && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Test Email Configuration
            </h4>
            
            <div className="space-y-4">
              <Input
                label="Test Email Address"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to test"
              />
              
              <Button
                onClick={handleTestEmail}
                disabled={testingEmail || !testEmail}
                variant="outline"
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
