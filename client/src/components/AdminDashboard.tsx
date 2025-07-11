import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Edit, Trash2, Eye, Filter, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { apiService } from '../services/api';
import { useToast } from './ui/Toast';

export function AdminDashboard() {
  const { state, dispatch } = useApp();
  const { toast, confirm } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [filters, setFilters] = useState({
    slot: '',
    feeStatus: '',
    search: ''
  });
  const [loading, setLoading] = useState(false);

  const filteredUsers = state.users.filter(user => {
    const matchesSlot = !filters.slot || user.slot === filters.slot;
    const matchesStatus = !filters.feeStatus || user.feeStatus === filters.feeStatus;
    const matchesSearch = !filters.search || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSlot && matchesStatus && matchesSearch;
  });

  const handleMarkPaid = async (userId: string) => {
    try {
      // Call the backend endpoint that handles payment confirmation and emails
      const response = await fetch(`/api/users/${userId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        const user = state.users.find(u => u.id === userId);
        if (user) {
          const updatedUser = {
            ...user,
            feeStatus: 'paid' as const,
            logs: [...user.logs, {
              id: Date.now().toString(),
              action: 'Fee marked as paid',
              timestamp: new Date().toISOString(),
              adminId: state.currentAdmin || 'admin'
            }]
          };

          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
          
          // Update seat status
          const seat = state.seats.find(s => s.number === user.seatNumber);
          if (seat) {
            dispatch({ type: 'UPDATE_SEAT', payload: { ...seat, status: 'paid' } });
          }
        }
        
        toast?.success('Payment marked as paid!', 'Confirmation email sent successfully');
      } else {
        toast?.error('Failed to mark as paid', result.message);
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      toast?.error('Failed to mark as paid', 'Network error occurred');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this user?', 'This action cannot be undone.');
    if (confirmed) {
      try {
        const user = state.users.find(u => u.id === userId);
        await apiService.deleteUser(userId);
        
        if (user) {
          // Free up the seat
          const seat = state.seats.find(s => s.number === user.seatNumber);
          if (seat) {
            dispatch({ type: 'UPDATE_SEAT', payload: { ...seat, status: 'available', userId: undefined } });
          }
        }
        
        dispatch({ type: 'DELETE_USER', payload: userId });
        toast.success('User deleted successfully');
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedUser: User) => {
    try {
      const result = await apiService.updateUser(updatedUser);
      dispatch({ type: 'UPDATE_USER', payload: result });
      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDownloadCsv = async () => {
    setLoading(true);
    try {
      const blob = await apiService.downloadCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      const blob = await apiService.downloadPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRowColor = (user: User) => {
    switch (user.feeStatus) {
      case 'paid':
        return 'bg-green-50';
      case 'due':
        return 'bg-yellow-50';
      case 'expired':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <div className="flex space-x-2">
          <Button onClick={handleDownloadCsv} loading={loading} size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleDownloadPdf} loading={loading} size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        />
        <select
          value={filters.slot}
          onChange={(e) => setFilters(prev => ({ ...prev, slot: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Slots</option>
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Evening">Evening</option>
        </select>
        <select
          value={filters.feeStatus}
          onChange={(e) => setFilters(prev => ({ ...prev, feeStatus: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="due">Due</option>
          <option value="expired">Expired</option>
        </select>
        <Button variant="outline" onClick={() => setFilters({ slot: '', feeStatus: '', search: '' })}>
          <Filter className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seat & Slot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <tr key={user.id} className={getRowColor(user)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      Registered: {new Date(user.registrationDate).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">{user.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">Seat #{user.seatNumber}</div>
                  <div className="text-sm text-gray-500">{user.slot}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${user.feeStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      user.feeStatus === 'due' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}
                  `}>
                    {user.feeStatus.charAt(0).toUpperCase() + user.feeStatus.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowLogsModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {user.feeStatus !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(user._id || user.id || '')}
                      >
                        Mark Paid
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteUser(user._id || user.id || '')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        {selectedUser && (
          <EditUserForm
            user={selectedUser}
            onSave={handleSaveEdit}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>

      {/* User Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title="User Activity Logs"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">{selectedUser.name}</h4>
              <p className="text-sm text-gray-500">Seat #{selectedUser.seatNumber}</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {selectedUser.logs.map(log => (
                <div key={log.id} className="border-b border-gray-200 pb-2 mb-2">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                    {log.adminId && ` by ${log.adminId}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EditUserForm({ user, onSave, onCancel }: {
  user: User;
  onSave: (user: User) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(user);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('idDocument', file);

      const response = await fetch('/api/upload/id-document', {
        method: 'POST',
        body: formDataUpload
      });

      const result = await response.json();
      
      if (result.success) {
        setFormData(prev => ({ ...prev, idUpload: result.url }));
        toast?.success('ID document uploaded successfully');
      } else {
        toast?.error('Failed to upload ID document', result.message);
      }
    } catch (error) {
      console.error('Failed to upload ID document:', error);
      toast?.error('Failed to upload ID document', 'Network error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = {
        ...formData,
        logs: [...formData.logs, {
          id: Date.now().toString(),
          action: 'User details updated',
          timestamp: new Date().toISOString(),
          adminId: 'admin'
        }]
      };
      onSave(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
      toast?.error('Failed to update user', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      <Input
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        required
      />
      <Input
        label="Phone"
        value={formData.phone}
        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        required
      />
      <Input
        label="Seat Number"
        type="number"
        value={formData.seatNumber}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value) && value > 0) {
            setFormData(prev => ({ ...prev, seatNumber: value }));
          }
        }}
        required
        min="1"
        max="114"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slot</label>
        <select
          value={formData.slot}
          onChange={(e) => setFormData(prev => ({ ...prev, slot: e.target.value as 'Morning' | 'Afternoon' | 'Evening' | '12Hour' | '24Hour' }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Morning">Morning Slot</option>
          <option value="Afternoon">Afternoon Slot</option>
          <option value="Evening">Evening Slot</option>
          <option value="12Hour">12 Hour Slot</option>
          <option value="24Hour">24 Hour Slot</option>
        </select>
      </div>
      
      {/* ID Document Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ID Document
        </label>
        <div className="space-y-3">
          {formData.idUpload && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-2 text-sm text-green-700">ID document uploaded</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(formData.idUpload, '_blank')}
                >
                  View
                </Button>
              </div>
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={uploading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload an image, PDF, or document file (max 5MB)
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button type="submit" disabled={saving || uploading}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving || uploading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}