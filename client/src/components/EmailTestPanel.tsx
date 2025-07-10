import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Mail, Send, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export function EmailTestPanel() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [dueDateLoading, setDueDateLoading] = useState(false);
  const [result, setResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail) {
      setResult({ type: 'error', message: 'Please enter an email address' });
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleDueDateReminderTest = async () => {
    setDueDateLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/due-date-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResult({
        type: data.success ? 'success' : 'error',
        message: data.message
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: 'Failed to trigger due date reminder check'
      });
    } finally {
      setDueDateLoading(false);
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Service Testing
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

        {/* Test Email Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Email Address
            </label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test"
              className="w-full"
            />
          </div>
          
          <Button
            onClick={handleTestEmail}
            disabled={loading || !testEmail}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <Button
            onClick={handleDueDateReminderTest}
            disabled={dueDateLoading}
            variant="outline"
            className="w-full"
          >
            <Clock className="h-4 w-4 mr-2" />
            {dueDateLoading ? 'Checking...' : 'Test Due Date Reminders'}
          </Button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This will check all users and send due date reminders to those who qualify.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-2">
            Email Configuration Status
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>• Make sure SendGrid API key is configured in Settings</p>
            <p>• Email templates should be properly formatted</p>
            <p>• Due date reminders are sent automatically every 24 hours</p>
            <p>• Manual reminders can be sent from user management</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
