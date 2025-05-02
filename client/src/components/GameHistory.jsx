import React from 'react';
import { History } from 'lucide-react';

const GameHistory = ({ history }) => {
  // Function to determine the color based on crash point
  const getCrashPointColor = (crashPoint) => {
    if (crashPoint < 1.5) return 'text-red-500';
    if (crashPoint < 2) return 'text-yellow-500';
    if (crashPoint < 5) return 'text-green-500';
    return 'text-teal-400';
  };
  
  return (
    <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <History size={18} className="mr-2 text-gray-400" />
          Game History
        </h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {history.map((item) => (
          <div 
            key={item.id}
            className={`${getCrashPointColor(item.crashPoint)} bg-gray-700/60 text-sm font-medium px-3 py-1 rounded-full`}
          >
            {item.crashPoint.toFixed(2)}x
          </div>
        ))}
      </div>
      
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-700/60 p-2 rounded flex flex-col items-center">
          <span className="text-xs text-gray-400">Avg. Crash</span>
          <span className="text-white font-medium">
            {(history.reduce((sum, item) => sum + item.crashPoint, 0) / (history.length || 1)).toFixed(2)}x
          </span>
        </div>
        
        <div className="bg-gray-700/60 p-2 rounded flex flex-col items-center">
          <span className="text-xs text-gray-400">Highest</span>
          <span className="text-teal-400 font-medium">
            {Math.max(...history.map(item => item.crashPoint)).toFixed(2)}x
          </span>
        </div>
        
        <div className="bg-gray-700/60 p-2 rounded flex flex-col items-center">
          <span className="text-xs text-gray-400">Below 2x</span>
          <span className="text-white font-medium">
            {Math.round((history.filter(item => item.crashPoint < 2).length / (history.length || 1)) * 100)}%
          </span>
        </div>
        
        <div className="bg-gray-700/60 p-2 rounded flex flex-col items-center">
          <span className="text-xs text-gray-400">Above 2x</span>
          <span className="text-white font-medium">
            {Math.round((history.filter(item => item.crashPoint >= 2).length / (history.length || 1)) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameHistory;