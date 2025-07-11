import React from 'react';
import { useApp } from '../context/AppContext';
import { Tooltip } from './ui/Tooltip';
import { User, Calendar, Clock, CreditCard, Phone, MapPin, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export function SeatGrid() {
  const { state } = useApp();

  const getSeatColor = (seat: any) => {
    switch (seat.status) {
      case 'paid':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'due':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'expired':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'due':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'expired':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getSeatTooltipContent = (seat: any) => {
    const user = state.users.find(u => u.id === seat.userId || u._id === seat.userId);
    
    if (!user) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="font-semibold">Seat {seat.number}</span>
          </div>
          <div className="text-green-400 text-xs">✅ Available for booking</div>
        </div>
      );
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Not set';
      try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch {
        return 'Invalid date';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'paid': return 'text-green-400';
        case 'due': return 'text-yellow-400';
        case 'expired': return 'text-red-400';
        default: return 'text-gray-400';
      }
    };

    return (
      <div className="space-y-3 min-w-[280px]">
        {/* Header */}
        <div className="flex items-center space-x-2 pb-2 border-b border-gray-600">
          <div className={`w-3 h-3 rounded-full ${seat.status === 'paid' ? 'bg-green-500' : seat.status === 'due' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <span className="font-semibold text-white">Seat {seat.number}</span>
          {getStatusIcon(seat.status)}
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3 text-blue-400" />
            <span className="font-medium text-white">{user.name}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="text-gray-300 text-sm">{user.phone}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-purple-400" />
            <span className="text-gray-300 text-sm">{user.slot} Slot</span>
          </div>
          
          {user.address && (
            <div className="flex items-start space-x-2">
              <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
              <span className="text-gray-300 text-sm leading-tight">{user.address}</span>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="space-y-2 pt-2 border-t border-gray-600">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-3 w-3 text-gray-400" />
            <span className={`text-sm font-medium ${getStatusColor(user.feeStatus)}`}>
              {user.feeStatus === 'paid' ? 'Fees Paid' : 
               user.feeStatus === 'due' ? 'Fees Due' : 'Fees Expired'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-gray-300 text-sm">
              Registered: {formatDate(user.registrationDate)}
            </span>
          </div>

          {user.status === 'left' && (
            <div className="flex items-center space-x-2 text-orange-400">
              <XCircle className="h-3 w-3" />
              <span className="text-sm">User has left</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Live Seat Grid</h2>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Paid</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Due Soon</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Expired</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Available</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-15 gap-2">
        {state.seats
          .sort((a, b) => a.number - b.number)
          .map(seat => (
            <Tooltip
              key={seat.number}
              content={getSeatTooltipContent(seat)}
              position="top"
              delay={200}
            >
              <div
                className={`
                  w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer
                  transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10 relative
                  ${getSeatColor(seat)}
                `}
              >
                {seat.number}
              </div>
            </Tooltip>
          ))
        }
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Total Seats: {state.seats.length}</p>
        <p>Available: {state.seats.filter(s => s.status === 'available').length}</p>
        <p>Occupied: {state.seats.filter(s => s.status !== 'available').length}</p>
      </div>
    </div>
  );
}