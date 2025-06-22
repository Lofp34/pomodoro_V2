import { GoogleGenerativeAI } from "@google/generative-ai";
import { AI_MODEL_NAME, API_KEY_ERROR_MESSAGE } from '../constants';
import { PomodoroSession, ChatMessage } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY && typeof API_KEY === 'string') {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.error(API_KEY_ERROR_MESSAGE);
}

// Store chat instance for multi-turn conversations
let chatInstance: any | null = null; // Use `any` for now to avoid deep type issues with the library

function formatTasksForContext(tasks: PomodoroSession[]): string {
  if (tasks.length === 0) {
    return "No tasks recorded yet.";
  }
  return tasks.map(task => 
    `Task: ${task.taskName}\nDate: ${new Date(task.createdAt).toLocaleDateString()}\nDuration: ${task.durationMinutes} minutes\nDescription: ${task.taskDescription}\n---`
  ).join('\n\n');
}

export const geminiService = {
  isConfigured: () => !!genAI,

  async getAiAnalysis(
    tasksContext: string, 
    userQuery: string,
    useSearch: boolean = false
  ): Promise<{ text: string; sources?: any[] }> {
    if (!genAI) {
      throw new Error(API_KEY_ERROR_MESSAGE);
    }

    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
    const fullPrompt = `Based on the following task history:\n\n${tasksContext}\n\nUser Query: ${userQuery}\n\nProvide a concise and helpful response.`;

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();
      
      return { text };
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
      }
      throw new Error("Failed to get response from AI. Please try again later.");
    }
  },

  async startOrContinueChat(
    userMessage: ChatMessage,
    taskHistory: PomodoroSession[],
    pastMessages: ChatMessage[]
  ): Promise<{ text: string; sources?: any[] }> {
    if (!genAI) {
      throw new Error(API_KEY_ERROR_MESSAGE);
    }
    
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });
    const taskContext = formatTasksForContext(taskHistory);
    const systemInstruction = `You are Pomodoro Intelligence, an AI assistant helping users analyze their Pomodoro task history. Be concise and helpful. Task history is provided below. Always answer in the same language as the user's last message. \n\nTASK HISTORY CONTEXT:\n${taskContext}`;

    if (!chatInstance) {
      const history = pastMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
      chatInstance = model.startChat({
        history,
        systemInstruction: { parts: [{ text: systemInstruction }] },
      });
    }

    try {
      const result = await chatInstance.sendMessage(userMessage.text);
      const response = result.response;
      const text = response.text();
      return { text };
    } catch (error) {
      console.error("Error in chat session with Gemini API:", error);
      if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
      }
      // Attempt to reset chat on specific errors, e.g., context window exceeded
      if (error instanceof Error && (error.message.includes("context length") || error.message.includes("400"))) {
        console.warn("Chat context might be too long or corrupted, resetting chat instance.");
        chatInstance = null; // Reset chat instance
        // Optionally, inform the user they might need to restart the conversation topic
        throw new Error("Chat session error. The conversation context might have grown too large. Please try rephrasing or starting a new topic.");
      }
      throw new Error("Failed to get response from AI chat. Please try again later.");
    }
  }
};

// IMPORTANT: For production applications, to protect your Google Gemini API key,
// these API calls should be made from a backend server (e.g., a Supabase Edge Function or Vercel Serverless Function)
// The client would call your backend, which then calls the Gemini API.
// This service calls Gemini directly from the client for simplicity in this development environment.
