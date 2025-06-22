
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Chat, GroundingChunk } from "@google/genai";
import { AI_MODEL_NAME, API_KEY_ERROR_MESSAGE } from '../constants';
import { PomodoroSession, ChatMessage } from "../types";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.error(API_KEY_ERROR_MESSAGE);
}

// Store chat instance for multi-turn conversations
let chatInstance: Chat | null = null;

function formatTasksForContext(tasks: PomodoroSession[]): string {
  if (tasks.length === 0) {
    return "No tasks recorded yet.";
  }
  return tasks.map(task => 
    `Task: ${task.taskName}\nDate: ${new Date(task.createdAt).toLocaleDateString()}\nDuration: ${task.durationMinutes} minutes\nDescription: ${task.taskDescription}\n---`
  ).join('\n\n');
}

export const geminiService = {
  isConfigured: () => !!ai,

  async getAiAnalysis(
    tasksContext: string, 
    userQuery: string,
    useSearch: boolean = false
  ): Promise<{ text: string; sources?: GroundingChunk[] }> {
    if (!ai) {
      throw new Error(API_KEY_ERROR_MESSAGE);
    }

    const fullPrompt = `Based on the following task history:\n\n${tasksContext}\n\nUser Query: ${userQuery}\n\nProvide a concise and helpful response. If the query is about recent events or requires up-to-date information, use your knowledge and available tools.`;
    
    const request: GenerateContentParameters = {
      model: AI_MODEL_NAME,
      contents: fullPrompt,
      config: {} 
    };

    if (useSearch) {
      // IMPORTANT: As per Gemini docs, when using googleSearch, do not specify responseMimeType: "application/json".
      // Only include 'tools' for search.
      request.config = { tools: [{googleSearch: {}}] };
    } else {
      // For general queries not requiring search, we can request JSON if we have a defined schema.
      // For this general purpose chat, we'll stick to text response for simplicity.
      // request.config.responseMimeType = "application/json"; // Example if JSON output was strictly needed and parsed
    }

    try {
      const response: GenerateContentResponse = await ai.models.generateContent(request);
      const responseText = response.text;
      
      let sources: GroundingChunk[] | undefined = undefined;
      if (useSearch && response.candidates && response.candidates[0]?.groundingMetadata?.groundingChunks) {
         sources = response.candidates[0].groundingMetadata.groundingChunks;
      }

      return { text: responseText, sources };
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
  ): Promise<{ text: string; sources?: GroundingChunk[] }> {
    if (!ai) {
      throw new Error(API_KEY_ERROR_MESSAGE);
    }
    
    const taskContext = formatTasksForContext(taskHistory);
    const systemInstruction = `You are Pomodoro Intelligence, an AI assistant helping users analyze their Pomodoro task history. Be concise and helpful. Task history is provided below. Always answer in the same language as the user's last message. \n\nTASK HISTORY CONTEXT:\n${taskContext}`;

    if (!chatInstance) {
      chatInstance = ai.chats.create({
        model: AI_MODEL_NAME,
        config: {
          systemInstruction: systemInstruction,
          // tools: [{googleSearch: {}}] // Enable if all chat interactions might need search
        },
        // Reconstruct history for the chat model
        history: pastMessages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      });
    }
    
    // For specific queries requiring search, it's better to use generateContent with tools.
    // For general chat, sendMessage is fine. If a message seems to need search, we could detect it and switch.
    // Let's assume for now, we pass a flag if a message needs search.
    const requiresSearch = userMessage.text.toLowerCase().includes("latest") || userMessage.text.toLowerCase().includes("recent") || userMessage.text.toLowerCase().includes("news");

    if (requiresSearch) {
        // Use one-off generateContent for search-enabled queries within a chat context
        // This is a simplified way; true RAG might be more complex
        const chatHistoryForSearchPrompt = pastMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
        const searchPrompt = `${systemInstruction}\n\nCHAT HISTORY:\n${chatHistoryForSearchPrompt}\n\nCURRENT USER QUERY (NEEDS SEARCH):\n${userMessage.text}`;
        
        const request: GenerateContentParameters = {
          model: AI_MODEL_NAME,
          contents: searchPrompt,
          config: { tools: [{googleSearch: {}}] }
        };
        const response: GenerateContentResponse = await ai.models.generateContent(request);
        const responseText = response.text;
        let sources: GroundingChunk[] | undefined = undefined;
        if (response.candidates && response.candidates[0]?.groundingMetadata?.groundingChunks) {
           sources = response.candidates[0].groundingMetadata.groundingChunks;
        }
        return { text: responseText, sources };
    }


    try {
      // Send message to the existing chat session
      const response: GenerateContentResponse = await chatInstance.sendMessage({ message: userMessage.text });
      const responseText = response.text;
      // Note: chat.sendMessage does not directly expose grounding chunks like generateContent.
      // If search is critical for *all* chat turns, `generateContent` with full history might be better.
      return { text: responseText };
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
// This mock service calls Gemini directly from the client for simplicity in this development environment.
