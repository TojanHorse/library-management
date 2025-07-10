import React from 'react';
import { Users, Grid3x3, Settings, LogOut, Home } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
}

export function Navigation({ currentView, onViewChange, isAdmin, onLogout }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, adminOnly: false },
    { id: 'register', label: 'Register', icon: Users, adminOnly: false },
    { id: 'seats', label: 'Seat Grid', icon: Grid3x3, adminOnly: false },
    { id: 'admin-dashboard', label: 'Dashboard', icon: Users, adminOnly: true },
    { id: 'seat-manager', label: 'Seat Manager', icon: Grid3x3, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                Vidhyadham Seat Manager
              </h1>
            </div>
            
            <div className="hidden md:flex space-x-4">
              {visibleItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`
                      flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${currentView === item.id 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAdmin && (
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <div className="flex flex-wrap gap-2">
            {visibleItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${currentView === item.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}