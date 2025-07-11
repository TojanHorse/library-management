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
  Edit3,
  Trash2
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
  const [currentTemplate, setCurrentTemplate] = useState<'welcome' | 'dueDate' | 'payment'>('welcome');
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [testResults, setTestResults] = useState<{
    email?: boolean;
    telegram?: boolean;
  }>({});
  const [showChatIdModal, setShowChatIdModal] = useState(false);
  const [chatIdLoading, setChatIdLoading] = useState(false);
  const [chatIdResults, setChatIdResults] = useState<{
    chatIds: string[];
    chatDetails: Array<{
      id: string;
      type: string;
      title?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      lastMessage?: string;
      messageCount: number;
    }>;
    message: string;
  } | null>(null);
  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [showEditBotModal, setShowEditBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState<any>(null);
  const [newBot, setNewBot] = useState({
    nickname: '',
    botToken: '',
    chatIds: [] as string[],
    notifications: {
      newUser: true,
      feeDue: true,
      feeOverdue: true,
      feePaid: true
    },
    settings: {
      sendSilently: false,
      protectContent: false,
      threadId: '',
      serverUrl: 'https://api.telegram.org'
    }
  });

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiService.getSettings();
        
        // Ensure all slot timings have default values
        const defaultSlotTimings = {
          Morning: '6:00 AM - 12:00 PM',
          Afternoon: '12:00 PM - 6:00 PM',
          Evening: '6:00 PM - 12:00 AM',
          '12Hour': '6:00 AM - 6:00 PM',
          '24Hour': '24 Hours Access'
        };

        const defaultSlotPricing = {
          Morning: 500,
          Afternoon: 500,
          Evening: 500,
          '12Hour': 900,
          '24Hour': 1500
        };

        const normalizedSettings = {
          ...settings,
          slotTimings: { ...defaultSlotTimings, ...settings.slotTimings },
          slotPricing: { ...defaultSlotPricing, ...settings.slotPricing }
        };

        setFormData(normalizedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: normalizedSettings });
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast?.error('Failed to load settings');
      }
    };
    loadSettings();
  }, [dispatch, toast]);

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
      // Check if bot token and chat IDs are configured
      if (!formData.telegramBotToken) {
        toast.warning('Please configure bot token first');
        setLoading(false);
        return;
      }

      if (!formData.telegramChatIds || formData.telegramChatIds.length === 0) {
        toast.warning('Please add at least one Chat ID to test Telegram');
        setLoading(false);
        return;
      }

      // Save settings first to ensure they're available for the test
      await handleSave();

      const response = await fetch('/api/test/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Use empty body to test with dynamic settings
      });

      const data = await response.json();
      setTestResults(prev => ({ ...prev, telegram: data.success }));
      
      if (data.success) {
        toast.success(`Telegram test successful! ${data.usedDynamicConfig ? '(Used saved settings)' : ''}`);
      } else {
        toast.error(data.message || 'Telegram test failed!');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, telegram: false }));
      toast.error('Telegram test failed! Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetChatIds = async () => {
    if (!formData.telegramBotToken) {
      toast.error('Bot token is required', 'Please enter your Telegram bot token first');
      return;
    }

    setChatIdLoading(true);
    setChatIdResults(null);
    
    try {
      const response = await fetch('/api/telegram/get-chat-ids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: formData.telegramBotToken,
          serverUrl: formData.telegramServerUrl || 'https://api.telegram.org'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setChatIdResults(data);
        toast.success('Chat IDs fetched successfully', data.message);
      } else {
        toast.error('Failed to fetch chat IDs', data.message);
      }
    } catch (error) {
      console.error('Error fetching chat IDs:', error);
      toast.error('Error fetching chat IDs', 'Network error occurred');
    } finally {
      setChatIdLoading(false);
    }
  };

  const handleAddChatId = (chatId: string) => {
    if (!formData.telegramChatIds.includes(chatId)) {
      setFormData(prev => ({
        ...prev,
        telegramChatIds: [...prev.telegramChatIds, chatId]
      }));
      toast.success('Chat ID added', `Chat ID ${chatId} added to your list`);
    } else {
      toast.warning('Chat ID already exists', 'This chat ID is already in your list');
    }
  };

  const handleAddBot = async () => {
    if (!newBot.nickname || !newBot.botToken) {
      toast.error('Please fill in nickname and bot token');
      return;
    }

    try {
      const response = await fetch('/api/telegram/bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBot),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setFormData(prev => ({
          ...prev,
          telegramBots: [...(prev.telegramBots || []), data.bot]
        }));
        
        // Reset form
        setNewBot({
          nickname: '',
          botToken: '',
          chatIds: [],
          notifications: {
            newUser: true,
            feeDue: true,
            feeOverdue: true,
            feePaid: true
          },
          settings: {
            sendSilently: false,
            protectContent: false,
            threadId: '',
            serverUrl: 'https://api.telegram.org'
          }
        });
        
        setShowAddBotModal(false);
        toast.success('Bot added successfully', data.message);
      } else {
        toast.error('Failed to add bot', data.message);
      }
    } catch (error) {
      toast.error('Error adding bot', 'Network error occurred');
    }
  };

  const handleEditBot = async () => {
    if (!editingBot || editingBot.index === undefined) return;

    try {
      const response = await fetch(`/api/telegram/bots/${editingBot.index}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingBot),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setFormData(prev => {
          const newBots = [...(prev.telegramBots || [])];
          newBots[editingBot.index] = data.bot;
          return { ...prev, telegramBots: newBots };
        });
        
        setShowEditBotModal(false);
        setEditingBot(null);
        toast.success('Bot updated successfully', data.message);
      } else {
        toast.error('Failed to update bot', data.message);
      }
    } catch (error) {
      toast.error('Error updating bot', 'Network error occurred');
    }
  };

  const handleDeleteBot = async (index: number) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;

    try {
      const response = await fetch(`/api/telegram/bots/${index}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setFormData(prev => {
          const newBots = [...(prev.telegramBots || [])];
          newBots.splice(index, 1);
          return { ...prev, telegramBots: newBots };
        });
        
        toast.success('Bot deleted successfully', data.message);
      } else {
        toast.error('Failed to delete bot', data.message);
      }
    } catch (error) {
      toast.error('Error deleting bot', 'Network error occurred');
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

  const handleChangePassword = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordChange.currentPassword,
          newPassword: passwordChange.newPassword
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Password changed successfully!');
        setPasswordChange({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowChangePasswordModal(false);
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Error changing password', 'Network error occurred');
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

  const previewTemplate = (template: 'welcome' | 'dueDate' | 'payment') => {
    let templateContent = '';
    if (template === 'welcome') {
      templateContent = formData.welcomeEmailTemplate;
    } else if (template === 'dueDate') {
      templateContent = formData.dueDateEmailTemplate;
    } else {
      templateContent = formData.paymentConfirmationEmailTemplate || '';
    }
    
    // Sample data for preview
    const sampleData = {
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '+91 9876543210',
      seatNumber: 15,
      slot: 'Morning',
      idType: 'Aadhar Card',
      validTill: '2024-02-15',
      dueDate: '2024-02-12',
      paidDate: '2024-01-15',
      nextDueDate: '2024-02-15',
      amount: '₹1200'
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
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="px-6"
              >
                {loading ? 'Saving...' : 'Save Slot Configuration'}
              </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Payment Confirmation</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sent when payment is received</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentTemplate('payment');
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
                      setCurrentTemplate('payment');
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Provider
                </label>
                <select
                  value={formData.emailProvider || 'gmail'}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailProvider: e.target.value as 'gmail' | 'outlook' | 'custom' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                  <option value="custom">Custom SMTP</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  value={formData.emailUser || formData.gmail || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    emailUser: e.target.value,
                    gmail: e.target.value 
                  }))}
                  placeholder="your-email@gmail.com"
                  type="email"
                />
                <Input
                  label="App Password"
                  value={formData.emailPassword || formData.appPassword || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    emailPassword: e.target.value,
                    appPassword: e.target.value 
                  }))}
                  placeholder="Gmail app password"
                  type="password"
                />
              </div>

              {formData.emailProvider === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="SMTP Host"
                    value={formData.smtpHost || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.example.com"
                  />
                  <Input
                    label="SMTP Port"
                    value={formData.smtpPort || 587}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                    type="number"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.smtpSecure || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                      className="rounded"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Use SSL/TLS
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button onClick={handleTestEmail} loading={loading}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Email
                </Button>
                <Button onClick={handleSave} loading={loading}>
                  Save Email Configuration
                </Button>
              </div>
            </div>
          </Card>

          {/* Telegram Configuration */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Telegram Notification</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Default enabled</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.telegramDefaultEnabled || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, telegramDefaultEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              {/* Notification Type Header */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">📱 Notification Type: Telegram</h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Configure Telegram notifications for user registrations, fee reminders, and payment updates.
                </p>
              </div>

              {/* Bot Management Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Bot Configuration</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bot Token
                    </label>
                    <Input
                      value={newBot.botToken}
                      onChange={(e) => setNewBot(prev => ({ ...prev, botToken: e.target.value }))}
                      placeholder="Enter your bot token from @BotFather"
                      type="password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bot Nickname
                    </label>
                    <Input
                      value={newBot.nickname}
                      onChange={(e) => setNewBot(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="Give your bot a nickname"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Types
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newBot.notifications?.newUser || false}
                          onChange={(e) => setNewBot(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, newUser: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">New User Registration</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newBot.notifications?.feeDue || false}
                          onChange={(e) => setNewBot(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, feeDue: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Fee Due Reminder</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newBot.notifications?.feeOverdue || false}
                          onChange={(e) => setNewBot(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, feeOverdue: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Fee Overdue</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newBot.notifications?.feePaid || false}
                          onChange={(e) => setNewBot(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, feePaid: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Payment Confirmation</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Button
                      onClick={handleAddBot}
                      disabled={loading || !newBot.botToken || !newBot.nickname}
                      className="w-full"
                    >
                      {loading ? 'Adding Bot...' : 'Add Telegram Bot'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Bots List */}
              {formData.telegramBots && formData.telegramBots.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Configured Bots</h4>
                  {formData.telegramBots.map((bot, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">{bot.nickname}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Notifications: {Object.entries(bot.notifications || {})
                              .filter(([_, enabled]) => enabled)
                              .map(([type, _]) => type)
                              .join(', ') || 'None'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBot({ ...bot, index });
                              setShowEditBotModal(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteBot(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friendly Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Friendly Name
                </label>
                <Input
                  value={formData.telegramFriendlyName || 'VidhyaDham Alert'}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegramFriendlyName: e.target.value }))}
                  placeholder="My Telegram Alert (1)"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A friendly name to identify this notification configuration.
                </p>
              </div>

              {/* Bot Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Token
                </label>
                <Input
                  value={formData.telegramBotToken || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                  placeholder="Enter your bot token from @BotFather"
                  type="password"
                  className="w-full font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can get a token from{' '}
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    https://t.me/BotFather
                  </a>
                </p>
              </div>

              {/* Chat ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chat ID
                </label>
                <textarea
                  rows={3}
                  value={formData.telegramChatIds?.join('\n') || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    telegramChatIds: e.target.value.split('\n').filter(id => id.trim())
                  }))}
                  placeholder="123456789&#10;-987654321&#10;Channel chat ID"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                  <p>Support Direct Chat / Group / Channel's Chat ID (one per line)</p>
                  <div className="flex gap-2 items-center mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChatIdModal(true)}
                      disabled={!formData.telegramBotToken}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Get Chat IDs
                    </Button>
                    <span className="text-xs text-gray-400">
                      Send a message to your bot first, then click this button
                    </span>
                  </div>
                  <p>
                    Or manually get your chat ID by going to this URL:
                  </p>
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                    https://api.telegram.org/bot{formData.telegramBotToken || '<YOUR BOT TOKEN HERE>'}/getUpdates
                  </code>
                </div>
              </div>

              {/* Message Thread ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  (Optional) Message Thread ID
                </label>
                <Input
                  value={formData.telegramThreadId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegramThreadId: e.target.value }))}
                  placeholder="Message Thread ID"
                  className="w-full font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Optional Unique identifier for the target message thread (topic) of the forum; for forum supergroups only
                </p>
              </div>

              {/* Server URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  (Optional) Server URL
                </label>
                <Input
                  value={formData.telegramServerUrl || 'https://api.telegram.org'}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegramServerUrl: e.target.value }))}
                  placeholder="https://api.telegram.org"
                  className="w-full font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  To lift Telegram's bot api limitations or gain access in blocked areas (China, Iran, etc). Default: https://api.telegram.org
                </p>
              </div>

              {/* Advanced Options */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Advanced Options</h4>
                
                <div className="space-y-4">
                  {/* Custom Message Template */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Use custom message template
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        If enabled, the message will be sent using a custom template.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.telegramCustomTemplate || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, telegramCustomTemplate: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Send Silently */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Send Silently
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Sends the message silently. Users will receive a notification with no sound.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.telegramSendSilently || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, telegramSendSilently: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Protect Forwarding/Saving */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Protect Forwarding/Saving
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        If enabled, the bot messages in Telegram will be protected from forwarding and saving.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.telegramProtectContent || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, telegramProtectContent: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Test and Apply Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleTestTelegram} loading={loading} className="flex-1">
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Telegram Notification
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Apply settings to all existing monitors/users
                      toast.info('Telegram settings will be applied to all existing notifications');
                    }}
                    className="flex-1"
                  >
                    Apply on all existing monitors
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Test the configuration or apply these settings to all existing user notifications.
                </p>
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowChangePasswordModal(true)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
                <Button onClick={() => setShowAddAdminModal(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage administrator accounts and security settings.
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

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Change Admin Password"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Security Notice:</strong> Changing your password will require you to log in again.
            </p>
          </div>
          
          <Input
            label="Current Password"
            type="password"
            value={passwordChange.currentPassword}
            onChange={(e) => setPasswordChange(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Enter your current password"
          />
          
          <Input
            label="New Password"
            type="password"
            value={passwordChange.newPassword}
            onChange={(e) => setPasswordChange(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Enter new password (minimum 6 characters)"
          />
          
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordChange.confirmPassword}
            onChange={(e) => setPasswordChange(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowChangePasswordModal(false);
                setPasswordChange({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Change Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Email Template Modal */}
      <Modal
        isOpen={showEmailTemplateModal}
        onClose={() => setShowEmailTemplateModal(false)}
        title={`Edit ${currentTemplate === 'welcome' ? 'Welcome' : currentTemplate === 'dueDate' ? 'Due Date' : 'Payment Confirmation'} Email Template`}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Content
            </label>
            <textarea
              rows={15}
              value={currentTemplate === 'welcome' ? formData.welcomeEmailTemplate : 
                     currentTemplate === 'dueDate' ? formData.dueDateEmailTemplate : 
                     formData.paymentConfirmationEmailTemplate || ''}
              onChange={(e) => {
                const fieldName = currentTemplate === 'welcome' ? 'welcomeEmailTemplate' : 
                                  currentTemplate === 'dueDate' ? 'dueDateEmailTemplate' : 
                                  'paymentConfirmationEmailTemplate';
                setFormData(prev => ({
                  ...prev,
                  [fieldName]: e.target.value
                }));
              }}
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
              {currentTemplate === 'payment' && (
                <>
                  <div>{'{{paidDate}}'} - Payment date</div>
                  <div>{'{{nextDueDate}}'} - Next due date</div>
                  <div>{'{{amount}}'} - Payment amount</div>
                </>
              )}
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
        title={`Preview ${currentTemplate === 'welcome' ? 'Welcome' : currentTemplate === 'dueDate' ? 'Due Date' : 'Payment Confirmation'} Email Template`}
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

      {/* Chat ID Fetcher Modal */}
      <Modal
        isOpen={showChatIdModal}
        onClose={() => setShowChatIdModal(false)}
        title="Get Chat IDs"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to get your Chat ID:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Send a message to your bot on Telegram</li>
              <li>Click the "Fetch Chat IDs" button below</li>
              <li>Select the chat IDs you want to add</li>
            </ol>
          </div>
          
          <div className="flex justify-center">
            <Button
              onClick={handleGetChatIds}
              loading={chatIdLoading}
              disabled={!formData.telegramBotToken}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Fetch Chat IDs
            </Button>
          </div>
          
          {chatIdResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Found {chatIdResults.chatDetails.length} chat(s)
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {chatIdResults.totalUpdates} total updates
                </span>
              </div>
              
              {chatIdResults.chatDetails.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {chatIdResults.chatDetails.map((chat) => (
                    <div key={chat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {chat.id}
                          </span>
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {chat.type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {chat.title || `${chat.firstName || ''} ${chat.lastName || ''}`.trim() || chat.username || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                          Last: {chat.lastMessage}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddChatId(chat.id)}
                        disabled={formData.telegramChatIds.includes(chat.id)}
                      >
                        {formData.telegramChatIds.includes(chat.id) ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No chats found. Send a message to your bot first!</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowChatIdModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Bot Modal */}
      <Modal isOpen={showEditBotModal} onClose={() => setShowEditBotModal(false)}>
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Edit Telegram Bot</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bot Token
              </label>
              <Input
                value={editingBot?.botToken || ''}
                onChange={(e) => setEditingBot(prev => ({ ...prev, botToken: e.target.value }))}
                placeholder="Enter your bot token from @BotFather"
                type="password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bot Nickname
              </label>
              <Input
                value={editingBot?.nickname || ''}
                onChange={(e) => setEditingBot(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Give your bot a nickname"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chat IDs
              </label>
              <textarea
                rows={3}
                value={editingBot?.chatIds?.join('\n') || ''}
                onChange={(e) => setEditingBot(prev => ({
                  ...prev,
                  chatIds: e.target.value.split('\n').filter(id => id.trim())
                }))}
                placeholder="123456789&#10;-987654321&#10;Channel chat ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Types
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingBot?.notifications?.newUser || false}
                    onChange={(e) => setEditingBot(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, newUser: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">New User Registration</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingBot?.notifications?.feeDue || false}
                    onChange={(e) => setEditingBot(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, feeDue: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fee Due Reminder</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingBot?.notifications?.feeOverdue || false}
                    onChange={(e) => setEditingBot(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, feeOverdue: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Fee Overdue</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingBot?.notifications?.feePaid || false}
                    onChange={(e) => setEditingBot(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, feePaid: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Payment Confirmation</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEditBotModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBot}
              disabled={loading || !editingBot?.botToken || !editingBot?.nickname}
            >
              {loading ? 'Updating...' : 'Update Bot'}
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