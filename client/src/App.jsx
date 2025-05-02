import React, { useState, useEffect, memo } from 'react';
import { Plane, Menu, X, ChevronDown, LogOut, DollarSign } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import BetPanel from './components/BetPanel';
import GameHistory from './components/GameHistory';
import LivePlayers from './components/LivePlayers';
import ChatBox from './components/ChatBox';
import Leaderboard from './components/Leaderboard';
import { useGameState } from './utils/gameLogic';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import DepositModal from './components/DepositModal';
import { Toaster } from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const App = memo(function App() {
  const {
    currentMultiplier,
    gamePhase,
    gameHistory,
    cashOut,
    placeBet
  } = useGameState();
  
  const { user, isLoading, logout, fetchBalance, updateBalance } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [activePlayers, setActivePlayers] = useState([]);

  useEffect(() => {
    if (gamePhase === 'waiting') {
      setActivePlayers([]); // Clear active players on new round
    }
  }, [gamePhase]);

  const handleBet = (panelId, amount, autoCashout, betData) => {
    if (betData) {
      handlePlayerBet(betData);
    }
    const playerId = `player${panelId}`;
    placeBet(playerId, amount, autoCashout);
  };

  const handleCashout = (panelId, betId, winAmount, multiplier, status = 'cashed_out') => {
    const playerId = `player${panelId}`;
    cashOut(playerId);
    handlePlayerUpdate(betId, status, winAmount, multiplier);

    // Remove player after 3 seconds
    setTimeout(() => {
      setActivePlayers(prev => prev.filter(player => player.betId !== betId));
    }, 3000);
  };

  const handlePlayerBet = (betData) => {
    setActivePlayers((prev) => {
      const existingPlayerIndex = prev.findIndex(
        (p) => p.username === betData.username
      );
      if (existingPlayerIndex >= 0) {
        const updatedPlayers = [...prev];
        updatedPlayers[existingPlayerIndex] = {
          ...updatedPlayers[existingPlayerIndex],
          betAmount: betData.amount,
          status: 'betting',
          autoCashout: betData.autoCashout,
          betId: betData.betId,
        };
        return updatedPlayers;
      } else {
        return [...prev, betData];
      }
    });
  };

  const handlePlayerUpdate = (betId, status, winAmount = 0, multiplier = 0) => {
    setActivePlayers((prev) => {
      return prev.map((player) => {
        if (player.betId === betId) {
          return { ...player, status, winAmount, multiplier };
        } else {
          return player;
        }
      });
    });
  };

  const handleDeposit = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowDepositModal(true);
  };

  useEffect(() => {
    document.title = `${currentMultiplier.toFixed(2)}x | Aviator`;
    if (gamePhase === 'flying') {
      document.title = `${currentMultiplier.toFixed(2)}x | Aviator`;
    } else if (gamePhase === 'crashed') {
      document.title = `Crashed at ${currentMultiplier.toFixed(2)}x | Aviator`;
    } else {
      document.title = 'Aviator Game';
    }
  }, [currentMultiplier, gamePhase]);

  useEffect(() => {
    if (user?._id) {
      fetchBalance();
    }
  }, [user?._id, fetchBalance]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/transactions/balance`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          updateBalance(data.balance);
          console.log('Balance updated:', data.balance);
        }
      } catch (error) {
        console.error('Balance fetch error:', error);
      }
    };
    if (user) {
      fetchUserBalance();
      const interval = setInterval(fetchUserBalance, 5000);
      return () => clearInterval(interval);
    }
  }, [user, updateBalance]);

  const formatBalance = (balance) => {
    return typeof balance === 'number' ? balance.toFixed(2) : '0.00';
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      <header className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Plane className="text-teal-500 mr-2" size={24} />
            <h1 className="text-xl font-bold">Aviator</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                >
                  <span>KES {formatBalance(user?.balance)}</span>
                  <ChevronDown size={16} />
                </button>
                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                    <div className="p-3 border-b border-gray-700">
                      <div className="text-sm font-medium">{user.username}</div>
                      <div className="text-xs text-gray-400">{user.email || user.phone}</div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={handleDeposit}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center"
                      >
                        <DollarSign size={16} className="mr-2" />
                        Deposit
                      </button>
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center text-red-400"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleDeposit}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded transition-colors"
              >
                Bet Now
              </button>
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-b border-gray-700 p-4">
            {user ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-400">{user.email || user.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">KES {formatBalance(user?.balance)}</div>
                    <div className="text-sm text-gray-400">Balance</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={handleDeposit}
                    className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded flex items-center justify-center"
                  >
                    <DollarSign size={16} className="mr-2" />
                    Deposit
                  </button>
                  <button
                    onClick={logout}
                    className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded flex items-center justify-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleDeposit}
                className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded"
              >
                Login
              </button>
            )}
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GameCanvas 
              multiplier={currentMultiplier} 
              gamePhase={gamePhase} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BetPanel 
                panelId={1}
                gamePhase={gamePhase}
                currentMultiplier={currentMultiplier}
                onPlaceBet={(amount, autoCashout, betData) => handleBet(1, amount, autoCashout, betData)}
                onCashOut={(betId, winAmount, multiplier, status) => handleCashout(1, betId, winAmount, multiplier, status)}
              />
              <BetPanel 
                panelId={2}
                gamePhase={gamePhase}
                currentMultiplier={currentMultiplier}
                onPlaceBet={(amount, autoCashout, betData) => handleBet(2, amount, autoCashout, betData)}
                onCashOut={(betId, winAmount, multiplier, status) => handleCashout(2, betId, winAmount, multiplier, status)}
              />
            </div>
            <GameHistory history={gameHistory} />
          </div>
          <div className="space-y-6">
            <LivePlayers 
              players={activePlayers}
              currentMultiplier={currentMultiplier}
            />
            <div className="h-[350px]">
              <ChatBox />
            </div>
            <Leaderboard />
          </div>
        </div>
      </main>
      <footer className="bg-gray-800/90 backdrop-blur border-t border-gray-700 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="mb-2">Aviator Game &copy; 2025. All rights reserved.</p>
          <p>
            <a href="#" className="text-teal-400 hover:text-teal-300 mx-2">Provably Fair</a>
            <a href="#" className="text-teal-400 hover:text-teal-300 mx-2">Terms of Service</a>
            <a href="#" className="text-teal-400 hover:text-teal-300 mx-2">Privacy Policy</a>
          </p>
        </div>
      </footer>
      {showAuthModal && !user && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      {showDepositModal && user && (
        <DepositModal 
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          user={user}
        />
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
          },
          success: {
            icon: '✅',
            style: {
              border: '1px solid #059669',
            },
          },
          error: {
            icon: '❌',
            style: {
              border: '1px solid #dc2626',
            },
          },
        }}
      />
    </div>
  );
});

export default App;