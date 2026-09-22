import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  loginAs: (user: User) => void;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  isAdmin: boolean;
  switchRoleMode: (mode: 'EMPLOYEE' | 'ADMIN') => void;
  activeRoleMode: 'EMPLOYEE' | 'ADMIN';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'smart_pooling_current_user_id';
const LOCAL_STORAGE_ROLE_MODE = 'smart_pooling_role_mode';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoleMode, setActiveRoleMode] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');

  const loadUsersAndInit = async () => {
    try {
      setIsLoading(true);
      const allUsers = await api.getUsers();
      setUsers(allUsers);

      const savedUserId = localStorage.getItem(LOCAL_STORAGE_KEY);
      const savedRoleMode = localStorage.getItem(LOCAL_STORAGE_ROLE_MODE) as 'EMPLOYEE' | 'ADMIN' | null;

      let matchedUser = allUsers.find(u => u._id === savedUserId);

      // Default to Steven Paul if not set or found
      if (!matchedUser) {
        matchedUser = allUsers.find(u => u.name.includes('Steven')) || allUsers[0];
      }

      if (matchedUser) {
        setCurrentUser(matchedUser);
        if (savedRoleMode) {
          setActiveRoleMode(savedRoleMode);
        } else {
          setActiveRoleMode(matchedUser.role);
        }
      }
    } catch (err) {
      console.error('Failed to initialize users in AuthProvider:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndInit();
  }, []);

  const loginAs = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_KEY, user._id);
    const newRole = user.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    setActiveRoleMode(newRole);
    localStorage.setItem(LOCAL_STORAGE_ROLE_MODE, newRole);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const switchRoleMode = (mode: 'EMPLOYEE' | 'ADMIN') => {
    setActiveRoleMode(mode);
    localStorage.setItem(LOCAL_STORAGE_ROLE_MODE, mode);
  };

  const isAdmin = currentUser?.role === 'ADMIN' || activeRoleMode === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        loginAs,
        logout,
        refreshUsers: loadUsersAndInit,
        isAdmin,
        switchRoleMode,
        activeRoleMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
