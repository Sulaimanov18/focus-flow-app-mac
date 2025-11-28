import { createClient } from '@supabase/supabase-js';
import { Task, User } from '../types';

const SUPABASE_URL = 'https://ruurweewhfxzhvrhrcig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dXJ3ZWV3aGZ4emh2cmhyY2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTk2MTEsImV4cCI6MjA3OTgzNTYxMX0.a6WWSop-WtFcy0G_dHE4zIxVXKeV61Yd7Nrb5oQYRG4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // Authentication
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.display_name,
    };
  }

  // Tasks
  async fetchTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((task) => ({
      id: task.id,
      title: task.title,
      isDone: task.is_done,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at),
    }));
  }

  async saveTasks(tasks: Task[], userId: string): Promise<void> {
    const tasksToSave = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      is_done: task.isDone,
      user_id: userId,
      created_at: task.createdAt.toISOString(),
      updated_at: task.updatedAt.toISOString(),
    }));

    const { error } = await supabase
      .from('tasks')
      .upsert(tasksToSave, { onConflict: 'id' });

    if (error) throw error;
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }

  // Notes
  async fetchNotes(userId: string): Promise<string> {
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data?.content || '';
  }

  async saveNotes(content: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .upsert(
        {
          user_id: userId,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  }
}

export const supabaseService = new SupabaseService();
