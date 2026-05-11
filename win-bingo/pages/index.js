import React from 'react';
import LobbyScreen from '../lib/components/LobbyScreen';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* ይህ ዋናው የቢንጎ መግቢያ ገጽ ነው */}
      <LobbyScreen />
    </main>
  );
}