import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Header } from './layout/Header';
import { Modal } from './ui/Modal';
import { Settings as SettingsIcon, Mail, MessageSquare, TestTube, UserPlus, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

export function Settings() {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState(state.settings);
  const [loading, setLoading] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [testResults, setTestResults] = useState<{
    email?: boolean;
    telegram?: boolean;
  }>({});

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedSettings = await apiService.updateSettings(formData);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    try {
      const success = await apiService.testEmail();
      setTestResults(prev => ({ ...prev, email: success }));
      alert(success ? 'Email test successful!' : 'Email test failed!');
    } catch (error) {
      setTestResults(prev => ({ ...prev, email: false }));
      alert('Email test failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    setLoading(true);
    try {
      const success = await apiService.testTelegram();
      setTestResults(prev => ({ ...prev, telegram: success }));
      alert(success ? 'Telegram test successful!' : 'Telegram test failed!');
    } catch (error) {
      setTestResults(prev => ({ ...prev, telegram: false }));
      alert('Telegram test failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username.trim() || !newAdmin.password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // In a real app, this would call the backend
      alert(`Admin "${newAdmin.username}" added successfully!`);
      setNewAdmin({ username: '', password: '' });
      setShowAddAdminModal(false);
    } catch (error) {
      alert('Failed to add admin');
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" subtitle="Configure system settings and preferences" />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pricing Settings */}
          <Card>
            <div className="flex items-center mb-6">
              <SettingsIcon className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Slot Pricing</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Morning Slot (6 AM - 12 PM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    value={formData.slotPricing.Morning}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slotPricing: {
                        ...prev.slotPricing,
                        Morning: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Afternoon Slot (12 PM - 6 PM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    value={formData.slotPricing.Afternoon}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slotPricing: {
                        ...prev.slotPricing,
                        Afternoon: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Evening Slot (6 PM - 12 AM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    value={formData.slotPricing.Evening}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slotPricing: {
                        ...prev.slotPricing,
                        Evening: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> 12-hour slot combines Morning + Afternoon pricing. 24-hour slot combines all three slot prices.
              </p>
            </div>
          </Card>

          {/* Email Settings */}
          <Card>
            <div className="flex items-center mb-6">
              <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Gmail Address"
                type="email"
                value={formData.gmail}
                onChange={(e) => setFormData(prev => ({ ...prev, gmail: e.target.value.trim() }))}
                placeholder="your-email@gmail.com"
              />
              <Input
                label="App Password"
                type="password"
                value={formData.appPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, appPassword: e.target.value.trim() }))}
                placeholder="App password from Gmail"
              />
            </div>
            <div className="mt-4 flex items-center space-x-4">
              <Button
                onClick={handleTestEmail}
                variant="outline"
                size="sm"
                loading={loading}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Email
              </Button>
              {testResults.email !== undefined && (
                <span className={`text-sm ${testResults.email ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResults.email ? '✓ Working' : '✗ Failed'}
                </span>
              )}
            </div>
          </Card>

          {/* Telegram Settings */}
          <Card>
            <div className="flex items-center mb-6">
              <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Telegram Configuration</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chat IDs (one per line)
              </label>
              <textarea
                value={formData.telegramChatIds.join('\n')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  telegramChatIds: e.target.value.split('\n').filter(id => id.trim())
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="123456789&#10;-987654321"
              />
            </div>
            <div className="mt-4 flex items-center space-x-4">
              <Button
                onClick={handleTestTelegram}
                variant="outline"
                size="sm"
                loading={loading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Test Telegram
              </Button>
              {testResults.telegram !== undefined && (
                <span className={`text-sm ${testResults.telegram ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResults.telegram ? '✓ Working' : '✗ Failed'}
                </span>
              )}
            </div>
          </Card>

          {/* Admin Management */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Admin Management</h3>
              </div>
              <Button onClick={() => setShowAddAdminModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current admin: <span className="font-medium text-gray-900 dark:text-white">{state.currentAdmin}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Use the "Add Admin" button to create additional administrator accounts.
              </p>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setFormData(state.settings)}>
              Reset Changes
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Save Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
        title="Add New Admin"
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={newAdmin.username}
            onChange={(e) => setNewAdmin(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Enter admin username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter admin password"
            required
          />
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleAddAdmin}>
              Add Admin
            </Button>
            <Button variant="outline" onClick={() => setShowAddAdminModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}