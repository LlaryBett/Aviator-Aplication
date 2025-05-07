import React, { useState } from 'react';
import { X, Loader, ArrowDownCircle, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TransactionModal = ({ isOpen, onClose, balance }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !phone) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/transactions/mpesa/stk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(amount),
          phone: phone.replace(/^0/, '254'),
        })
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      
      if (data.success) {
        toast.success('Check your phone for M-Pesa prompt');
        // Start polling for status
        pollTransactionStatus(data.requestId);
      } else {
        throw new Error(data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error(error.message || 'Failed to process payment');
      setIsLoading(false);
    }
  };

  const pollTransactionStatus = async (requestId) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 3 seconds = 60 seconds max
    
    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/transactions/status/${requestId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        const data = await res.json();
        
        if (data.status === 'completed') {
          toast.success('Payment successful!');
          setIsLoading(false);
          onClose();
          return;
        }
        
        if (data.status === 'failed') {
          toast.error('Payment failed. Please try again.');
          setIsLoading(false);
          return;
        }

        // Continue polling if pending
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000); // Check every 3 seconds
        } else {
          setIsLoading(false);
          toast.error('Payment timeout. Please check your M-Pesa messages.');
        }
      } catch (error) {
        console.error('Status check failed:', error);
        setIsLoading(false);
      }
    };

    checkStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Deposit via M-Pesa</h2>
              <p className="text-sm text-gray-400">Wallet Balance: KES {balance.toFixed(2)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder={`Enter amount (Min: 1, Max: 150,000)`}
                min="1"
                max="150000"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                M-Pesa Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="07XX XXX XXX"
                  pattern="^(?:254|\+254|0)?([17]\d{8})$"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !amount || !phone}
              className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded font-medium text-white flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownCircle className="mr-2" size={18} />
                  Deposit Now
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
