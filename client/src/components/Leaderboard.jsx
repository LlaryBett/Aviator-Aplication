import React from 'react';
import { Trophy, Medal } from 'lucide-react';

const Leaderboard = () => {
  // Mock leaderboard data
  const players = [
    {
      id: 'player1',
      name: 'HighFlyer92',
      avatar: 'https://i.pravatar.cc/150?u=highflyer',
      totalWon: 15420,
      biggestWin: 4200,
      gamesPlayed: 243
    },
    {
      id: 'player2',
      name: 'LuckyPilot',
      avatar: 'https://i.pravatar.cc/150?u=luckypilot',
      totalWon: 12750,
      biggestWin: 3800,
      gamesPlayed: 189
    },
    {
      id: 'player3',
      name: 'SkyChaser',
      avatar: 'https://i.pravatar.cc/150?u=skychaser',
      totalWon: 9840,
      biggestWin: 2150,
      gamesPlayed: 215
    },
    {
      id: 'player4',
      name: 'CaptainJack',
      avatar: 'https://i.pravatar.cc/150?u=captainjack',
      totalWon: 7620,
      biggestWin: 1950,
      gamesPlayed: 176
    },
    {
      id: 'player5',
      name: 'AceNavigator',
      avatar: 'https://i.pravatar.cc/150?u=acenavigator',
      totalWon: 5340,
      biggestWin: 1200,
      gamesPlayed: 152
    }
  ];
  
  // Function to get medal icon and style for top 3 players
  const getMedalForRank = (rank) => {
    if (rank === 0) return <Medal size={16} className="text-yellow-400" />;
    if (rank === 1) return <Medal size={16} className="text-gray-300" />;
    if (rank === 2) return <Medal size={16} className="text-amber-600" />;
    return null;
  };
  
  return (
    <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Trophy size={18} className="mr-2 text-yellow-500" />
          Leaderboard
        </h3>
        <div className="text-xs text-gray-400">
          Daily Top Winners
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[300px]">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-2">Rank</th>
              <th className="pb-2">Player</th>
              <th className="pb-2">Total Won</th>
              <th className="pb-2 hidden sm:table-cell">Biggest Win</th>
              <th className="pb-2 hidden sm:table-cell">Games</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr 
                key={player.id} 
                className={`border-b border-gray-700/50 text-sm ${
                  index === 0 ? 'bg-yellow-500/10' : ''
                }`}
              >
                <td className="py-2 font-medium flex items-center">
                  {getMedalForRank(index) || <span className="ml-1">{index + 1}</span>}
                </td>
                <td className="py-2 flex items-center">
                  <img 
                    src={player.avatar} 
                    alt={player.name} 
                    className="w-6 h-6 rounded-full mr-2" 
                  />
                  <span className="text-white">{player.name}</span>
                </td>
                <td className="py-2 text-teal-400 font-semibold">ksh.{player.totalWon.toLocaleString()}</td>
                <td className="py-2 text-white hidden sm:table-cell">ksh.{player.biggestWin.toLocaleString()}</td>
                <td className="py-2 text-gray-400 hidden sm:table-cell">{player.gamesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;