import React, { useState, useEffect } from 'react';
import { Plane, Menu, X } from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import BetPanel from './components/BetPanel';
import GameHistory from './components/GameHistory';
import LivePlayers from './components/LivePlayers';
import ChatBox from './components/ChatBox';
import Leaderboard from './components/Leaderboard';
import { useGameState } from './utils/gameLogic';

function App() {
  const {
    currentMultiplier,
    gamePhase,
    gameHistory,
    players,
    cashOut,
    placeBet
  } = useGameState();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      userId: 'system',
      username: 'System',
      avatar: 'https://i.pravatar.cc/150?u=system',
      message: 'Welcome to Aviator! Place your bets and fly high!',
      timestamp: Date.now() - 600000
    },
    {
      id: '2',
      userId: 'user1',
      username: 'JetSetter',
      avatar: 'https://i.pravatar.cc/150?u=user1',
      message: 'Just won 5x! This game is amazing!',
      timestamp: Date.now() - 300000
    },
    {
      id: '3',
      userId: 'user2',
      username: 'SkyKing',
      avatar: 'https://i.pravatar.cc/150?u=user2',
      message: 'Anyone got a strategy for consistent wins?',
      timestamp: Date.now() - 120000
    }
  ]);
  
  const handleBet = (panelId, amount, autoCashout) => {
    const playerId = `player${panelId}`;
    placeBet(playerId, amount, autoCashout);
  };
  
  const handleCashout = (panelId) => {
    const playerId = `player${panelId}`;
    cashOut(playerId);
  };
  
  const handleSendMessage = (message) => {
    const newMessage = {
      id: Math.random().toString(36).substring(2, 9),
      userId: 'user-self',
      username: 'You',
      avatar: 'https://i.pravatar.cc/150?u=self',
      message,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
  };
  
  useEffect(() => {
    if (gamePhase === 'flying') {
      document.title = `${currentMultiplier.toFixed(2)}x | Aviator`;
    } else if (gamePhase === 'crashed') {
      document.title = `Crashed at ${currentMultiplier.toFixed(2)}x | Aviator`;
    } else {
      document.title = 'Aviator Game';
    }
  }, [currentMultiplier, gamePhase]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Plane className="text-teal-500 mr-2" size={24} />
            <h1 className="text-xl font-bold">Aviator</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded transition-colors">
              Deposit
            </button>
            <div className="bg-gray-700 px-3 py-1 rounded">
              Balance: ksh 1,000.00
            </div>
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="bg-gray-700 px-3 py-1 rounded">
                Balance: ksh 1,000.00
              </div>
              <button className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded transition-colors">
                Deposit
              </button>
            </div>
            <nav className="flex flex-col space-y-2">
              <a href="#" className="text-gray-300 hover:text-white py-1">How to Play</a>
              <a href="#" className="text-gray-300 hover:text-white py-1">Statistics</a>
              <a href="#" className="text-gray-300 hover:text-white py-1">Settings</a>
            </nav>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Canvas */}
            <GameCanvas 
              multiplier={currentMultiplier} 
              gamePhase={gamePhase} 
            />
            
            {/* Bet Panels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BetPanel 
                panelId={1}
                gamePhase={gamePhase}
                currentMultiplier={currentMultiplier}
                onPlaceBet={(amount, autoCashout) => handleBet(1, amount, autoCashout)}
                onCashOut={() => handleCashout(1)}
              />
              <BetPanel 
                panelId={2}
                gamePhase={gamePhase}
                currentMultiplier={currentMultiplier}
                onPlaceBet={(amount, autoCashout) => handleBet(2, amount, autoCashout)}
                onCashOut={() => handleCashout(2)}
              />
            </div>
            
            {/* Game History */}
            <GameHistory history={gameHistory} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Players */}
            <LivePlayers 
              players={players}
              currentMultiplier={currentMultiplier}
            />
            
            {/* Chat Box */}
            <div className="h-[350px]">
              <ChatBox 
                messages={chatMessages}
                onSendMessage={handleSendMessage}
              />
            </div>
            
            {/* Leaderboard */}
            <Leaderboard />
          </div>
        </div>
      </main>
      
      {/* Footer */}
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
    </div>
  );
}

export default App;