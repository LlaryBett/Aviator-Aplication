import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Award } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/leaderboard`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setLeaders(data);
      } else {
        setLeaders([]);
        console.error('Leaderboard API did not return an array:', data);
      }
      setLoading(false);
    } catch (error) {
      setLeaders([]);
      console.error('Leaderboard fetch error:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
        const wsUrl = BACKEND_URL.replace('http', 'ws');
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('✅ Leaderboard WebSocket connected');
            reconnectAttempts = 0;
            fetchLeaderboard();
        };

        ws.onclose = () => {
            console.log('❌ Leaderboard WebSocket closed');
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(connectWebSocket, 1000 * reconnectAttempts);
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'leaderboard_update') {
                fetchLeaderboard();
            }
        };
    };

    connectWebSocket();
    
    return () => {
        if (ws) {
            ws.close();
        }
    };
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" />
          Top Winners
        </h2>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Trophy className="mr-2 text-yellow-500" />
        Top Winners
      </h2>
      <div className="space-y-2">
        {Array.isArray(leaders) && leaders.length > 0 ? (
          leaders.map((player, index) => (
            <div 
              key={player._id}
              className="flex items-center justify-between p-2 rounded bg-gray-700/50 hover:bg-gray-700"
            >
              <div className="flex items-center">
                <span className="w-6 text-gray-400">
                  {index + 1}.
                </span>
                <span className="font-medium">
                  {player.username || 'Anonymous'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-teal-400">
                  KES {player.totalWinnings?.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 flex items-center">
                  <Award size={12} className="mr-1" />
                  {player.winCount} wins
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">
            No winners yet
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;