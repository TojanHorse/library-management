import React from 'react';
import { Users, Grid3x3, Shield, Settings } from 'lucide-react';

interface HomeProps {
  onViewChange: (view: string) => void;
}

export function Home({ onViewChange }: HomeProps) {
  const features = [
    {
      icon: Users,
      title: 'User Registration',
      description: 'Register new users with seat selection and personal details',
      action: () => onViewChange('register'),
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: Grid3x3,
      title: 'Seat Grid',
      description: 'View live seat availability and occupancy status',
      action: () => onViewChange('seats'),
      color: 'bg-green-50 text-green-600'
    },
    {
      icon: Shield,
      title: 'Admin Access',
      description: 'Manage users, seats, and system settings',
      action: () => onViewChange('admin-login'),
      color: 'bg-purple-50 text-purple-600'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Vidhyadham
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Comprehensive seat management system for educational institutions. 
          Manage registrations, track payments, and monitor seat availability in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              onClick={feature.action}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">Real-time Seat Tracking</h4>
                <p className="text-sm text-gray-600">Monitor seat availability and payment status with color-coded visualization</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">Automated Notifications</h4>
                <p className="text-sm text-gray-600">Email reminders and Telegram alerts for payment due dates</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">User Management</h4>
                <p className="text-sm text-gray-600">Complete user profile management with activity logs</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">Flexible Pricing</h4>
                <p className="text-sm text-gray-600">Configure different pricing for morning, afternoon, and evening slots</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">Export & Reports</h4>
                <p className="text-sm text-gray-600">Generate CSV and PDF reports for record keeping</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium text-gray-900">Secure Admin Panel</h4>
                <p className="text-sm text-gray-600">Protected admin interface with comprehensive management tools</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}