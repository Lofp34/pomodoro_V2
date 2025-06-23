import { createClient, Session, User } from '@supabase/supabase-js';
import { PomodoroSession, Remark } from '../types';

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

  async savePomodoroSession(session: {
    taskName: string;
    durationMinutes: number;
    taskDescription: string;
  }): Promise<void> {
    const { error } = await supabase.from('pomodoro_sessions').insert({
      task_name: session.taskName,
      duration_minutes: session.durationMinutes,
      task_description: session.taskDescription,
    });
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
  },

  async getPomodoroSessions(): Promise<PomodoroSession[]> {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('id, created_at, taskName:task_name, taskDescription:task_description, durationMinutes:duration_minutes, user_id')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getRemarks(): Promise<Remark[]> {
    const { data, error } = await supabase
      .from('remarks')
      .select('id, created_at, content, user_id')
      .order('created_at', { ascending: false });
    
    if (error) {
      // If the table doesn't exist, this will fail. We can ignore this for now.
      console.warn("Could not fetch remarks, table might not exist yet.", error.message);
      return [];
    }
    return data || [];
  },

  async saveRemark(content: string): Promise<void> {
    const { error } = await supabase.from('remarks').insert({ content });
    if (error) throw error;
  },

  async updatePomodoroSession(sessionId: string, updates: { taskName?: string; taskDescription?: string }) {
    const dbUpdates: { [key: string]: any } = {};
    if (updates.taskName) dbUpdates.task_name = updates.taskName;
    if (updates.taskDescription) dbUpdates.task_description = updates.taskDescription;

    const { error } = await supabase
      .from('pomodoro_sessions')
      .update(dbUpdates)
      .eq('id', sessionId);
    if (error) throw error;
  },

  async deletePomodoroSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', sessionId);
    if (error) throw error;
  },

  async deleteRemark(remarkId: string): Promise<void> {
    const { error } = await supabase.from('remarks').delete().eq('id', remarkId);
    if (error) throw error;
  },
};
