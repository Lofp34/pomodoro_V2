import React, { useState, useEffect } from 'react';
import { User } from './types';
import { supabaseService } from './services/supabaseService';
import Auth from './components/Auth';
import PomodoroApp from './components/PomodoroApp';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { unsubscribe } = supabaseService.onAuthStateChange((session) => {
      setCurrentUser(session?.user as User | null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabaseService.logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <h1 className="text-2xl text-white">Chargement de l'application...</h1>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }
  
  // The magic is here: using the user's ID as a key.
  // When the user logs in or out, the key changes, forcing React to
  // unmount the old component and mount a new one, completely resetting its state.
  return <PomodoroApp key={currentUser.id} user={currentUser} onLogout={handleLogout} />;
};

export default App;
