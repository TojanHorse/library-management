import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Edit, Trash2, Eye, Filter, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import { apiService } from '../services/api';

export function AdminDashboard() {
  const { state, dispatch } = useApp();
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
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

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
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const user = state.users.find(u => u.id === userId);
      if (user) {
        // Free up the seat
        const seat = state.seats.find(s => s.number === user.seatNumber);
        if (seat) {
          dispatch({ type: 'UPDATE_SEAT', payload: { ...seat, status: 'available', userId: undefined } });
        }
      }
      
      dispatch({ type: 'DELETE_USER', payload: userId });
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedUser: User) => {
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    setShowEditModal(false);
    setSelectedUser(null);
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
                        onClick={() => handleMarkPaid(user.id)}
                      >
                        Mark Paid
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteUser(user.id)}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      logs: [...formData.logs, {
        id: Date.now().toString(),
        action: 'User details updated',
        timestamp: new Date().toISOString(),
        adminId: 'admin'
      }]
    });
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
        onChange={(e) => setFormData(prev => ({ ...prev, seatNumber: parseInt(e.target.value) }))}
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slot</label>
        <select
          value={formData.slot}
          onChange={(e) => setFormData(prev => ({ ...prev, slot: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Evening">Evening</option>
        </select>
      </div>
      <div className="flex space-x-2">
        <Button type="submit">Save Changes</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}