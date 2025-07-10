import React, { useState } from 'react';
import { Header } from '../layout/Header';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Edit, Trash2, Eye, Filter, Download, Search, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import { useToast } from '../ui/Toast';

export function UserManagement() {
  const { state, updateUser, deleteUser, dispatch } = useApp();
  const { toast, confirm } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    slot: '',
    feeStatus: '',
    search: ''
  });

  const filteredUsers = state.users.filter(user => {
    const matchesSlot = !filters.slot || user.slot === filters.slot;
    const matchesStatus = !filters.feeStatus || user.feeStatus === filters.feeStatus;
    const matchesSearch = !filters.search || 
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesSlot && matchesStatus && matchesSearch;
  });

  const handleMarkPaid = async (userId: string) => {
    setLoading(true);
    try {
      const user = state.users.find(u => (u._id || u.id) === userId);
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

      await updateUser(updatedUser);
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await confirm('Are you sure you want to delete this user?', 'This action cannot be undone.');
    if (confirmed) {
      try {
        setLoading(true);
        await deleteUser(userId);
        toast.success('User deleted successfully');
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendDueReminder = async (userId: string) => {
    setSendingEmails(prev => new Set(prev).add(userId));
    try {
      const response = await fetch(`/api/send-due-reminder/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId: state.currentAdmin || 'admin' }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Due date reminder sent successfully!');
        // Reload data to get updated logs from server
        window.location.reload();
      } else {
        toast.error(`Failed to send reminder: ${data.message}`);
      }
    } catch (error) {
      console.error('Due reminder error:', error);
      toast.error('Failed to send due date reminder');
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="User Management" 
        subtitle="Manage all registered users and their seat assignments"
      />
      
      <div className="p-4 lg:p-6">
        <Card>
          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={filters.slot}
                  onChange={(e) => setFilters(prev => ({ ...prev, slot: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Slots</option>
                  <option value="Morning">Morning Slot</option>
                  <option value="Afternoon">Afternoon Slot</option>
                  <option value="Evening">Evening Slot</option>
                  <option value="12Hour">12 Hour Slot</option>
                  <option value="24Hour">24 Hour Slot</option>
                </select>
                <select
                  value={filters.feeStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, feeStatus: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                  <option value="expired">Expired</option>
                </select>
                <Button variant="outline" onClick={() => setFilters({ slot: '', feeStatus: '', search: '' })} size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Users Table - Mobile Responsive */}
          <div className="overflow-x-auto">
            <div className="hidden md:block">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Seat & Slot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map(user => (
                    <tr key={user._id || user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Registered: {new Date(user.registrationDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">Seat #{user.seatNumber}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.slot} Slot</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.feeStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
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
                              disabled={loading}
                            >
                              {loading ? 'Processing...' : 'Mark Paid'}
                            </Button>
                          )}
                          {(user.feeStatus === 'due' || user.feeStatus === 'expired') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendDueReminder(user._id || user.id || '')}
                              disabled={sendingEmails.has(user._id || user.id || '')}
                            >
                              {sendingEmails.has(user._id || user.id || '') ? 
                                'Sending...' : <Mail className="h-4 w-4" />}
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map(user => (
                <Card key={user._id || user.id} padding="sm">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Seat #{user.seatNumber}</p>
                      </div>
                      {getStatusBadge(user.feeStatus)}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.slot} Slot</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowLogsModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Logs
                      </Button>
                      {user.feeStatus !== 'paid' && (
                        <Button
                        size="sm"
                        onClick={() => handleMarkPaid(user._id || user.id || '')}
                        disabled={loading}
                        >
                        {loading ? 'Processing...' : 'Mark Paid'}
                        </Button>
                        )}
                        {(user.feeStatus === 'due' || user.feeStatus === 'expired') && (
                        <Button
                          size="sm"
                          variant="outline"
                            onClick={() => handleSendDueReminder(user._id || user.id || '')}
                          disabled={sendingEmails.has(user._id || user.id || '')}
                        >
                          {sendingEmails.has(user._id || user.id || '') ? (
                            'Sending...'
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-1" />
                              Remind
                            </>
                          )}
                         </Button>
                       )}
                       <Button
                         size="sm"
                         variant="danger"
                         onClick={() => handleDeleteUser(user._id || user.id || '')}
                       >
                         <Trash2 className="h-4 w-4 mr-1" />
                         Delete
                       </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No users found matching your criteria.</p>
            </div>
          )}
        </Card>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit User"
        >
          {selectedUser && (
            <EditUserForm
              user={selectedUser}
              onSave={(updatedUser) => {
                dispatch({ type: 'UPDATE_USER', payload: updatedUser });
                setShowEditModal(false);
              }}
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
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Seat #{selectedUser.seatNumber}</p>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {selectedUser.logs.map(log => (
                  <div key={log.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      onSave({
        ...formData,
        logs: [...formData.logs, {
          id: Date.now().toString(),
          action: 'User details updated',
          timestamp: new Date().toISOString(),
          adminId: 'admin'
        }]
      });
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
        onChange={(e) => setFormData(prev => ({ ...prev, seatNumber: parseInt(e.target.value) }))}
        required
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slot</label>
        <select
          value={formData.slot}
          onChange={(e) => setFormData(prev => ({ ...prev, slot: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Morning">Morning Slot</option>
          <option value="Afternoon">Afternoon Slot</option>
          <option value="Evening">Evening Slot</option>
          <option value="12Hour">12 Hour Slot</option>
          <option value="24Hour">24 Hour Slot</option>
        </select>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}