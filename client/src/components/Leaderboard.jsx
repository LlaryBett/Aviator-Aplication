import React, { useState, useEffect } from 'react';
import { Trophy, Medal } from 'lucide-react';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leaderboard');
        const data = await response.json();
        // Ensure we're using the leaderboard array from the response
        setPlayers(data.leaderboard || []);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setLoading(false);
      }
    };

    fetchLeaderboard();
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to get medal icon and style for top 3 players
  const getMedalForRank = (rank) => {
    if (rank === 0) return <Medal size={16} className="text-yellow-400" />;
    if (rank === 1) return <Medal size={16} className="text-gray-300" />;
    if (rank === 2) return <Medal size={16} className="text-amber-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          Loading leaderboard...
        </div>
      </div>
    );
  }

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
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="pb-2 w-14 text-xs">Rank</th>
              <th className="pb-2 w-32 text-xs">Player</th>
              <th className="pb-2 text-right text-xs">Won (KES)</th>
              <th className="pb-2 text-right hidden sm:table-cell text-xs">Best (KES)</th>
              <th className="pb-2 text-right hidden sm:table-cell w-12 text-xs">Games</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr
                key={player._id}
                className={`border-b border-gray-700/50 ${
                  index === 0 ? 'bg-yellow-500/10' : ''
                }`}
              >
                <td className="py-1.5 font-medium text-xs">
                  {getMedalForRank(index) || <span className="ml-1">{index + 1}</span>}
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-white text-xs font-medium truncate">{player.username}</span>
                  </div>
                </td>
                <td className="py-1.5 text-teal-400 font-medium text-right text-xs">
                  <span className="text-gray-400 mr-0.5">K</span>
                  {player.stats.totalWinnings.toLocaleString()}
                </td>
                <td className="py-1.5 text-white hidden sm:table-cell text-right text-xs">
                  <span className="text-gray-400 mr-0.5">K</span>
                  {player.stats.biggestWin.toLocaleString()}
                </td>
                <td className="py-1.5 text-gray-400 hidden sm:table-cell text-right text-xs">
                  {player.stats.gamesPlayed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;