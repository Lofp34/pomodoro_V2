import React, { useState, useEffect, useCallback } from 'react';
import { User, PomodoroSession, PomodoroPhase, AppView, Remark, HistoryItem } from '../types';
import { supabase, supabaseService } from '../services/supabaseService';
import { WORK_DURATION_MINUTES, SHORT_BREAK_DURATION_MINUTES, LONG_BREAK_DURATION_MINUTES, APP_NAME, DOCUMENT_TITLE } from '../constants';
import Timer from './Timer';
import History from './History';
import Chat from './Chat';
import Modal from './Modal';
import DictationInput from './DictationInput';
import { TimerIcon, HistoryIcon, ChatIcon, LogoutIcon, InfoIcon, MenuIcon } from './icons';
import { geminiService } from '../services/geminiService';
import { notificationService } from '../services/notificationService';

interface PomodoroAppProps {
  user: User;
  onLogout: () => void;
}

const PomodoroApp: React.FC<PomodoroAppProps> = ({ user, onLogout }) => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>(PomodoroPhase.IDLE);
  const [activeView, setActiveView] = useState<AppView>(AppView.TIMER);
  
  // Description Modal (for new sessions)
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [taskForDescription, setTaskForDescription] = useState<{ name: string; duration: number } | null>(null);
  
  // Edit Session Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<PomodoroSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [liveDescription, setLiveDescription] = useState('');
  const [newRemark, setNewRemark] = useState('');
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  const [pomodorosInCycle, setPomodorosInCycle] = useState(0); 
  const [timeRemainingInSeconds, setTimeRemainingInSeconds] = useState(WORK_DURATION_MINUTES * 60);
  const [activeTimerPhaseBeforePause, setActiveTimerPhaseBeforePause] = useState<PomodoroPhase>(PomodoroPhase.RUNNING);
  const [currentTimerTaskName, setCurrentTimerTaskName] = useState<string | null>(null);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This new effect handles app visibility changes to sync the timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      // If the page becomes visible and we have a target end time...
      if (document.visibilityState === 'visible' && targetEndTime) {
        const newRemainingSeconds = Math.round((targetEndTime - Date.now()) / 1000);

        if (newRemainingSeconds <= 0) {
          // Timer finished while in background, trigger completion logic immediately
          setTimeRemainingInSeconds(0);
        } else {
          // Sync the timer to the correct remaining time
          setTimeRemainingInSeconds(newRemainingSeconds);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [targetEndTime]); // Re-bind if targetEndTime changes

  // Restore state from localStorage on initial mount
  useEffect(() => {
    console.log('[DEBUG] PomodoroApp Component Mounted. Attempting to restore state.');
    document.title = DOCUMENT_TITLE;
    try {
      const savedStateJSON = localStorage.getItem(`pomodoroTimerState_${user.id}`);
      console.log(`[DEBUG] Reading from localStorage for key: pomodoroTimerState_${user.id}`);
      console.log('[DEBUG] Raw data from localStorage:', savedStateJSON);

      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        console.log('[DEBUG] Parsed state:', savedState);
        
        if (savedState.currentPhase === PomodoroPhase.RUNNING || savedState.currentPhase === PomodoroPhase.PAUSED) {
          console.log('[DEBUG] Valid active state found. Restoring state now.');
          setCurrentPhase(savedState.currentPhase);
          setTimeRemainingInSeconds(savedState.timeRemainingInSeconds);
          setPomodorosInCycle(savedState.pomodorosInCycle);
          setCurrentTimerTaskName(savedState.currentTimerTaskName);
          setLiveDescription(savedState.liveDescription);
          setActiveTimerPhaseBeforePause(savedState.activeTimerPhaseBeforePause);
          console.log('[DEBUG] STATE RESTORED SUCCESSFULLY.');
        } else {
          console.log('[DEBUG] State found, but phase is not active. Initializing default state.');
        }
      } else {
        console.log('[DEBUG] No state found in localStorage. Initializing default state.');
      }
    } catch (error) {
      console.error("[DEBUG] CRITICAL ERROR while restoring state:", error);
      console.log('[DEBUG] Initializing default state due to error.');
    }
  }, [user.id]); // Only run on mount for this user

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      currentPhase,
      timeRemainingInSeconds,
      pomodorosInCycle,
      currentTimerTaskName,
      liveDescription,
      activeTimerPhaseBeforePause,
    };

    if (currentPhase === PomodoroPhase.RUNNING || currentPhase === PomodoroPhase.PAUSED) {
      const stateJSON = JSON.stringify(stateToSave);
      console.log(`[DEBUG] SAVING to localStorage for key: pomodoroTimerState_${user.id}`);
      console.log('[DEBUG] State object being saved:', stateToSave);
      localStorage.setItem(`pomodoroTimerState_${user.id}`, stateJSON);
    } else {
      console.log(`[DEBUG] REMOVING from localStorage for key: pomodoroTimerState_${user.id} because phase is ${currentPhase}`);
      localStorage.removeItem(`pomodoroTimerState_${user.id}`);
    }
  }, [user.id, currentPhase, timeRemainingInSeconds, pomodorosInCycle, currentTimerTaskName, liveDescription, activeTimerPhaseBeforePause]);

  const fetchHistory = useCallback(async () => {
      const [fetchedSessions, fetchedRemarks] = await Promise.all([
        supabaseService.getPomodoroSessions(),
        supabaseService.getRemarks()
      ]);

      const combinedHistory = [...fetchedSessions, ...fetchedRemarks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSessions(combinedHistory as any); // Using 'any' because of mixed types, will be handled in History component
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Core Timer Logic
  useEffect(() => {
    let intervalId: number | undefined;

    if ((currentPhase === PomodoroPhase.RUNNING || currentPhase === PomodoroPhase.BREAK) && timeRemainingInSeconds > 0) {
        intervalId = window.setInterval(() => {
            setTimeRemainingInSeconds(prev => prev - 1);
        }, 1000);
    } else if (timeRemainingInSeconds === 0) {
        if (currentPhase === PomodoroPhase.RUNNING && currentTimerTaskName) {
            notificationService.showNotification('Session de travail terminée !', 'Il est temps de prendre une pause bien méritée.');
            setTaskForDescription({ name: currentTimerTaskName, duration: WORK_DURATION_MINUTES });
            setPomodorosInCycle(prev => prev + 1);
            setIsDescriptionModalOpen(true); 
            setCurrentPhase(PomodoroPhase.DESCRIBING);
        } else if (currentPhase === PomodoroPhase.BREAK) {
            notificationService.showNotification('La pause est terminée !', 'Prêt(e) à vous reconcentrer ?');
            setCurrentPhase(PomodoroPhase.IDLE);
            setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
            setCurrentTimerTaskName(null); 
        }
    }
    return () => clearInterval(intervalId);
  }, [currentPhase, timeRemainingInSeconds, currentTimerTaskName]);

  const handleAppPhaseChange = (newPhase: PomodoroPhase) => {
    if (newPhase === PomodoroPhase.PAUSED && (currentPhase === PomodoroPhase.RUNNING || currentPhase === PomodoroPhase.BREAK)) {
        setActiveTimerPhaseBeforePause(currentPhase); 
    }

    setCurrentPhase(newPhase);

    switch (newPhase) {
        case PomodoroPhase.IDLE:
            setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
            break;
        case PomodoroPhase.RUNNING:
            if (currentPhase === PomodoroPhase.IDLE || currentPhase === PomodoroPhase.BREAK) {
                 setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
            }
            break;
        case PomodoroPhase.BREAK:
            const breakDuration = (pomodorosInCycle > 0 && pomodorosInCycle % 4 === 0) 
                ? LONG_BREAK_DURATION_MINUTES * 60 
                : SHORT_BREAK_DURATION_MINUTES * 60;
            setTimeRemainingInSeconds(breakDuration);
            setCurrentTimerTaskName(null); 
            break;
        case PomodoroPhase.PAUSED:
        case PomodoroPhase.DESCRIBING:
            break;
    }
  };

  const handleStartWorkSession = async (taskName: string) => {
    // We request permission upon user action, which is best practice.
    await notificationService.requestPermission();
    const duration = WORK_DURATION_MINUTES * 60;
    setTimeRemainingInSeconds(duration);
    setTargetEndTime(Date.now() + duration * 1000);
    setCurrentTimerTaskName(taskName);
    handleAppPhaseChange(PomodoroPhase.RUNNING);
  };
  const handlePauseSession = () => {
    setTargetEndTime(null); // Clear target time on pause
    handleAppPhaseChange(PomodoroPhase.PAUSED);
  }
  const handleResumeSession = () => {
    setTargetEndTime(Date.now() + timeRemainingInSeconds * 1000);
    handleAppPhaseChange(activeTimerPhaseBeforePause);
  }
  const handleStopSession = () => {
    console.log('[DEBUG] handleStopSession called. Resetting timer state.');
    setTargetEndTime(null); // Clear target time on stop
    handleAppPhaseChange(PomodoroPhase.IDLE);
    setCurrentTimerTaskName(null);
    setLiveDescription('');
    localStorage.removeItem(`pomodoroTimerState_${user.id}`);
  };
  const handleStartBreakSession = () => {
    setLiveDescription('');
    const breakDuration = (pomodorosInCycle > 0 && pomodorosInCycle % 4 === 0) 
      ? LONG_BREAK_DURATION_MINUTES * 60 
      : SHORT_BREAK_DURATION_MINUTES * 60;
    setTimeRemainingInSeconds(breakDuration);
    setTargetEndTime(Date.now() + breakDuration * 1000);
    handleAppPhaseChange(PomodoroPhase.BREAK);
  }

  const handleSaveNewRemark = async () => {
    if (!newRemark.trim() || isSavingRemark) return;

    setIsSavingRemark(true);
    try {
      await supabaseService.saveRemark(newRemark);
      setNewRemark(''); // Clear input after saving
      await fetchHistory(); // Refresh history to show the new remark
    } catch (error) {
      console.error("Failed to save remark:", error);
      alert("Erreur lors de la sauvegarde de la remarque. La table 'remarks' existe-t-elle ?");
    } finally {
      setIsSavingRemark(false);
    }
  };

  const handleUpdateRemark = async (remarkId: string, content: string) => {
    try {
      await supabaseService.updateRemark(remarkId, content);
      await fetchHistory(); // Refresh history to show the updated remark
    } catch (error) {
      console.error("Failed to update remark:", error);
      alert("Erreur lors de la mise à jour de la remarque.");
    }
  };

  const handleSaveDescription = async (data: { taskName: string; description: string }) => {
    if (!taskForDescription || isSaving) return;

    setIsSaving(true);
    try {
      const durationInMinutes = Math.round(taskForDescription.duration);
      await supabaseService.savePomodoroSession({
        taskName: taskForDescription.name,
        durationMinutes: durationInMinutes,
        taskDescription: data.description,
      });
      await fetchHistory(); 
      
      setIsDescriptionModalOpen(false);
      setTaskForDescription(null);
      setCurrentTimerTaskName(null); 
      setLiveDescription('');
      handleAppPhaseChange(PomodoroPhase.BREAK); 

    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Erreur: Impossible d'enregistrer la session. Veuillez vérifier votre connexion et réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (session: PomodoroSession) => {
    setSessionToEdit(session);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSession = async (data: { taskName: string; description: string }) => {
    if (sessionToEdit) {
      try {
        await supabaseService.updatePomodoroSession(sessionToEdit.id, {
          taskName: data.taskName,
          taskDescription: data.description,
        });
        fetchHistory();
        setIsEditModalOpen(false);
        setSessionToEdit(null);
      } catch (error) {
        console.error("Failed to update session:", error);
        alert("Erreur lors de la mise à jour de la session.");
      }
    }
  };
  
  const handleDeleteSession = async (sessionId: string) => {
      try {
        await supabaseService.deletePomodoroSession(sessionId);
        fetchHistory(); // Refresh list
      } catch (error) {
        console.error("Failed to delete session:", error);
        alert("Erreur lors de la suppression de la session.");
      }
  };
  
  const handleDeleteRemark = async (remarkId: string) => {
    try {
      await supabaseService.deleteRemark(remarkId);
      fetchHistory(); // Refresh list
    } catch (error) {
      console.error("Failed to delete remark:", error);
      alert("Erreur lors de la suppression de la remarque.");
    }
  };

  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    if (view === AppView.CHAT) {
      setMenuVisible(false);
    } else {
      setMenuVisible(true);
    }
  };

  const handleLogout = async () => {
    await supabaseService.logout();
  };

  const renderView = () => {
    // The main view is now the "Focus Stream" which is a combination of Timer and History.
    // The other views are secondary.
    switch (activeView) {
      case AppView.CHAT:
        return <Chat 
          currentUser={user} 
          sessions={sessions} 
          isMenuVisible={false}
          onShowMenu={() => {}}
        />;
      
      // Default view is the Focus Stream
      default:
        return (
          <>
            <Timer
                currentUser={user}
                appPhase={currentPhase}
                timeToDisplayInSeconds={timeRemainingInSeconds}
                pomodorosCompleted={pomodorosInCycle}
                currentWorkTaskName={currentTimerTaskName}
                liveDescription={liveDescription} // This might be deprecated with the new design
                onLiveDescriptionChange={setLiveDescription} // This might be deprecated
                onStartWorkSession={handleStartWorkSession}
                onPauseSession={handlePauseSession}
                onResumeSession={handleResumeSession}
                onStopSession={handleStopSession}
                onStartBreakSession={handleStartBreakSession}
            />
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Journal de bord</h3>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                rows={3}
                placeholder="Notez une idée, une distraction, une réflexion..."
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
              />
              <button
                onClick={handleSaveNewRemark}
                disabled={!newRemark.trim() || isSavingRemark}
                className="mt-3 px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingRemark ? 'Enregistrement...' : 'Enregistrer la remarque'}
              </button>
            </div>

            <div className="mt-8">
              <History 
                currentUser={user} 
                sessions={sessions} 
                refreshSessions={fetchHistory} 
                onEditSession={handleOpenEditModal}
                onDeleteSession={handleDeleteSession}
                onDeleteRemark={handleDeleteRemark}
                onUpdateRemark={handleUpdateRemark}
              />
            </div>
          </>
        );
    }
  };

  const NavLink: React.FC<{
    view: AppView;
    label: string;
    icon: React.ReactNode;
  }> = ({ view, label, icon }) => (
    <button
      onClick={() => handleNavigate(view)}
      className={`w-full flex items-center p-3 rounded-lg transition-colors text-lg ${
        activeView === view ? 'bg-teal-500/20 text-teal-300' : 'hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <div className="h-screen bg-gray-900 text-white font-sans flex flex-col">
      {/* Overlay */}
      {isMenuVisible && (
        <div 
          className="fixed inset-0 bg-black/60 z-30" 
          onClick={() => setMenuVisible(false)}
        ></div>
      )}

      {/* Sidebar Navigation */}
      <nav 
        className={`fixed top-0 left-0 h-full w-64 bg-gray-800 p-6 space-y-6 shadow-lg flex flex-col transition-transform duration-300 ease-in-out z-40
          ${isMenuVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div>
          <h2 className="text-2xl font-bold text-teal-400 mb-10">Menu</h2>
          <div className="space-y-2">
            <NavLink view={AppView.TIMER} label="Focus Stream" icon={<TimerIcon className="w-6 h-6" />} />
            <NavLink view={AppView.CHAT} label="Chat IA" icon={<ChatIcon className="w-6 h-6" />} />
          </div>
        </div>
        <div className="mt-auto pt-6">
           {!geminiService.isConfigured() && (
             <div className="p-3 mb-4 bg-yellow-900 border border-yellow-700 rounded-md text-yellow-200 flex items-center text-xs">
                <InfoIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{`Clé API non configurée. IA désactivée.`}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left text-gray-300 hover:bg-red-700 hover:text-white transition-colors duration-200"
            title="Logout"
          >
            <LogoutIcon className="w-6 h-6" />
            <span className="font-medium">Déconnexion</span>
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center md:text-left truncate" title={user.email}>Utilisateur: {user.email}</p>
        </div>
      </nav>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* App Header */}
        <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 z-10">
          <div className="flex items-center p-4">
            <button 
              onClick={() => setMenuVisible(true)} 
              className="p-2 mr-2 text-gray-300 hover:text-white"
              aria-label="Ouvrir le menu"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-teal-400 font-orbitron">{APP_NAME}</h1>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {activeView === AppView.TIMER && renderView()}
          {activeView === AppView.CHAT && <Chat 
            currentUser={user} 
            sessions={sessions} 
            isMenuVisible={false} // Chat now manages its own menu button on mobile
            onShowMenu={() => {}}    // This is now handled by the main hamburger
          />}
        </div>
      </main>

      {/* New Session Description Modal */}
      <Modal
        isOpen={isDescriptionModalOpen}
        onClose={() => {
            setIsDescriptionModalOpen(false);
            setTaskForDescription(null);
            setCurrentTimerTaskName(null);
            handleAppPhaseChange(PomodoroPhase.BREAK); 
        }}
        title="Décrivez votre session"
        size="xl"
      >
        {taskForDescription && (
          <DictationInput
            initialTaskName={taskForDescription.name}
            initialDescription={liveDescription} // This will now be empty, but kept for structure
            onSave={handleSaveDescription}
            taskNameLabel="Travail accompli pour la tâche :"
            isEditing={false}
            isSaving={isSaving}
          />
        )}
      </Modal>

      {/* Edit Existing Session Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setSessionToEdit(null);
        }}
        title="Modifier la session"
        size="xl"
      >
        {sessionToEdit && (
          <DictationInput
            initialTaskName={sessionToEdit.taskName}
            initialDescription={sessionToEdit.taskDescription}
            onSave={handleSaveEditedSession}
            isEditing={true}
            isSaving={isSaving}
          />
        )}
      </Modal>
    </div>
  );
};

export default PomodoroApp; 