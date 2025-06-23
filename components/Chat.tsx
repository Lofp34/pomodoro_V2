import React, { useState, useEffect, useRef } from 'react';
import { PomodoroSession, User, ChatMessage, GroundingChunk, WebSource } from '../types';
import { geminiService } from '../services/geminiService';
import { SendIcon, AlertTriangleIcon, InfoIcon, ExternalLinkIcon } from './icons';
import { API_KEY_ERROR_MESSAGE } from '../constants';

interface ChatProps {
  currentUser: User | null;
  sessions: PomodoroSession[];
}

const SourceLink: React.FC<{ source: WebSource }> = ({ source }) => (
  <a
    href={source.uri}
    target="_blank"
    rel="noopener noreferrer"
    title={source.title}
    className="inline-flex items-center text-xs bg-gray-600 hover:bg-gray-500 text-teal-300 px-2 py-1 rounded transition-colors mr-2 mb-1"
  >
    {new URL(source.uri).hostname} <ExternalLinkIcon className="w-3 h-3 ml-1" />
  </a>
);

const Chat: React.FC<ChatProps> = ({ currentUser, sessions }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    // Reset chat if user changes or sessions update significantly (optional)
    setMessages([]);
    setError(null);
    if (currentUser && !geminiService.isConfigured()) {
        setError(API_KEY_ERROR_MESSAGE);
    } else {
        setError(null);
    }
  }, [currentUser, sessions]);


  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentUser || !geminiService.isConfigured()) {
      if (!geminiService.isConfigured()) setError(API_KEY_ERROR_MESSAGE);
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // The geminiService.startOrContinueChat handles context and history internally now
      const aiResponse = await geminiService.startOrContinueChat(userMessage, sessions, messages);
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: aiResponse.text,
        timestamp: new Date().toISOString(),
        sources: aiResponse.sources
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = (err as Error).message || "Une erreur s'est produite lors de la communication avec l'IA.";
      setError(errorMessage);
      // Optionally add an error message to chat
      const errorAiMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'ai',
        text: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <p className="text-center text-gray-400 py-10">Veuillez vous connecter pour utiliser le chat IA.</p>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-xl">
      <header className="px-4 sm:px-6 py-4 border-b border-gray-700 flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Chat IA</h1>
          <p className="text-sm text-gray-400">Analyse de vos tâches.</p>
        </div>
      </header>
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700/60 rounded-lg text-red-200 flex items-center space-x-3">
            <AlertTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        {!geminiService.isConfigured() && (
          <div className="p-4 bg-yellow-900/50 border border-yellow-700/60 rounded-lg text-yellow-200 flex items-center space-x-3">
            <InfoIcon className="w-5 h-5 mr-2 flex-shrink-0" />
            {API_KEY_ERROR_MESSAGE} AI features are disabled.
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl shadow ${
                msg.sender === 'user' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-700 text-gray-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">Sources:</p>
                  {msg.sources.map((chunk, idx) => chunk.web && <SourceLink key={idx} source={chunk.web} />)}
                </div>
              )}
              <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-teal-200 text-right' : 'text-gray-400 text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={geminiService.isConfigured() ? "Posez votre question..." : "Configuration IA manquante"}
            className="flex-grow px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-100 disabled:bg-gray-600"
            disabled={isLoading || !geminiService.isConfigured()}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !geminiService.isConfigured()}
            className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <SendIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
