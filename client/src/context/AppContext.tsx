import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User, Seat, Settings, Theme } from '../types';

interface AppState {
  users: User[];
  seats: Seat[];
  settings: Settings;
  currentAdmin: string | null;
  loading: boolean;
  theme: Theme;
  isAuthenticated: boolean;
}

type AppAction = 
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_SEATS'; payload: Seat[] }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_CURRENT_ADMIN'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'UPDATE_SEAT'; payload: Seat };

const initialState: AppState = {
  users: [
    {
      id: '1',
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '+91 9876543210',
      seatNumber: 15,
      slot: 'Morning',
      feeStatus: 'paid',
      registrationDate: '2024-01-15T10:30:00Z',
      logs: [
        { id: '1', action: 'User registered', timestamp: '2024-01-15T10:30:00Z' },
        { id: '2', action: 'Fee marked as paid', timestamp: '2024-01-16T14:20:00Z', adminId: 'admin' }
      ]
    },
    {
      id: '2',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 9876543211',
      seatNumber: 23,
      slot: 'Afternoon',
      feeStatus: 'due',
      registrationDate: '2024-01-20T09:15:00Z',
      logs: [
        { id: '3', action: 'User registered', timestamp: '2024-01-20T09:15:00Z' }
      ]
    },
    {
      id: '3',
      name: 'Amit Patel',
      email: 'amit@example.com',
      phone: '+91 9876543212',
      seatNumber: 7,
      slot: 'Evening',
      feeStatus: 'expired',
      registrationDate: '2024-01-10T16:45:00Z',
      logs: [
        { id: '4', action: 'User registered', timestamp: '2024-01-10T16:45:00Z' },
        { id: '5', action: 'Fee status changed to expired', timestamp: '2024-01-25T00:00:00Z' }
      ]
    }
  ],
  seats: Array.from({ length: 114 }, (_, i) => {
    const number = i + 1;
    if (number === 15) return { number, status: 'paid' as const, userId: '1' };
    if (number === 23) return { number, status: 'due' as const, userId: '2' };
    if (number === 7) return { number, status: 'expired' as const, userId: '3' };
    return { number, status: 'available' as const };
  }),
  settings: {
    slotPricing: {
      'Morning': 1000,
      'Afternoon': 1200,
      'Evening': 1500
    },
    gmail: 'upwebmonitor@gmail.com',
    appPassword: 'zfjthyhndoayvgwd',
    telegramChatIds: []
  },
  currentAdmin: null,
  loading: false,
  theme: 'light',
  isAuthenticated: false
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SEATS':
      return { ...state, seats: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_CURRENT_ADMIN':
      return { ...state, currentAdmin: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload.id ? action.payload : user
        )
      };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload)
      };
    case 'UPDATE_SEAT':
      return {
        ...state,
        seats: state.seats.map(seat => 
          seat.number === action.payload.number ? action.payload : seat
        )
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Apply theme to document
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}