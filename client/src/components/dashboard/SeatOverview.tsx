import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function SeatOverview() {
  const { state } = useApp();
  const [currentPage, setCurrentPage] = useState(0);
  const [showAll, setShowAll] = useState(false);
  
  const seatsPerPage = 60;
  const totalPages = Math.ceil(state.seats.length / seatsPerPage);
  
  const displaySeats = showAll 
    ? state.seats 
    : state.seats.slice(currentPage * seatsPerPage, (currentPage + 1) * seatsPerPage);

  const getSeatColor = (seat: any) => {
    switch (seat.status) {
      case 'paid':
        return 'bg-green-500 hover:bg-green-600';
      case 'due':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'expired':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500';
    }
  };

  const getSeatTooltip = (seat: any) => {
    const user = state.users.find(u => u.id === seat.userId);
    if (user) {
      return `Seat ${seat.number} - ${user.name} (${user.slot})`;
    }
    return `Seat ${seat.number} - Available`;
  };

  const getGridCols = () => {
    if (showAll) {
      return 'grid-cols-15 lg:grid-cols-20';
    }
    return 'grid-cols-12';
  };

  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Seat Overview
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {showAll ? 'Show Less' : 'Show All'}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Paid</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Due</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Expired</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
          </div>
        </div>
      </div>

      <div className={`grid ${getGridCols()} gap-1 ${showAll ? 'max-h-96' : 'max-h-64'} overflow-y-auto`}>
        {displaySeats.map(seat => (
          <div
            key={seat.number}
            className={`
              w-6 h-6 rounded flex items-center justify-center text-xs font-medium cursor-pointer
              transition-all duration-200 hover:scale-110 hover:shadow-md text-white
              ${getSeatColor(seat)}
            `}
            title={getSeatTooltip(seat)}
          >
            {seat.number}
          </div>
        ))}
      </div>

      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <p>
          {showAll 
            ? `Showing all ${state.seats.length} seats` 
            : `Showing ${displaySeats.length} of ${state.seats.length} seats`
          }
        </p>
        <p>Available: {state.seats.filter(s => s.status === 'available').length}</p>
      </div>
    </Card>
  );
}