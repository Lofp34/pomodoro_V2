import React from 'react';
import { PomodoroSession, User, Remark, HistoryItem } from '../types';
import { EditIcon, TrashIcon, ResetIcon } from './icons';

interface HistoryProps {
  currentUser: User;
  sessions: HistoryItem[];
  refreshSessions: () => void;
  onEditSession: (session: PomodoroSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteRemark: (remarkId: string) => void;
}

// A type guard to check if an item is a PomodoroSession
function isPomodoroSession(item: HistoryItem): item is PomodoroSession {
  return 'taskName' in item;
}

const History: React.FC<HistoryProps> = ({ sessions, refreshSessions, onEditSession, onDeleteSession, onDeleteRemark }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-teal-400 font-orbitron">Historique des Sessions</h2>
        <button onClick={refreshSessions} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors duration-200" title="Rafraîchir">
          <ResetIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-4">
        {sessions.length > 0 ? (
          sessions.map((item) => (
            <div key={item.id} className="bg-gray-900 p-4 rounded-lg shadow-md flex items-start justify-between space-x-4">
              {isPomodoroSession(item) ? (
                // Render Pomodoro Session
                <div className="flex-grow">
                  <p className="font-semibold text-teal-400 text-lg">{item.taskName}</p>
                  <p className="text-sm text-gray-400 italic">
                    {item.durationMinutes} minutes - {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-gray-300 whitespace-pre-wrap">{item.taskDescription}</p>
                </div>
              ) : (
                // Render Remark
                <div className="flex-grow">
                   <p className="font-semibold text-purple-400 text-lg">Remarque</p>
                   <p className="text-sm text-gray-400 italic">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-gray-300 whitespace-pre-wrap">{item.content}</p>
                </div>
              )}
              
              <div className="flex-shrink-0 flex items-center space-x-2">
                {isPomodoroSession(item) && (
                  <button onClick={() => onEditSession(item)} className="p-2 text-gray-400 hover:text-teal-400 rounded-full transition-colors duration-200" title="Modifier">
                    <EditIcon className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => isPomodoroSession(item) ? onDeleteSession(item.id) : onDeleteRemark(item.id)} 
                  className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors duration-200" 
                  title="Supprimer"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">Aucune session enregistrée pour le moment.</p>
        )}
      </div>
    </div>
  );
};

export default History;
