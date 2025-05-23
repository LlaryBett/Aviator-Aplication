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
import TransactionModal from './components/TransactionModal';
import { Toaster } from 'react-hot-toast';
import LoginOrDemoPrompt from './components/LoginOrDemoPrompt';
import { toast } from 'react-toastify';
import Loader from './components/Loader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const App = memo(function App() {
  const {
    currentMultiplier,
    gamePhase,
    gameHistory,
    cashOut,
    placeBet
  } = useGameState();
  
  const { user, isLoading, logout, fetchBalance } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [activePlayers, setActivePlayers] = useState([]);
  const [cashedOutBets, setCashedOutBets] = useState([]); // Track cashed out betIds
  const [showModePrompt, setShowModePrompt] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [demoBalance, setDemoBalance] = useState(0);
  const isLoggedIn = !!localStorage.getItem('token');

  const getDisplayedBalance = () => {
    if (demoMode) return demoBalance.toFixed(2);
    if (user) return formatBalance(user.balance);
    return '0.00';
  };

  useEffect(() => {
    if (gamePhase === 'waiting') {
      setActivePlayers([]); // Clear active players on new round
    }
  }, [gamePhase]);

  const handleBet = (panelId, amount, autoCashout, betData) => {
    if (!isLoggedIn && !demoMode) {
      toast.error('You must login to place a bet.');
      return;
    }
    if (demoMode) {
      console.log('[DEMO] Placing bet:', { panelId, amount, autoCashout, betData, demoBalance });
      if (demoBalance < amount) {
        toast.error('Insufficient demo balance.');
        return;
      }
      // Deduct balance and add player
      setDemoBalance(prev => {
        const newBalance = prev - amount;
        console.log('[DEMO] New demo balance after bet:', newBalance);
        return newBalance;
      });
      setActivePlayers(prev => [
        ...prev,
        betData
          ? { ...betData, amount, status: 'betting', betAmount: amount }
          : {
              username: 'DemoUser',
              betAmount: amount,
              status: 'betting',
              betId: `demo-bet-${Date.now()}`,
              autoCashout,
            }
      ]);
      return;
    }
    if (betData) {
      handlePlayerBet(betData);
      // Always pass betId to placeBet if available
      const playerId = `player${panelId}`;
      placeBet(playerId, amount, autoCashout, betData.betId || null);
    } else {
      const playerId = `player${panelId}`;
      placeBet(playerId, amount, autoCashout);
    }
  };

  const handleCashout = (panelId, betId, winAmount, multiplier, status = 'cashed_out') => {
    console.trace('[App] handleCashout called', { panelId, betId, winAmount, multiplier, status });
    // Prevent double cashout for the same betId
    if (!betId || cashedOutBets.includes(betId)) return;
    setCashedOutBets(prev => [...prev, betId]);

    const playerId = `player${panelId}`;
    if (demoMode) {
      // Find the player and update demoBalance accordingly
      setActivePlayers(prev => {
        const player = prev.find(p => p.betId === betId);
        if (player && status === 'cashed_out') {
          setDemoBalance(prevBal => prevBal + (player.betAmount * multiplier));
        }
        return prev.filter(p => p.betId !== betId);
      });
      setTimeout(() => {
        setCashedOutBets(prev => prev.filter(id => id !== betId));
      }, 3000);
      return;
    }

    cashOut(playerId); // If your cashOut supports betId, pass it here
    handlePlayerUpdate(betId, status, winAmount, multiplier);

    // Remove player after 3 seconds
    setTimeout(() => {
      setActivePlayers(prev => prev.filter(player => player.betId !== betId));
      setCashedOutBets(prev => prev.filter(id => id !== betId));
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
    setShowTransactionModal(true);
  };

  const handlePlayLive = () => {
    setShowModePrompt(false);
    if (!isLoggedIn) {
      toast.info('Please login to play live.');
      // Optionally, redirect to login page here
    }
  };

  const handlePlayDemo = (initialBalance) => {
    setShowModePrompt(false);
    setDemoMode(true);
    setDemoBalance(initialBalance); // Set demo balance to 5000
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

  const formatBalance = (balance) => {
    return typeof balance === 'number' ? balance.toFixed(2) : '0.00';
  };

  if (isLoading) {
    return <Loader />;
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
            {/* Show demo balance if in demo mode, otherwise show user balance */}
            {demoMode ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded">
                <span>Demo Balance: KES {getDisplayedBalance()}</span>
              </div>
            ) : user ? (
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
                        Wallet
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
                isDemoMode={demoMode}
                balance={demoMode ? demoBalance : user?.balance || 0}
              />
              <BetPanel 
                panelId={2}
                gamePhase={gamePhase}
                currentMultiplier={currentMultiplier}
                onPlaceBet={(amount, autoCashout, betData) => handleBet(2, amount, autoCashout, betData)}
                onCashOut={(betId, winAmount, multiplier, status) => handleCashout(2, betId, winAmount, multiplier, status)}
                isDemoMode={demoMode}
                balance={demoMode ? demoBalance : user?.balance || 0}
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
      {showTransactionModal && user && (
        <TransactionModal 
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          balance={user?.balance || 0}
        />
      )}
      {showModePrompt && (
        <LoginOrDemoPrompt
          onPlayLive={handlePlayLive}
          onPlayDemo={handlePlayDemo}
        />
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000, // Shorten the duration to 2 seconds
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