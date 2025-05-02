import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, DollarSign } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const DepositModal = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateBalance } = useAuth();

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      const data = await response.json();
      if (response.ok && data.balance !== undefined) {
        if (updateBalance) updateBalance(data.balance);
        setAmount('');
        onClose();
      } else {
        alert(
          (data.message || data.error) +
          (data.error && data.error.includes('balanceAfter') 
            ? '\n\n[Developer note: The backend must include a `balanceAfter` field in the transaction model or response.]'
            : ''
          ) ||
          'Deposit failed'
        );
      }
    } catch {
      alert('Deposit failed');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">Deposit Funds</h2>
        
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Amount (KES)</label>
            <div className="relative">
              <DollarSign size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded"
          >
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DepositModal;
