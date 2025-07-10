import React from 'react';
import { Card } from '../ui/Card';
import { Clock, User, DollarSign, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function RecentActivity() {
  const { state } = useApp();

  // Get recent logs from all users
  const recentLogs = state.users
    .flatMap(user => 
      user.logs.map(log => ({
        ...log,
        userName: user.name,
        userId: user.id
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const getActivityIcon = (action: string) => {
    if (action.includes('registered')) return UserPlus;
    if (action.includes('paid')) return DollarSign;
    return User;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('registered')) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('paid')) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
  };

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Recent Activity
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Latest user actions and system updates
        </p>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto">
        {recentLogs.map(log => {
          const Icon = getActivityIcon(log.action);
          const colorClass = getActivityColor(log.action);
          
          return (
            <div key={log.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {log.userName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {log.action}
                </p>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recentLogs.length === 0 && (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No recent activity
          </p>
        </div>
      )}
    </Card>
  );
}