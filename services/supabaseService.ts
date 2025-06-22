import { createClient, Session, User } from '@supabase/supabase-js';
import { PomodoroSession } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
  async login(email: string, password?: string): Promise<User> {
    if (!password) {
      // Handle OAuth login if password is not provided
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', // or 'apple', 'microsoft'
      });
      if (error) throw error;
      // The user will be redirected, so we might not get a user object back immediately.
      // The session will be handled by the onAuthStateChange listener.
      // Returning a dummy user or handling this state in the UI is an option.
      // For now, let's throw an error to indicate redirection is happening.
      throw new Error('Redirecting for OAuth...');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Login failed: no user returned');
    return data.user;
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser(): User | null {
    // This is synchronous and might not be what you want.
    // supabase.auth.user() is deprecated.
    // You should use onAuthStateChange to manage the user session reactively.
    // This function is kept for compatibility with existing structure but should be replaced.
    // A better approach is to get the session and then the user.
    const session = supabase.auth.getSession();
    // This is async, so the function signature would need to change.
    // Let's return null and manage user via onAuthStateChange in the UI.
    return null; 
  },

  onAuthStateChange(callback: (session: Session | null) => void): { unsubscribe: () => void } {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return { unsubscribe: () => authListener?.subscription.unsubscribe() };
  },

  async savePomodoroSession(sessionData: Omit<PomodoroSession, 'id' | 'userId' | 'createdAt'>): Promise<PomodoroSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const newSessionPayload = {
      ...sessionData,
      user_id: user.id, // Ensure your table uses 'user_id'
    };
    
    // Assuming table name is 'pomodoro_sessions'
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .insert(newSessionPayload)
      .select()
      .single();

    if (error) throw error;
    
    // Map back to camelCase if needed
    return {
      id: data.id,
      userId: data.user_id,
      createdAt: data.created_at,
      durationMinutes: data.duration_minutes,
      taskName: data.task_name,
      taskDescription: data.task_description,
    };
  },

  async getPomodoroSessions(): Promise<PomodoroSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(session => ({
      id: session.id,
      userId: session.user_id,
      createdAt: session.created_at,
      durationMinutes: session.duration_minutes,
      taskName: session.task_name,
      taskDescription: session.task_description,
    }));
  },

  async updatePomodoroSession(sessionId: string, updatedData: Partial<Omit<PomodoroSession, 'id' | 'userId' | 'createdAt'>>): Promise<PomodoroSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const updatePayload: { [key: string]: any } = {};
    if (updatedData.durationMinutes !== undefined) updatePayload.duration_minutes = updatedData.durationMinutes;
    if (updatedData.taskName !== undefined) updatePayload.task_name = updatedData.taskName;
    if (updatedData.taskDescription !== undefined) updatePayload.task_description = updatedData.taskDescription;


    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      userId: data.user_id,
      createdAt: data.created_at,
      durationMinutes: data.duration_minutes,
      taskName: data.task_name,
      taskDescription: data.task_description,
    };
  },

  async deletePomodoroSession(sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (error) throw error;
  },
};
