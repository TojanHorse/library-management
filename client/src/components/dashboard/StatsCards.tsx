import React from 'react';
import { Card } from '../ui/Card';
import { Users, Grid3x3, DollarSign, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function StatsCards() {
  const { state } = useApp();

  const totalUsers = state.users.length;
  const paidUsers = state.users.filter(u => u.feeStatus === 'paid').length;
  const dueUsers = state.users.filter(u => u.feeStatus === 'due').length;
  const expiredUsers = state.users.filter(u => u.feeStatus === 'expired').length;
  const totalSeats = state.seats.length;
  const availableSeats = state.seats.filter(s => s.status === 'available').length;

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'blue',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Available Seats',
      value: availableSeats,
      total: totalSeats,
      icon: Grid3x3,
      color: 'green',
      change: '-5%',
      changeType: 'negative'
    },
    {
      title: 'Paid Users',
      value: paidUsers,
      icon: DollarSign,
      color: 'emerald',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Pending/Expired',
      value: dueUsers + expiredUsers,
      icon: AlertTriangle,
      color: 'red',
      change: '+3%',
      changeType: 'negative'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow" padding="md">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                  {stat.title}
                </p>
                <div className="flex items-baseline mt-2">
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  {stat.total && (
                    <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      / {stat.total}
                    </p>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    vs last month
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${colorClasses[stat.color as keyof typeof colorClasses]} flex-shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}