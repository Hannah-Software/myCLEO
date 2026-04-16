// App modes
export type CleoMode = 'personal' | 'commercial';

// Work rhythm phases
export type Phase = 'A' | 'B' | 'C' | 'D' | 'E';

// Health log
export interface HealthLog {
  id?: number;
  date: string;
  mood: number; // 1-10
  energy: number; // 1-10
  notes?: string;
  created_at?: string;
}

// Medication
export interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
}

// Linear task
export interface LinearTask {
  id: string;
  title: string;
  priority: number;
  status: string;
  due_on?: string;
}

// Orchestrator state
export interface OrchestratorState {
  phase: Phase;
  phase_started_at: string;
  minutes_in_phase: number;
  current_task?: LinearTask;
  tasks_remaining_in_queue: number;
  last_signal?: string;
  last_signal_at?: string;
}

// Alert
export interface ProactiveAlert {
  id: number;
  title: string;
  context: string;
  created_at: string;
  dismissed_at?: string;
}
