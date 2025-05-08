import React from 'react';

export default function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-indigo-950">
      <div className="w-16 h-16 border-4 border-teal-500 border-dashed rounded-full animate-spin"></div>
    </div>
  );
}
