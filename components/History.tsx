
import React, { useState, useEffect } from 'react';
import { PomodoroSession, User } from '../types';
// import { supabaseService } from '../services/supabaseService'; // No longer needed directly for fetching
import { ExportIcon, ChevronDownIcon, ChevronUpIcon, EditIcon, TrashIcon } from './icons';

interface HistoryProps {
  currentUser: User | null;
  sessions: PomodoroSession[]; 
  refreshSessions: () => void;
  onEditSession: (session: PomodoroSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

const AccordionItem: React.FC<{ session: PomodoroSession; onEdit: () => void; onDelete: () => void; }> = ({ session, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la session "${session.taskName}" ? Cette action est irréversible.`)) {
      onDelete();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent accordion toggle
    onEdit();
  };

  return (
    <div className="bg-gray-700 rounded-md">
      <div /* Changed h2 to div for semantic correctness, button is the interactive element */
        className="flex items-center justify-between w-full p-4 hover:bg-gray-600 rounded-md transition-colors group"
        onClick={() => setIsOpen(!isOpen)} // Make the whole bar clickable for toggle
        role="button" // Accessibility
        tabIndex={0} // Make it focusable
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsOpen(!isOpen)} // Keyboard toggle
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${session.id}`}
      >
        <div className="flex-1 cursor-pointer"> {/* Cursor pointer for the text part */}
          <span className="text-teal-400 font-semibold">{session.taskName}</span>
          <span className="text-xs text-gray-400 ml-2">({session.durationMinutes} min)</span>
          <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">
            {new Date(session.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-2">
            <button
                onClick={handleEditClick}
                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-gray-700"
                aria-label={`Modifier la session ${session.taskName}`}
                title="Modifier"
            >
                <EditIcon className="w-5 h-5" />
            </button>
            <button
                onClick={handleDeleteClick}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-gray-700"
                aria-label={`Supprimer la session ${session.taskName}`}
                title="Supprimer"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
             {isOpen ? <ChevronUpIcon className="w-5 h-5 text-teal-400" /> : <ChevronDownIcon className="w-5 h-5 text-teal-400"/>}
        </div>

      </div>
      {isOpen && (
        <div id={`accordion-content-${session.id}`} className="p-4 border-t border-gray-600">
          <h3 className="text-sm font-semibold text-gray-300 mb-1">Description:</h3>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{session.taskDescription || "Aucune description fournie."}</p>
        </div>
      )}
    </div>
  );
};


const History: React.FC<HistoryProps> = ({ currentUser, sessions, refreshSessions, onEditSession, onDeleteSession }) => {
  const [isLoading, setIsLoading] = useState(false); // For export, refresh is handled by App.tsx

  useEffect(() => {
    if (currentUser) {
      // refreshSessions(); // Initial load now handled by App.tsx, this can be for explicit refresh button if added
    }
  }, [currentUser, refreshSessions]);


  const handleExportData = () => {
    if (!currentUser || sessions.length === 0) return;
    setIsLoading(true); 
    try {
      const dataStr = JSON.stringify(sessions, null, 2); 
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `pomodoro_export_${currentUser.id}_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(linkElement); 
      linkElement.click();
      document.body.removeChild(linkElement); 
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Erreur lors de l'exportation des données.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <p className="text-center text-gray-400 py-10">Veuillez vous connecter pour voir l'historique.</p>;
  }
  
  // isLoading state here could be for its own loading, e.g. if History fetches its own data.
  // But since sessions are passed as props, App.tsx's loading state is more relevant for the data itself.

  return (
    <div className="p-6 bg-gray-800 shadow-2xl rounded-lg max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-teal-400">Historique des Sessions</h2>
        {sessions.length > 0 && (
            <button
            onClick={handleExportData}
            disabled={isLoading} // isLoading for export specifically
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50"
            >
            <ExportIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Exportation...' : 'Exporter les Données'}
            </button>
        )}
      </div>
      
      {/* Loading state for sessions is implicitly handled by App.tsx passing sessions array */}
      {sessions.length === 0 && !isLoading && ( // Show no sessions if array is empty and not currently exporting
        <p className="text-center text-gray-400 py-8">Aucune session enregistrée pour le moment.</p>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <AccordionItem 
              key={session.id} 
              session={session} 
              onEdit={() => onEditSession(session)}
              onDelete={() => onDeleteSession(session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
