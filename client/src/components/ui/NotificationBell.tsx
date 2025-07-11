import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, User, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from './Button';

interface Notification {
  id: string;
  type: 'fee_due' | 'fee_overdue' | 'new_user' | 'payment_received';
  title: string;
  message: string;
  timestamp: Date;
  userId?: string;
  isRead: boolean;
  urgent: boolean;
}

export function NotificationBell() {
  const { state } = useApp();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Calculate notifications based on user data
    const calculateNotifications = () => {
      const now = new Date();
      const newNotifications: Notification[] = [];

      state.users.forEach(user => {
        const dueDate = new Date(user.nextDueDate || user.registrationDate);
        const daysTillDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Fee due in 2 days
        if (daysTillDue <= 2 && daysTillDue > 0 && user.feeStatus === 'due') {
          newNotifications.push({
            id: `fee_due_${user._id || user.id}`,
            type: 'fee_due',
            title: 'Fee Due Soon',
            message: `${user.name} (Seat #${user.seatNumber}) - Fee due in ${daysTillDue} day${daysTillDue > 1 ? 's' : ''}`,
            timestamp: now,
            userId: user._id || user.id,
            isRead: false,
            urgent: daysTillDue === 1
          });
        }

        // Fee overdue
        if (daysTillDue < 0 && user.feeStatus === 'expired') {
          newNotifications.push({
            id: `fee_overdue_${user._id || user.id}`,
            type: 'fee_overdue',
            title: 'Fee Overdue',
            message: `${user.name} (Seat #${user.seatNumber}) - Fee overdue by ${Math.abs(daysTillDue)} day${Math.abs(daysTillDue) > 1 ? 's' : ''}`,
            timestamp: now,
            userId: user._id || user.id,
            isRead: false,
            urgent: true
          });
        }
      });

      setNotifications(newNotifications);
    };

    calculateNotifications();
    
    // Update notifications every minute
    const interval = setInterval(calculateNotifications, 60000);
    return () => clearInterval(interval);
  }, [state.users]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => !n.isRead && n.urgent).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'fee_due':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'fee_overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'new_user':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'payment_received':
        return <div className="h-4 w-4 bg-green-500 rounded-full" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold text-white flex items-center justify-center ${
            urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        {notification.urgent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
