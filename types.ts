export interface User {
  id: string;
  email: string; // Or any other user identifying information
}

// task_description is a string, which could contain JSON-formatted text if the user inputs it that way.
// The database type jsonb allows for flexible querying if it is indeed JSON.
export interface PomodoroSession {
  id: string;
  created_at: string;
  taskName: string;
  taskDescription: string;
  durationMinutes: number;
  user_id: string;
}

export interface Remark {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
}

export type HistoryItem = PomodoroSession | Remark;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO string date
  sources?: GroundingChunk[];
}

export enum PomodoroPhase {
  IDLE = 'IDLE', // Ready to start a new session
  RUNNING = 'RUNNING', // Timer is active
  PAUSED = 'PAUSED', // Timer is paused
  DESCRIBING = 'DESCRIBING', // Session ended, user is describing the task
  BREAK = 'BREAK', // Break timer running
}

export enum AppView {
  TIMER = 'TIMER',
  HISTORY = 'HISTORY',
  CHAT = 'CHAT',
}

// For Gemini Search Grounding
export interface WebSource {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: WebSource;
  // Other types of chunks could be defined here if needed
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // Potentially other search-related metadata
}

export interface Candidate {
  groundingMetadata?: GroundingMetadata;
  // Other candidate properties
}

export interface GenerateContentResponsePart {
  text?: string;
  // other parts if any
}
export interface GenerateContentResponseCandidate {
  content?: {
    parts: GenerateContentResponsePart[];
    role: string;
  };
  finishReason?: string;
  index?: number;
  // safetyRatings, citationMetadata etc.
  groundingMetadata?: GroundingMetadata; 
}
export interface GeminiResponse {
  candidates?: GenerateContentResponseCandidate[];
  // promptFeedback etc.
  text: string; // This is the helper, always prefer this.
}

