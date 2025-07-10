import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Header } from './layout/Header';
import { Card } from './ui/Card';
import { Plus, Minus, Grid3x3, Settings, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';

export function SeatManager() {
  const { state, dispatch } = useApp();
  const { toast, confirm } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [newSeatNumber, setNewSeatNumber] = useState('');
  const [bulkAddData, setBulkAddData] = useState({
    startNumber: '',
    endNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAddSeat = async () => {
    if (!newSeatNumber) return;
    
    const seatNumber = parseInt(newSeatNumber);
    if (isNaN(seatNumber) || seatNumber <= 0) {
      toast.warning('Please enter a valid seat number');
      return;
    }
    
    if (state.seats.find(s => s.number === seatNumber)) {
      toast.error('Seat number already exists!');
      return;
    }

    setLoading(true);
    const newSeat = {
      number: seatNumber,
      status: 'available' as const
    };

    dispatch({ type: 'UPDATE_SEAT', payload: newSeat });
    setNewSeatNumber('');
    setShowAddModal(false);
    setLoading(false);
    toast.success(`Seat #${seatNumber} added successfully`);
  };

  const handleBulkAdd = async () => {
    const start = parseInt(bulkAddData.startNumber);
    const end = parseInt(bulkAddData.endNumber);
    
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0 || start > end) {
      toast.warning('Please enter valid seat number range');
      return;
    }

    if (end - start > 50) {
      toast.warning('Cannot add more than 50 seats at once');
      return;
    }

    setLoading(true);
    
    for (let i = start; i <= end; i++) {
      if (!state.seats.find(s => s.number === i)) {
        const newSeat = {
          number: i,
          status: 'available' as const
        };
        dispatch({ type: 'UPDATE_SEAT', payload: newSeat });
      }
    }

    setBulkAddData({ startNumber: '', endNumber: '' });
    setShowBulkAddModal(false);
    setLoading(false);
  };

  const handleRemoveSeat = async (seatNumber: number) => {
    const seat = state.seats.find(s => s.number === seatNumber);
    if (!seat) return;

    if (seat.status !== 'available') {
      const confirmed = await confirm(
        'This seat is occupied. Are you sure you want to remove it?', 
        'This will also remove the user assignment.'
      );
      if (!confirmed) {
        return;
      }
      
      // Remove user assignment if seat is occupied
      if (seat.userId) {
        dispatch({ type: 'DELETE_USER', payload: seat.userId });
      }
    }

    const updatedSeats = state.seats.filter(s => s.number !== seatNumber);
    dispatch({ type: 'SET_SEATS', payload: updatedSeats });
    toast.success(`Seat #${seatNumber} removed successfully`);
  };

  const getSeatColor = (seat: any) => {
    switch (seat.status) {
      case 'paid':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'due':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white';
      case 'expired':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300';
    }
  };

  const totalSeats = state.seats.length;
  const availableSeats = state.seats.filter(s => s.status === 'available').length;
  const occupiedSeats = totalSeats - availableSeats;
  const paidSeats = state.seats.filter(s => s.status === 'paid').length;
  const dueSeats = state.seats.filter(s => s.status === 'due').length;
  const expiredSeats = state.seats.filter(s => s.status === 'expired').length;

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Seat Manager" subtitle="Manage seat availability and assignments" />
      
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Action Buttons */}
          <Card className="lg:flex lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Seat Management
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add, remove, and manage seat availability
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Single Seat
              </Button>
              <Button onClick={() => setShowBulkAddModal(true)} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Add Seats
              </Button>
            </div>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card padding="sm">
              <div className="flex items-center">
                <Grid3x3 className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{totalSeats}</p>
                </div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded mr-3"></div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Available</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-300">{availableSeats}</p>
                </div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded mr-3"></div>
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Paid</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-300">{paidSeats}</p>
                </div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-500 rounded mr-3"></div>
                <div>
                  <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Due</p>
                  <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">{dueSeats}</p>
                </div>
              </div>
            </Card>
            <Card padding="sm">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-500 rounded mr-3"></div>
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Expired</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-300">{expiredSeats}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Legend */}
          <Card>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Legend</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Due Soon</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Expired</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
              </div>
            </div>
          </Card>

          {/* Seat Grid */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Seat Grid
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click on available seats to remove them. Hover to see user details.
              </p>
            </div>

            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-20 gap-1 sm:gap-2">
              {state.seats
                .sort((a, b) => a.number - b.number)
                .map(seat => {
                  const user = state.users.find(u => u.id === seat.userId);
                  return (
                    <div
                      key={seat.number}
                      className={`
                        relative group w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center 
                        text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer
                        ${getSeatColor(seat)}
                      `}
                      title={user ? `${user.name} (${user.slot})` : 'Available'}
                    >
                      <span className="text-xs">{seat.number}</span>
                      {seat.status === 'available' && (
                        <button
                          onClick={() => handleRemoveSeat(seat.number)}
                          className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Remove seat"
                        >
                          <Minus className="h-2 w-2" />
                        </button>
                      )}
                      {seat.status !== 'available' && (
                        <button
                          onClick={() => handleRemoveSeat(seat.number)}
                          className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Remove seat and user"
                        >
                          <Trash2 className="h-2 w-2" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>Total Seats: {totalSeats} | Available: {availableSeats} | Occupied: {occupiedSeats}</p>
              <p className="text-xs">Tip: Hover over seats to see details, click to remove</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Single Seat Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Seat"
      >
        <div className="space-y-4">
          <Input
            label="Seat Number"
            type="number"
            value={newSeatNumber}
            onChange={(e) => setNewSeatNumber(e.target.value)}
            placeholder="Enter seat number"
            required
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleAddSeat} loading={loading} className="flex-1">
              Add Seat
            </Button>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Add Seats Modal */}
      <Modal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        title="Bulk Add Seats"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Seat Number"
              type="number"
              value={bulkAddData.startNumber}
              onChange={(e) => setBulkAddData(prev => ({ ...prev, startNumber: e.target.value }))}
              placeholder="e.g., 115"
              required
            />
            <Input
              label="End Seat Number"
              type="number"
              value={bulkAddData.endNumber}
              onChange={(e) => setBulkAddData(prev => ({ ...prev, endNumber: e.target.value }))}
              placeholder="e.g., 150"
              required
            />
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This will add seats from {bulkAddData.startNumber || 'X'} to {bulkAddData.endNumber || 'Y'}.
              Maximum 50 seats can be added at once.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleBulkAdd} loading={loading} className="flex-1">
              Add Seats
            </Button>
            <Button variant="outline" onClick={() => setShowBulkAddModal(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}