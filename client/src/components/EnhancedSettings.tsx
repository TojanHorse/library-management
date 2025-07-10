import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Header } from './layout/Header';
import { Modal } from './ui/Modal';
import { EmailConfigPanel } from './EmailConfigPanel';
import { 
  Settings as SettingsIcon, 
  Mail, 
  MessageSquare, 
  TestTube, 
  UserPlus, 
  Shield, 
  Clock, 
  DollarSign,
  Send,
  Eye,
  Edit3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { useToast } from './ui/Toast';

export function EnhancedSettings() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [formData, setFormData] = useState(state.settings);
  const [loading, setLoading] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<'welcome' | 'dueDate'>('welcome');
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [testResults, setTestResults] = useState<{
    email?: boolean;
    telegram?: boolean;
  }>({});

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiService.getSettings();
        setFormData(settings);
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [dispatch]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedSettings = await apiService.updateSettings(formData);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    try {
      const success = await apiService.testEmail();
      setTestResults(prev => ({ ...prev, email: success }));
      if (success) {
        toast.success('Email test successful!');
      } else {
        toast.error('Email test failed!');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, email: false }));
      toast.error('Email test failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    setLoading(true);
    try {
      const success = await apiService.testTelegram();
      setTestResults(prev => ({ ...prev, telegram: success }));
      if (success) {
        toast.success('Telegram test successful!');
      } else {
        toast.error('Telegram test failed!');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, telegram: false }));
      toast.error('Telegram test failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username.trim() || !newAdmin.password.trim()) {
      toast.warning('Please fill in all fields');
      return;
    }

    try {
      await apiService.createAdmin(newAdmin);
      toast.success(`Admin "${newAdmin.username}" added successfully!`);
      setNewAdmin({ username: '', password: '' });
      setShowAddAdminModal(false);
    } catch (error) {
      toast.error('Failed to add admin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSlotTimingChange = (slot: string, timing: string) => {
    setFormData(prev => ({
      ...prev,
      slotTimings: {
        ...prev.slotTimings,
        [slot]: timing
      }
    }));
  };

  const previewTemplate = (template: 'welcome' | 'dueDate') => {
    const templateContent = template === 'welcome' ? formData.welcomeEmailTemplate : formData.dueDateEmailTemplate;
    
    // Sample data for preview
    const sampleData = {
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '+91 9876543210',
      seatNumber: 15,
      slot: 'Morning',
      idType: 'Aadhar Card',
      validTill: '2024-02-15',
      dueDate: '2024-02-12'
    };

    return templateContent.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      return String(sampleData[key as keyof typeof sampleData] || match);
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" subtitle="Configure system settings and preferences" />
      
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Time Slot Configuration */}
          <Card>
            <div className="flex items-center mb-6">
              <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Time Slot Configuration</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(formData.slotTimings || {}).map(([slot, timing]) => (
                <div key={slot} className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">{slot} Slot</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Range
                    </label>
                    <input
                      type="text"
                      value={timing as string}
                      onChange={(e) => handleSlotTimingChange(slot, e.target.value)}
                      placeholder="e.g., 6:00 AM - 12:00 PM"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Price (₹)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.slotPricing?.[slot] || 0}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          slotPricing: {
                            ...prev.slotPricing,
                            [slot]: parseInt(e.target.value) || 0
                          }
                        }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Email Templates */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Templates</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Welcome Email</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sent when a new user registers</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate('welcome');
                      setShowEmailTemplateModal(true);
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate('welcome');
                      setShowPreviewModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Due Date Reminder</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sent when payment is due</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate('dueDate');
                      setShowEmailTemplateModal(true);
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate('dueDate');
                      setShowPreviewModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Email Configuration */}
          <Card>
            <div className="flex items-center mb-6">
              <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="SendGrid API Key"
                value={formData.sendgridApiKey || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, sendgridApiKey: e.target.value }))}
                placeholder="Enter SendGrid API key"
                type="password"
              />
              <Input
                label="Gmail Address"
                value={formData.gmail}
                onChange={(e) => setFormData(prev => ({ ...prev, gmail: e.target.value }))}
                placeholder="your-email@gmail.com"
              />
              <Input
                label="App Password"
                value={formData.appPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, appPassword: e.target.value }))}
                placeholder="Gmail app password"
                type="password"
              />
              <div className="flex items-end">
                <Button onClick={handleTestEmail} loading={loading} className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
              </div>
            </div>
          </Card>

          {/* Telegram Configuration */}
          <Card>
            <div className="flex items-center mb-6">
              <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Telegram Configuration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chat IDs (one per line)
                </label>
                <textarea
                  rows={4}
                  value={formData.telegramChatIds?.join('\n') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    telegramChatIds: e.target.value.split('\n').filter(id => id.trim())
                  }))}
                  placeholder="Enter Telegram chat IDs"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleTestTelegram} loading={loading} className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Telegram
                </Button>
              </div>
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
            <p className="text-gray-600 dark:text-gray-400">
              Manage administrator accounts for system access.
            </p>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={loading} size="lg">
              <Send className="h-4 w-4 mr-2" />
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
            placeholder="Enter username"
          />
          <Input
            label="Password"
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Enter password"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddAdminModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAdmin}>
              Add Admin
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Template Modal */}
      <Modal
        isOpen={showEmailTemplateModal}
        onClose={() => setShowEmailTemplateModal(false)}
        title={`Edit ${currentTemplate === 'welcome' ? 'Welcome' : 'Due Date'} Email Template`}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Content
            </label>
            <textarea
              rows={15}
              value={currentTemplate === 'welcome' ? formData.welcomeEmailTemplate : formData.dueDateEmailTemplate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                [currentTemplate === 'welcome' ? 'welcomeEmailTemplate' : 'dueDateEmailTemplate']: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Variables:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div>{'{{name}}'} - User's name</div>
              <div>{'{{email}}'} - User's email</div>
              <div>{'{{phone}}'} - Phone number</div>
              <div>{'{{seatNumber}}'} - Seat number</div>
              <div>{'{{slot}}'} - Time slot</div>
              <div>{'{{idType}}'} - ID document type</div>
              <div>{'{{validTill}}'} - Valid until date</div>
              <div>{'{{dueDate}}'} - Due date</div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEmailTemplateModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreviewModal(true)}
            >
              Preview
            </Button>
            <Button onClick={() => setShowEmailTemplateModal(false)}>
              Save Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Template Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={`Preview ${currentTemplate === 'welcome' ? 'Welcome' : 'Due Date'} Email Template`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewTemplate(currentTemplate) }}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Configuration Section */}
      <div className="mt-6">
        <EmailConfigPanel />
      </div>
    </div>
  );
}