import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User, Seat, Settings, Theme } from '../types';
import { defaultSettings } from '../utils/defaultSettings';
import { apiService } from '../services/api';
import { normalizeUser, prepareUserForApi, normalizeSettings } from '../utils/apiHelpers';

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
  users: [],
  seats: [],
  settings: defaultSettings,
  currentAdmin: null,
  loading: true,
  theme: 'light',
  isAuthenticated: false
};

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

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // API methods
  loadData: () => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  registerUser: (userData: Omit<User, 'id' | 'logs'>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<Settings>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data from API
  const loadData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Load users, seats, and settings in parallel
      const [users, seats, settings] = await Promise.all([
        apiService.getUsers(),
        apiService.getSeats(),
        apiService.getSettings()
      ]);

      // Normalize data from API
      const normalizedUsers = users.map(normalizeUser);
      const normalizedSettings = normalizeSettings(settings);

      dispatch({ type: 'SET_USERS', payload: normalizedUsers });
      dispatch({ type: 'SET_SEATS', payload: seats });
      dispatch({ type: 'SET_SETTINGS', payload: normalizedSettings });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // API methods
  const loginAdmin = async (username: string, password: string): Promise<boolean> => {
    try {
      const success = await apiService.loginAdmin(username, password);
      if (success) {
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
        dispatch({ type: 'SET_CURRENT_ADMIN', payload: username });
        await loadData(); // Load data after successful login
      }
      return success;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const registerUser = async (userData: Omit<User, 'id' | '_id' | 'logs'>): Promise<User> => {
    try {
      const apiData = prepareUserForApi(userData);
      const newUser = await apiService.registerUser(apiData);
      const normalizedUser = normalizeUser(newUser);
      
      dispatch({ type: 'ADD_USER', payload: normalizedUser });
      
      // Update seat status
      const updatedSeat = { 
        number: normalizedUser.seatNumber, 
        status: normalizedUser.feeStatus as any, 
        userId: normalizedUser._id || normalizedUser.id
      };
      dispatch({ type: 'UPDATE_SEAT', payload: updatedSeat });
      
      return normalizedUser;
    } catch (error) {
      console.error('Failed to register user:', error);
      throw error;
    }
  };

  const updateUser = async (user: User): Promise<User> => {
    try {
      const updatedUser = await apiService.updateUser(user);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    try {
      await apiService.deleteUser(userId);
      dispatch({ type: 'DELETE_USER', payload: userId });
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  };

  const updateSettings = async (settings: Settings): Promise<Settings> => {
    try {
      const updatedSettings = await apiService.updateSettings(settings);
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  // Load data on mount if authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      loadData();
    }
  }, [state.isAuthenticated]);

  // Lighter refresh for real-time updates - only refresh users every 60 seconds
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(async () => {
        try {
          // Only refresh users for lighter load
          const users = await apiService.getUsers();
          const normalizedUsers = users.map(normalizeUser);
          dispatch({ type: 'SET_USERS', payload: normalizedUsers });
        } catch (error) {
          console.error('Failed to auto-refresh users:', error);
        }
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated]);

  const value: AppContextType = {
    state,
    dispatch,
    loadData,
    loginAdmin,
    registerUser,
    updateUser,
    deleteUser,
    updateSettings
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
