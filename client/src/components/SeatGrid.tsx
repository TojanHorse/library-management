import React from 'react';
import { useApp } from '../context/AppContext';

export function SeatGrid() {
  const { state } = useApp();

  const getSeatColor = (seat: any) => {
    switch (seat.status) {
      case 'paid':
        return 'bg-green-500 text-white';
      case 'due':
        return 'bg-yellow-500 text-white';
      case 'expired':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getSeatTooltip = (seat: any) => {
    const user = state.users.find(u => u.id === seat.userId);
    if (user) {
      return `Seat ${seat.number} - ${user.name} (${user.slot})`;
    }
    return `Seat ${seat.number} - Available`;
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
        {state.seats.map(seat => (
          <div
            key={seat.number}
            className={`
              w-8 h-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer
              transition-all duration-200 hover:scale-105 hover:shadow-md
              ${getSeatColor(seat)}
            `}
            title={getSeatTooltip(seat)}
          >
            {seat.number}
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-500">
        <p>Total Seats: {state.seats.length}</p>
        <p>Available: {state.seats.filter(s => s.status === 'available').length}</p>
        <p>Occupied: {state.seats.filter(s => s.status !== 'available').length}</p>
      </div>
    </div>
  );
}