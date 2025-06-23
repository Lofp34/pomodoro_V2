import React, { useState } from 'react';
import { PomodoroSession, User, Remark, HistoryItem } from '../types';
import { EditIcon, TrashIcon, ResetIcon } from './icons';
import { supabaseService } from '../services/supabaseService';

interface HistoryProps {
  currentUser: User;
  sessions: HistoryItem[];
  refreshSessions: () => void;
  onEditSession: (session: PomodoroSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteRemark: (remarkId: string) => void;
  onUpdateRemark: (remarkId: string, content: string) => void;
}

// A type guard to check if an item is a PomodoroSession
function isPomodoroSession(item: HistoryItem): item is PomodoroSession {
  return 'taskName' in item;
}

const RemarkCard: React.FC<{
  remark: Remark;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}> = ({ remark, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(remark.content);

  const handleUpdate = () => {
    if (editText.trim() !== remark.content) {
      onUpdate(remark.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUpdate();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(remark.content);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-md flex items-start justify-between space-x-4">
      <div className="flex-grow">
        <p className="font-semibold text-purple-400 text-lg">Remarque</p>
        <p className="text-sm text-gray-400 italic">{new Date(remark.created_at).toLocaleString()}</p>
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleUpdate}
            className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200 focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        ) : (
          <p className="mt-2 text-gray-300 whitespace-pre-wrap">{remark.content}</p>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center space-x-2">
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-purple-400 rounded-full transition-colors duration-200" title="Modifier">
            <EditIcon className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => onDelete(remark.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors duration-200" title="Supprimer">
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const SessionCard: React.FC<{
  session: PomodoroSession;
  onEdit: (session: PomodoroSession) => void;
  onDelete: (id: string) => void;
}> = ({ session, onEdit, onDelete }) => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-md flex items-start justify-between space-x-4">
    <div className="flex-grow">
      <p className="font-semibold text-teal-400 text-lg">{session.taskName}</p>
      <p className="text-sm text-gray-400 italic">{session.durationMinutes} minutes - {new Date(session.created_at).toLocaleDateString()}</p>
      <p className="mt-2 text-gray-300 whitespace-pre-wrap">{session.taskDescription}</p>
    </div>
    <div className="flex-shrink-0 flex items-center space-x-2">
      <button onClick={() => onEdit(session)} className="p-2 text-gray-400 hover:text-teal-400 rounded-full transition-colors duration-200" title="Modifier">
        <EditIcon className="w-5 h-5" />
      </button>
      <button onClick={() => onDelete(session.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors duration-200" title="Supprimer">
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const History: React.FC<HistoryProps> = ({ sessions, refreshSessions, onEditSession, onDeleteSession, onDeleteRemark, onUpdateRemark }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-teal-400 font-orbitron">Fil de la journée</h2>
        <button onClick={refreshSessions} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors duration-200" title="Rafraîchir">
          <ResetIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-4">
        {sessions.length > 0 ? (
          sessions.map((item) => (
            isPomodoroSession(item) ? (
              <SessionCard key={item.id} session={item} onEdit={onEditSession} onDelete={onDeleteSession} />
            ) : (
              <RemarkCard key={item.id} remark={item as Remark} onDelete={onDeleteRemark} onUpdate={onUpdateRemark} />
            )
          ))
        ) : (
          <p className="text-gray-400 text-center py-8">Aucune activité enregistrée pour le moment.</p>
        )}
      </div>
    </div>
  );
};

export default History;
