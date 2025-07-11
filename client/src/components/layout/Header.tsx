import React from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NotificationBell } from '../ui/NotificationBell';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { state } = useApp();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Search - Hidden on mobile */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 w-48 lg:w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Greeting - Hidden on small screens */}
          <div className="hidden xl:block text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getGreeting()}, {state.currentAdmin}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}