import React, { useState, useEffect } from 'react';
import { PomodoroPhase, User } from '../types';
import { PlayIcon, PauseIcon, StopIcon } from './icons'; // Removed ResetIcon as Stop serves this purpose now for IDLE state.

interface TimerProps {
  currentUser: User | null;
  appPhase: PomodoroPhase;
  timeToDisplayInSeconds: number;
  pomodorosCompleted: number;
  currentWorkTaskName: string | null; // Name of the task currently in RUNNING or PAUSED state for display
  liveDescription: string;
  onLiveDescriptionChange: (description: string) => void;
  onStartWorkSession: (taskName: string) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onStopSession: () => void; // Resets current work session to IDLE
  onStartBreakSession: () => void;
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const Timer: React.FC<TimerProps> = ({
  currentUser,
  appPhase,
  timeToDisplayInSeconds,
  pomodorosCompleted,
  currentWorkTaskName,
  liveDescription,
  onLiveDescriptionChange,
  onStartWorkSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  onStartBreakSession,
}) => {
  const [localTaskName, setLocalTaskName] = useState('');

  // Reset local task name if app goes to IDLE and it wasn't a stop action that cleared it
  useEffect(() => {
    if (appPhase === PomodoroPhase.IDLE) {
      setLocalTaskName('');
    }
  }, [appPhase]);

  const handleStart = () => {
    if (localTaskName.trim() === '') {
      alert('Veuillez nommer votre tâche avant de commencer.');
      return;
    }
    onStartWorkSession(localTaskName);
  };

  const handleStop = () => {
    onStopSession();
    setLocalTaskName(''); // Clear input on stop
  };
  
  if (!currentUser) return <p className="text-center text-gray-400 py-10">Please log in to use the timer.</p>;

  const isTimerEffectivelyRunning = appPhase === PomodoroPhase.RUNNING || appPhase === PomodoroPhase.BREAK;

  let titleText = "Session de Travail";
  let subtitleText = "Prêt pour une nouvelle session ?";

  if (appPhase === PomodoroPhase.BREAK) {
    titleText = "Pause";
    subtitleText = (pomodorosCompleted > 0 && pomodorosCompleted % 4 === 0) ? "Longue pause !" : "Petite pause !";
  } else if (appPhase === PomodoroPhase.RUNNING && currentWorkTaskName) {
    titleText = "Session de Travail";
    subtitleText = `Tâche: ${currentWorkTaskName}`;
  } else if (appPhase === PomodoroPhase.PAUSED && currentWorkTaskName) {
     titleText = "Session en Pause";
     subtitleText = `Tâche: ${currentWorkTaskName}`;
  } else if (appPhase === PomodoroPhase.PAUSED && !currentWorkTaskName) { // Paused from a break
     titleText = "Pause en Attente";
     subtitleText = (pomodorosCompleted > 0 && pomodorosCompleted % 4 === 0) ? "Longue pause en attente !" : "Petite pause en attente !";
  }


  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-800 shadow-2xl rounded-lg max-w-lg mx-auto">
      <h2 className="text-3xl font-bold mb-2 text-center text-teal-400 font-orbitron">
        {titleText}
      </h2>
      <p className="text-gray-400 mb-6 text-center h-6"> {/* Fixed height for subtitle */}
        {subtitleText}
      </p>

      <div className="text-8xl font-mono mb-8 text-white tabular-nums font-orbitron">
        {formatTime(timeToDisplayInSeconds)}
      </div>

      {appPhase === PomodoroPhase.IDLE && (
        <div className="w-full mb-6">
          <input
            type="text"
            value={localTaskName}
            onChange={(e) => setLocalTaskName(e.target.value)}
            placeholder="Nommez votre tâche..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-100 text-center text-lg"
            aria-label="Nom de la tâche"
          />
        </div>
      )}

      <div className="flex space-x-4">
        {appPhase === PomodoroPhase.IDLE && (
          <button
            onClick={handleStart}
            disabled={localTaskName.trim() === ''}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <PlayIcon className="w-6 h-6 mr-2" /> Démarrer
          </button>
        )}

        {isTimerEffectivelyRunning && (
          <button
            onClick={onPauseSession}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out transform hover:scale-105 flex items-center"
          >
            <PauseIcon className="w-6 h-6 mr-2" /> Pause
          </button>
        )}
        
        {appPhase === PomodoroPhase.PAUSED && (
           <button
            onClick={onResumeSession}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out transform hover:scale-105 flex items-center"
          >
            <PlayIcon className="w-6 h-6 mr-2" /> Reprendre
          </button>
        )}

        {(isTimerEffectivelyRunning || appPhase === PomodoroPhase.PAUSED) && (
          <button
            onClick={handleStop} // Stop always goes to IDLE, clears task
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out transform hover:scale-105 flex items-center"
          >
            <StopIcon className="w-6 h-6 mr-2" /> Arrêter
          </button>
        )}
      </div>
      
      {(appPhase === PomodoroPhase.RUNNING || appPhase === PomodoroPhase.PAUSED) && currentWorkTaskName && (
        <div className="w-full mt-6">
          <label htmlFor="live-description" className="block text-sm font-medium text-gray-400 mb-2 text-center">
            Notes sur la tâche en cours...
          </label>
          <textarea
            id="live-description"
            value={liveDescription}
            onChange={(e) => onLiveDescriptionChange(e.target.value)}
            placeholder="Écrivez ici ce que vous faites, les idées, les blocages..."
            className="w-full h-24 px-4 py-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-100 text-sm resize-none"
            aria-label="Description de la tâche en direct"
          />
        </div>
      )}
      
      {(appPhase !== PomodoroPhase.IDLE && appPhase !== PomodoroPhase.DESCRIBING) && (
         <p className="mt-6 text-sm text-gray-400">Pomodoros complétés ce cycle: {pomodorosCompleted}</p>
      )}

      {appPhase === PomodoroPhase.IDLE && pomodorosCompleted > 0 && ( // Show "Take a break" if IDLE and some pomos done (meaning a work session just finished or was stopped)
         <button
            onClick={onStartBreakSession}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors flex items-center"
          >
            Prendre une pause
          </button>
      )}
    </div>
  );
};

export default Timer;
