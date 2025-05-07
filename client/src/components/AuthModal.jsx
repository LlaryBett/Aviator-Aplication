import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const AuthModal = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (activeTab === 'login') {
        const success = await login(formData);
        if (success && success.token) {
          localStorage.setItem('token', success.token);
          console.log('Login successful. Token:', success.token); // Add this line
          onClose();
        } else {
          console.error('Login failed or token missing:', success);
          setError('Login failed. Please try again.');
        }
      } else {
        // Handle registration
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (response.ok) {
          toast.success('Registration successful! Please login.');
          setActiveTab('login');
          setFormData(prev => ({ ...prev, password: '' }));
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 ${activeTab === 'login' ? 
              'text-white border-b-2 border-teal-500' : 
              'text-gray-400 border-b border-gray-700'}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 ${activeTab === 'register' ? 
              'text-white border-b-2 border-teal-500' : 
              'text-gray-400 border-b border-gray-700'}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'register' && (
            <>
              <div className="relative">
                <User size={20} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="relative">
                <Phone size={20} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., 0712345678)"
                  className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail size={20} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="email"
              placeholder={`Email ${activeTab === 'register' ? '(Optional)' : ''}`}
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required={activeTab === 'login' && !formData.phone}
            />
          </div>

          {activeTab === 'login' && (
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required={!formData.email}
              />
            </div>
          )}

          <div className="relative">
            <Lock size={20} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded flex items-center justify-center"
          >
            {loading ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              activeTab === 'login' ? 'Login' : 'Register'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
