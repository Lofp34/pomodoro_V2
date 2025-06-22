import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { MicIcon, StopIcon, AlertTriangleIcon } from './icons';

interface DictationInputProps {
  initialTaskName?: string; // For editing existing task name
  initialDescription?: string; // For editing existing description
  onSave: (data: { taskName: string; description: string }) => void;
  taskNameLabel?: string; // e.g. "Describe your work for task:" or "Edit task:"
  isEditing?: boolean; // To show task name input field
  isSaving?: boolean; // To indicate if a save operation is in progress
}

const DictationInput: React.FC<DictationInputProps> = ({
  initialTaskName = '',
  initialDescription = '',
  onSave,
  taskNameLabel,
  isEditing = false,
  isSaving = false,
}) => {
  const [currentTaskName, setCurrentTaskName] = useState(initialTaskName);
  const [descriptionText, setDescriptionText] = useState(initialDescription);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition();

  useEffect(() => {
    // If initial values change (e.g. modal reopens for different item), reset state
    setCurrentTaskName(initialTaskName);
    setDescriptionText(initialDescription);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskName, initialDescription]);


  useEffect(() => {
    // Only process transcript if actively listening and transcript has content
    if (listening && transcript) {
      setDescriptionText(prevText => prevText ? prevText + " " + transcript : transcript);
      resetTranscript(); 
    }
  }, [transcript, resetTranscript, listening]); // Added listening to dependency array

  const handleToggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript(); 
      SpeechRecognition.startListening({ continuous: true, language: 'fr-FR' });
    }
  };

  const handleSave = () => {
    onSave({ taskName: currentTaskName, description: descriptionText });
    // Resetting fields after save might be handled by parent closing/re-initializing modal
    resetTranscript();
    if (listening) {
      SpeechRecognition.stopListening();
    }
  };
  
  if (!browserSupportsSpeechRecognition && isEditing) { 
     // Allow manual editing even if speech rec is not supported
  } else if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-4 bg-yellow-900 border border-yellow-700 rounded-md text-yellow-100 flex items-center">
        <AlertTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
        <p>Your browser does not support speech recognition. Please type your description manually.</p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {taskNameLabel && (
        <p className="text-sm text-gray-400">
          {taskNameLabel} <strong className="text-teal-400">{isEditing ? initialTaskName : currentTaskName}</strong>
        </p>
      )}

      {isEditing && (
        <div>
          <label htmlFor="taskNameEdit" className="block text-sm font-medium text-gray-300 mb-1">
            Nom de la tâche
          </label>
          <input
            id="taskNameEdit"
            type="text"
            value={currentTaskName}
            onChange={(e) => setCurrentTaskName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-gray-100"
            placeholder="Nom de la tâche"
          />
        </div>
      )}

      {!isMicrophoneAvailable && browserSupportsSpeechRecognition && (
         <div className="p-3 bg-red-900 border border-red-700 rounded-md text-red-100 flex items-center text-sm">
            <AlertTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
            Microphone is not available. Please ensure it's connected and permissions are granted. Dictation disabled.
        </div>
      )}
      <div>
        <label htmlFor="taskDescriptionEdit" className="block text-sm font-medium text-gray-300 mb-1">
            Description
        </label>
        <textarea
            id="taskDescriptionEdit"
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            rows={6}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-gray-100 resize-none"
            placeholder="Type or dictate the details of the task..."
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
        {browserSupportsSpeechRecognition && (
            <button
            onClick={handleToggleListening}
            disabled={!isMicrophoneAvailable}
            className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors ${
                listening 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            } disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto`}
            >
            {listening ? <StopIcon className="w-5 h-5 mr-2" /> : <MicIcon className="w-5 h-5 mr-2" />}
            {listening ? 'Arrêter la dictée' : 'Dicter'}
            </button>
        )}
        <button
          onClick={handleSave}
          className="w-full sm:w-auto flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50 transition-colors"
          disabled={(!currentTaskName.trim() && isEditing) || isSaving} // Disable if saving
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
      {listening && (
        <p className="text-sm text-center text-blue-400 animate-pulse">Écoute en cours...</p>
      )}
    </div>
  );
};

export default DictationInput;
