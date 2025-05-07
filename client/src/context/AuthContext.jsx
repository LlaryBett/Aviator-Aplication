import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balanceFetchLock, setBalanceFetchLock] = useState(false);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Token verification failed');

      const data = await response.json();
      setUser(data.user);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      return true;
    } catch (err) {
      console.error('Verification error:', err.message);
      return false;
    }
  };

  const login = async (credentials) => {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        console.log('Login successful. User data:', data.user);
        console.log('Login successful. Full data:', data);
        toast.success('Successfully logged in!');
        fetchBalance();
        return data; // Return the data object
      }
      toast.error(data.error || 'Login failed');
      throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || 'Login failed');
      return null; // Return null on error
    }
  };

  const register = async (credentials) => {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Registration successful! Please login.');
        return true;
      }
      toast.error(data.error || 'Registration failed');
      throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateBalance = useCallback((newBalance) => {
    if (typeof newBalance !== 'number' || isNaN(newBalance)) {
        console.error('[AuthContext] Invalid balance update:', newBalance);
        return;
    }
    setUser(prev => {
        if (prev?.balance === newBalance) return prev;
        console.log('[AuthContext] 💰 Balance update:', {
            from: prev?.balance,
            to: newBalance,
            change: newBalance - (prev?.balance || 0)
        });
        const updated = { ...prev, balance: newBalance };
        sessionStorage.setItem('user', JSON.stringify(updated));
        return updated;
    });
  }, []);

  const fetchBalance = useCallback(async () => {
    if (balanceFetchLock) return;
    setBalanceFetchLock(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/balance`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      if (res.ok && data.balance !== user?.balance) {
        updateBalance(Number(data.balance));
        console.log('✅ Balance fetched and updated:', data.balance);
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    } finally {
      setBalanceFetchLock(false);
    }
  }, [user?.balance, balanceFetchLock, updateBalance]);

  const deductBalance = (amount) => {
    if (!user || user.balance < amount) return false;
    updateBalance(user.balance - amount);
    return true;
  };

  const addWinnings = (amount) => {
    if (!user) return false;
    updateBalance(user.balance + amount);
    return true;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const sessionUser = sessionStorage.getItem('user');

      if (sessionUser) {
        setUser(JSON.parse(sessionUser));
      }

      if (token) {
        const isValid = await verifyToken(token);
        if (!isValid) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (user?._id) {
      const intervalId = setInterval(fetchBalance, 3000);
      return () => clearInterval(intervalId);
    }
  }, [user?._id, fetchBalance]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout,
      register,
      isAuthenticated: !!user,
      deductBalance,
      addWinnings,
      fetchBalance,
      updateBalance
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
