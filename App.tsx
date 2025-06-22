import React, { useState, useEffect, useCallback } from 'react';
import { User, PomodoroSession, PomodoroPhase, AppView } from './types';
import { supabaseService } from './services/supabaseService';
import { WORK_DURATION_MINUTES, SHORT_BREAK_DURATION_MINUTES, LONG_BREAK_DURATION_MINUTES, APP_NAME, DOCUMENT_TITLE } from './constants';
import Timer from './components/Timer';
import History from './components/History';
import Chat from './components/Chat';
import Auth from './components/Auth';
import Modal from './components/Modal';
import DictationInput from './components/DictationInput';
import { TimerIcon, HistoryIcon, ChatIcon, LogoutIcon, InfoIcon } from './components/icons';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const [pomodorosInCycle, setPomodorosInCycle] = useState(0); 
  const [timeRemainingInSeconds, setTimeRemainingInSeconds] = useState(WORK_DURATION_MINUTES * 60);
  const [activeTimerPhaseBeforePause, setActiveTimerPhaseBeforePause] = useState<PomodoroPhase>(PomodoroPhase.RUNNING);
  const [currentTimerTaskName, setCurrentTimerTaskName] = useState<string | null>(null); // Name of the task actively being timed


  useEffect(() => {
    document.title = DOCUMENT_TITLE;
    
    // Subscribe to auth state changes
    const { unsubscribe } = supabaseService.onAuthStateChange((session) => {
      const user = session?.user ?? null;
      setCurrentUser(user as User | null); // Casting might be needed depending on type definitions
      if (user) {
        // Reset app state on login
        setCurrentPhase(PomodoroPhase.IDLE);
        setSessions([]);
        setPomodorosInCycle(0);
        setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
        setActiveView(AppView.TIMER);
        setCurrentTimerTaskName(null);
      }
    });

    // Unsubscribe on component unmount
    return () => unsubscribe();
  }, []);

  const fetchSessions = useCallback(async () => {
    if (currentUser) {
      // The service now gets the user automatically
      const fetchedSessions = await supabaseService.getPomodoroSessions();
      setSessions(fetchedSessions);
    }
  }, [currentUser]);

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
        if (currentPhase === PomodoroPhase.RUNNING && currentTimerTaskName) { // Ensure taskName is available
            setTaskForDescription({ name: currentTimerTaskName, duration: WORK_DURATION_MINUTES }); // Assuming fixed duration for now
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


  const handleLogout = async () => {
    await supabaseService.logout();
    setCurrentUser(null);
    setSessions([]);
    setCurrentPhase(PomodoroPhase.IDLE);
    setActiveView(AppView.TIMER);
    setPomodorosInCycle(0);
    setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
    setIsDescriptionModalOpen(false);
    setTaskForDescription(null);
    setCurrentTimerTaskName(null);
    setIsEditModalOpen(false);
    setSessionToEdit(null);
  };
  
  const handleAppPhaseChange = (newPhase: PomodoroPhase) => {
    if (newPhase === PomodoroPhase.PAUSED && (currentPhase === PomodoroPhase.RUNNING || currentPhase === PomodoroPhase.BREAK)) {
        setActiveTimerPhaseBeforePause(currentPhase); 
    }

    setCurrentPhase(newPhase);

    switch (newPhase) {
        case PomodoroPhase.IDLE:
            setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
            // currentTimerTaskName is cleared by stop or when session completes.
            break;
        case PomodoroPhase.RUNNING:
            // If starting from IDLE, time is already set. If resuming, time is preserved.
            // currentTimerTaskName should be set by onStartWorkSession before this.
            if (currentPhase === PomodoroPhase.IDLE || currentPhase === PomodoroPhase.BREAK) {
                 setTimeRemainingInSeconds(WORK_DURATION_MINUTES * 60);
            }
            break;
        case PomodoroPhase.BREAK:
            const breakDuration = (pomodorosInCycle > 0 && pomodorosInCycle % 4 === 0) 
                ? LONG_BREAK_DURATION_MINUTES * 60 
                : SHORT_BREAK_DURATION_MINUTES * 60;
            setTimeRemainingInSeconds(breakDuration);
            setCurrentTimerTaskName(null); // No task name during break
            break;
        case PomodoroPhase.PAUSED:
            // Time stops by clearing interval, no change to timeRemainingInSeconds here
            break;
        case PomodoroPhase.DESCRIBING:
            // Timer stops, modal opens.
            break;
    }
};

  // Timer component event handlers
  const handleStartWorkSession = (taskName: string) => {
    setCurrentTimerTaskName(taskName);
    handleAppPhaseChange(PomodoroPhase.RUNNING);
  };
  const handlePauseSession = () => handleAppPhaseChange(PomodoroPhase.PAUSED);
  const handleResumeSession = () => handleAppPhaseChange(activeTimerPhaseBeforePause); // Resume to whatever phase was active
  const handleStopSession = () => { // Effectively resets the current work/break session
    handleAppPhaseChange(PomodoroPhase.IDLE);
    setCurrentTimerTaskName(null);
  };
  const handleStartBreakSession = () => handleAppPhaseChange(PomodoroPhase.BREAK);


  // For new session description
  const handleSaveDescription = async (data: { taskName: string; description: string }) => {
    if (!currentUser || !taskForDescription || isSaving) return;

    setIsSaving(true);
    try {
      // Ensure the duration is an integer before saving.
      // This handles cases where a float might be used for testing (e.g., 0.5 minutes).
      const durationInMinutes = Math.round(taskForDescription.duration);

      await supabaseService.savePomodoroSession({
        taskName: taskForDescription.name,
        durationMinutes: durationInMinutes,
        taskDescription: data.description,
      });
      await fetchSessions(); 
      
      // Close modal and reset state AFTER successful save
      setIsDescriptionModalOpen(false);
      setTaskForDescription(null);
      setCurrentTimerTaskName(null); 
      handleAppPhaseChange(PomodoroPhase.BREAK); 

    } catch (error) {
      console.error("Failed to save session:", error);
      // It's good practice to show an error to the user in the UI
      alert("Erreur: Impossible d'enregistrer la session. Veuillez vérifier votre connexion et réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  // For editing existing session
  const handleOpenEditModal = (session: PomodoroSession) => {
    setSessionToEdit(session);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSession = async (data: { taskName: string; description: string }) => {
    if (currentUser && sessionToEdit) {
      try {
        await supabaseService.updatePomodoroSession(sessionToEdit.id, {
          taskName: data.taskName,
          taskDescription: data.description,
          // durationMinutes: sessionToEdit.durationMinutes, // Assuming duration is not editable here
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
    if (currentUser) {
      try {
        await supabaseService.deletePomodoroSession(sessionId);
        fetchSessions(); // Refresh list
      } catch (error) {
        console.error("Failed to delete session:", error);
        alert("Erreur lors de la suppression de la session.");
      }
    }
  };


  if (!currentUser) {
    return <Auth />;
  }
  
  const renderView = () => {
    switch (activeView) {
      case AppView.TIMER:
        return (
            <Timer
                currentUser={currentUser}
                appPhase={currentPhase}
                timeToDisplayInSeconds={timeRemainingInSeconds}
                pomodorosCompleted={pomodorosInCycle}
                currentWorkTaskName={currentTimerTaskName}
                onStartWorkSession={handleStartWorkSession}
                onPauseSession={handlePauseSession}
                onResumeSession={handleResumeSession}
                onStopSession={handleStopSession}
                onStartBreakSession={handleStartBreakSession}
            />
        );
      case AppView.HISTORY:
        return <History 
                    currentUser={currentUser} 
                    sessions={sessions} 
                    refreshSessions={fetchSessions} 
                    onEditSession={handleOpenEditModal}
                    onDeleteSession={handleDeleteSession}
                />;
      case AppView.CHAT:
        return <Chat currentUser={currentUser} sessions={sessions} />;
      default:
        return  <Timer
                    currentUser={currentUser}
                    appPhase={currentPhase}
                    timeToDisplayInSeconds={timeRemainingInSeconds}
                    pomodorosCompleted={pomodorosInCycle}
                    currentWorkTaskName={currentTimerTaskName}
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
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left text-gray-300 hover:bg-red-700 hover:text-white transition-colors duration-200"
            title="Logout"
          >
            <LogoutIcon className="w-6 h-6" />
            <span className="font-medium">Déconnexion</span>
          </button>
          <p className="text-xs text-gray-500 mt-4 text-center md:text-left truncate" title={currentUser.email}>Utilisateur: {currentUser.email}</p>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        {renderView()}
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
            initialTaskName={taskForDescription.name} // Display the task name, but it's not editable here
            onSave={handleSaveDescription}
            taskNameLabel="Travail accompli pour la tâche :"
            isEditing={false} // This modal is for new descriptions, task name is fixed
            isSaving={isSaving} // Pass saving state to the component
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
            isEditing={true} // Enable task name editing
            isSaving={isSaving}
          />
        )}
      </Modal>
    </div>
  );
};

export default App;
