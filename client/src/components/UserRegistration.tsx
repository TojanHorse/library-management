import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Header } from './layout/Header';
import { Upload, CheckCircle, CreditCard, FileText, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

export function UserRegistration() {
  const { state, registerUser } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    seatNumber: '',
    slot: '',
    idType: '',
    idNumber: '',
    idUpload: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableSeats = state.seats.filter(seat => seat.status === 'available');
  const slots = [
    { value: 'Morning', label: 'Morning Slot (6 AM - 12 PM)', price: state.settings.slotPricing.Morning },
    { value: 'Afternoon', label: 'Afternoon Slot (12 PM - 6 PM)', price: state.settings.slotPricing.Afternoon },
    { value: 'Evening', label: 'Evening Slot (6 PM - 12 AM)', price: state.settings.slotPricing.Evening },
    { value: '12Hour', label: '12 Hour Slot (6 AM - 6 PM)', price: state.settings.slotPricing.Morning + state.settings.slotPricing.Afternoon },
    { value: '24Hour', label: '24 Hour Slot (Full Day)', price: state.settings.slotPricing.Morning + state.settings.slotPricing.Afternoon + state.settings.slotPricing.Evening }
  ];

  const idTypes = [
    { value: 'aadhar', label: 'Aadhar Card', icon: CreditCard },
    { value: 'pan', label: 'PAN Card', icon: FileText },
    { value: 'voter', label: 'Voter ID Card', icon: Users }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.seatNumber) newErrors.seatNumber = 'Seat selection is required';
    if (!formData.slot) newErrors.slot = 'Slot selection is required';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.idType && !formData.idNumber.trim()) {
      newErrors.idNumber = 'ID number is required when ID type is selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        seatNumber: parseInt(formData.seatNumber),
        slot: formData.slot,
        feeStatus: 'due' as const,
        registrationDate: new Date().toISOString(),
        idType: formData.idType || undefined,
        idNumber: formData.idNumber || undefined,
        idUpload: formData.idUpload || undefined
      };

      await registerUser(userData);

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        seatNumber: '',
        slot: '',
        idType: '',
        idNumber: '',
        idUpload: ''
      });
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 overflow-auto">
        <Header title="User Registration" subtitle="Add new users to the system" />
        <div className="p-6">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Registration Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The user has been registered successfully. A confirmation email will be sent shortly.
              </p>
              <Button 
                onClick={() => setSuccess(false)}
                variant="outline"
              >
                Register Another User
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header title="User Registration" subtitle="Add new users to the system" />
      
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={errors.name}
                    placeholder="Enter full name"
                    required
                  />

                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    placeholder="Enter email address"
                    required
                  />

                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    error={errors.phone}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    error={errors.address}
                    placeholder="Enter complete address"
                    required
                  />
                </div>
              </div>

              {/* Seat and Slot Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Seat & Slot Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Seat
                    </label>
                    <select
                      name="seatNumber"
                      value={formData.seatNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Choose a seat...</option>
                      {availableSeats.map(seat => (
                        <option key={seat.number} value={seat.number}>
                          Seat #{seat.number}
                        </option>
                      ))}
                    </select>
                    {errors.seatNumber && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.seatNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Slot
                    </label>
                    <select
                      name="slot"
                      value={formData.slot}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Choose a slot...</option>
                      {slots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label} - ₹{slot.price}
                        </option>
                      ))}
                    </select>
                    {errors.slot && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.slot}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ID Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  ID Information (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID Type
                    </label>
                    <select
                      name="idType"
                      value={formData.idType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select ID type...</option>
                      {idTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="ID Number"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    error={errors.idNumber}
                    placeholder="Enter ID number"
                    disabled={!formData.idType}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Upload (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <input
                      type="file"
                      name="idUpload"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData(prev => ({ ...prev, idUpload: file.name }));
                        }
                      }}
                      className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Upload Aadhar/PAN/Voter ID (JPG, PNG, PDF - Max 5MB)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="outline" onClick={() => {
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
                    seatNumber: '',
                    slot: '',
                    idType: '',
                    idNumber: '',
                    idUpload: ''
                  });
                  setErrors({});
                }}>
                  Reset
                </Button>
                <Button type="submit" loading={loading}>
                  Register User
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}