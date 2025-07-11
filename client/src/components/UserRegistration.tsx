import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Header } from './layout/Header';
import { Upload, CheckCircle, CreditCard, FileText, Users, AlertCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { apiService } from '../services/api';

export function UserRegistration() {
  const { state, registerUser } = useApp();
  const { toast } = useToast();
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
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter seats based on slot availability - check if seat is occupied by someone with the same slot
  const availableSeats = state.seats.filter(seat => {
    if (seat.status === 'available') return true;
    
    // If seat is occupied, check if it's occupied by someone with a different slot
    if (seat.userId && formData.slot) {
      const occupyingUser = state.users.find(user => user._id === seat.userId || user.id === seat.userId);
      if (occupyingUser && occupyingUser.slot !== formData.slot) {
        // Seat is occupied by someone with different slot, so it's available for this slot
        return true;
      }
    }
    
    return false;
  });
  const slots = [
    { value: 'Morning', label: `Morning Slot (${state.settings.slotTimings?.Morning || '6:00 AM - 12:00 PM'})`, price: state.settings.slotPricing?.Morning || 500 },
    { value: 'Afternoon', label: `Afternoon Slot (${state.settings.slotTimings?.Afternoon || '12:00 PM - 6:00 PM'})`, price: state.settings.slotPricing?.Afternoon || 500 },
    { value: 'Evening', label: `Evening Slot (${state.settings.slotTimings?.Evening || '6:00 PM - 12:00 AM'})`, price: state.settings.slotPricing?.Evening || 500 },
    { value: '12Hour', label: `12 Hour Slot (${state.settings.slotTimings?.['12Hour'] || '6:00 AM - 6:00 PM'})`, price: (state.settings.slotPricing?.['12Hour'] || 900) },
    { value: '24Hour', label: `24 Hour Slot (${state.settings.slotTimings?.['24Hour'] || '24 Hours Access'})`, price: (state.settings.slotPricing?.['24Hour'] || 1500) }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (file.size > maxSize) {
      toast.error('File too large', 'Please select a file smaller than 5MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', 'Please select a JPG, PNG, or PDF file');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('uploading');
    setUploadLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('idDocument', file);

      // Upload to Cloudinary via our API
      const response = await fetch('/api/upload/id-document', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({ ...prev, idUpload: result.url }));
        setUploadStatus('success');
        toast.success('File uploaded successfully!', 'ID document uploaded to secure storage');
      } else {
        setUploadStatus('error');
        toast.error('Upload failed', result.message || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast.error('Upload failed', 'Network error occurred during upload');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, idUpload: '' }));
    setUploadStatus('idle');
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
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form', 'Check all required fields');
      return;
    }

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
      toast.success('Registration successful!', `Welcome ${formData.name}! Your seat has been reserved.`);
      
      // Reset form
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
      setSelectedFile(null);
      setUploadStatus('idle');
    } catch (error) {
      console.error('Registration failed:', error);
      
      // Show user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('email')) {
          toast.error('Email already exists', 'This email is already registered. Please use a different email.');
        } else if (error.message.includes('seat')) {
          toast.error('Seat unavailable', 'This seat is no longer available. Please select another seat.');
        } else {
          toast.error('Registration failed', error.message);
        }
      } else {
        toast.error('Registration failed', 'An unexpected error occurred. Please try again.');
      }
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
                  
                  {/* Upload Area */}
                  <div className="relative">
                    <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                      uploadStatus === 'uploading' ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                      uploadStatus === 'success' ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
                      uploadStatus === 'error' ? 'border-red-400 bg-red-50 dark:bg-red-900/20' :
                      'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}>
                      
                      {/* Upload Status Display */}
                      {uploadStatus === 'idle' && (
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <div className="flex items-center justify-center">
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={handleFileUpload}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              disabled={uploadLoading}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Click to upload or drag and drop
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {uploadStatus === 'uploading' && (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <span className="text-sm text-blue-600 dark:text-blue-400">
                            Uploading file...
                          </span>
                        </div>
                      )}
                      
                      {uploadStatus === 'success' && selectedFile && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                            <div>
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                {selectedFile.name}
                              </span>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                Uploaded successfully
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {uploadStatus === 'error' && (
                        <div className="text-center">
                          <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                          <span className="text-sm text-red-600 dark:text-red-400">
                            Upload failed. Click to try again.
                          </span>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploadLoading}
                          />
                        </div>
                      )}
                    </div>
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