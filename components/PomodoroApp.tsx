import React, { useState, useEffect, useCallback } from 'react';
import { User, PomodoroSession, PomodoroPhase, AppView } from '../types';
import { supabaseService } from '../services/supabaseService';
import { WORK_DURATION_MINUTES, SHORT_BREAK_DURATION_MINUTES, LONG_BREAK_DURATION_MINUTES, APP_NAME, DOCUMENT_TITLE } from '../constants';
import Timer from './Timer';
import History from './History';
import Chat from './Chat';
import Modal from './Modal';
import DictationInput from './DictationInput';
import { TimerIcon, HistoryIcon, ChatIcon, LogoutIcon, InfoIcon } from './icons';
import { geminiService } from '../services/geminiService';

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

  const [pomodorosInCycle, setPomodorosInCycle] = useState(0); 
  const [timeRemainingInSeconds, setTimeRemainingInSeconds] = useState(WORK_DURATION_MINUTES * 60);
  const [activeTimerPhaseBeforePause, setActiveTimerPhaseBeforePause] = useState<PomodoroPhase>(PomodoroPhase.RUNNING);
  const [currentTimerTaskName, setCurrentTimerTaskName] = useState<string | null>(null);

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

  const fetchSessions = useCallback(async () => {
      const fetchedSessions = await supabaseService.getPomodoroSessions();
      setSessions(fetchedSessions);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Core Timer Logic
  useEffect(() => {
    let intervalId: number | undefined;

    if ((currentPhase === PomodoroPhase.RUNNING || currentPhase === PomodoroPhase.BREAK) && timeRemainingInSeconds > 0) {
        intervalId = window.setInterval(() => {
            setTimeRemainingInSeconds(prev => prev - 1);
        }, 1000);
    } else if (timeRemainingInSeconds === 0) {
        if (currentPhase === PomodoroPhase.RUNNING && currentTimerTaskName) {
            setTaskForDescription({ name: currentTimerTaskName, duration: WORK_DURATION_MINUTES });
            setPomodorosInCycle(prev => prev + 1);
            setIsDescriptionModalOpen(true); 
            setCurrentPhase(PomodoroPhase.DESCRIBING);
        } else if (currentPhase === PomodoroPhase.BREAK) {
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

  const handleStartWorkSession = (taskName: string) => {
    setCurrentTimerTaskName(taskName);
    handleAppPhaseChange(PomodoroPhase.RUNNING);
  };
  const handlePauseSession = () => handleAppPhaseChange(PomodoroPhase.PAUSED);
  const handleResumeSession = () => handleAppPhaseChange(activeTimerPhaseBeforePause);
  const handleStopSession = () => {
    console.log('[DEBUG] handleStopSession called. Resetting timer state.');
    handleAppPhaseChange(PomodoroPhase.IDLE);
    setCurrentTimerTaskName(null);
    setLiveDescription('');
    localStorage.removeItem(`pomodoroTimerState_${user.id}`);
  };
  const handleStartBreakSession = () => {
    setLiveDescription('');
    handleAppPhaseChange(PomodoroPhase.BREAK);
  }

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
      await fetchSessions(); 
      
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
        fetchSessions();
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
        fetchSessions();
      } catch (error) {
        console.error("Failed to delete session:", error);
        alert("Erreur lors de la suppression de la session.");
      }
  };
  
  const renderView = () => {
    switch (activeView) {
      case AppView.TIMER:
        return (
            <Timer
                currentUser={user}
                appPhase={currentPhase}
                timeToDisplayInSeconds={timeRemainingInSeconds}
                pomodorosCompleted={pomodorosInCycle}
                currentWorkTaskName={currentTimerTaskName}
                liveDescription={liveDescription}
                onLiveDescriptionChange={setLiveDescription}
                onStartWorkSession={handleStartWorkSession}
                onPauseSession={handlePauseSession}
                onResumeSession={handleResumeSession}
                onStopSession={handleStopSession}
                onStartBreakSession={handleStartBreakSession}
            />
        );
      case AppView.HISTORY:
        return <History 
                    currentUser={user} 
                    sessions={sessions} 
                    refreshSessions={fetchSessions} 
                    onEditSession={handleOpenEditModal}
                    onDeleteSession={handleDeleteSession}
                />;
      case AppView.CHAT:
        return <Chat currentUser={user} sessions={sessions} />;
      default:
        return  <Timer
                    currentUser={user}
                    appPhase={currentPhase}
                    timeToDisplayInSeconds={timeRemainingInSeconds}
                    pomodorosCompleted={pomodorosInCycle}
                    currentWorkTaskName={currentTimerTaskName}
                    liveDescription={liveDescription}
                    onLiveDescriptionChange={setLiveDescription}
                    onStartWorkSession={handleStartWorkSession}
                    onPauseSession={handlePauseSession}
                    onResumeSession={handleResumeSession}
                    onStopSession={handleStopSession}
                    onStartBreakSession={handleStartBreakSession}
                />;
    }
  };

  const NavLink: React.FC<{
    view: AppView;
    label: string;
    icon: React.ReactNode;
  }> = ({ view, label, icon }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-200
                  ${activeView === view 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
      title={label}
      aria-current={activeView === view ? 'page' : undefined}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900 text-gray-100">
      <nav className="w-full md:w-64 bg-gray-800 p-4 md:p-6 space-y-4 md:space-y-6 flex-shrink-0 shadow-lg flex flex-col">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-teal-400 mb-6 md:mb-10 text-center md:text-left font-orbitron">{APP_NAME}</h1>
          <div className="space-y-2">
            <NavLink view={AppView.TIMER} label="Minuteur" icon={<TimerIcon className="w-6 h-6" />} />
            <NavLink view={AppView.HISTORY} label="Historique" icon={<HistoryIcon className="w-6 h-6" />} />
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
            onClick={onLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left text-gray-300 hover:bg-red-700 hover:text-white transition-colors duration-200"
            title="Logout"
          >
            <LogoutIcon className="w-6 h-6" />
            <span className="font-medium">Déconnexion</span>
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center md:text-left truncate" title={user.email}>Utilisateur: {user.email}</p>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        {renderView()}
      </main>

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
            initialDescription={liveDescription}
            onSave={handleSaveDescription}
            taskNameLabel="Travail accompli pour la tâche :"
            isEditing={false}
            isSaving={isSaving}
          />
        )}
      </Modal>

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