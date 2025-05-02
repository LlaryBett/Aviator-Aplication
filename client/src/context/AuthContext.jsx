import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const balanceLock = useRef(false);
  const [balanceFetchLock, setBalanceFetchLock] = useState(false);
  const [lastManualUpdate, setLastManualUpdate] = useState(0);

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
        console.log('Toast: Successfully logged in!'); // <-- Add this line
        toast.success('Successfully logged in!'); // <-- THIS IS USED FOR SUCCESSFUL LOGIN
        fetchBalance(); // Fetch balance after login
        return true;
      }
      throw new Error(data.error);
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message);
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
    setLastManualUpdate(Date.now());
    console.log('🔄 Balance Update:', { 
      previous: user?.balance,
      new: newBalance,
      change: newBalance - (user?.balance || 0)
    });
    setUser(prev => {
      const updated = { ...prev, balance: newBalance };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, [user?.balance]);

  const fetchBalance = useCallback(async () => {
    if (Date.now() - lastManualUpdate < 1500) return;
    if (balanceFetchLock) return;
    setBalanceFetchLock(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/balance`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (response.ok && data.balance !== user?.balance) {
        setUser(prev => ({
          ...prev,
          balance: Number(data.balance)
        }));
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
    } finally {
      setBalanceFetchLock(false);
    }
  }, [user?.balance, lastManualUpdate, balanceFetchLock]);

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

  useEffect(() => {
    return () => {
      balanceLock.current = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      logout,
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
