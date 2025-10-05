export interface TimeEntry {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
}

export interface Project {
  id: string;
  name: string;
  color: string;
  totalTime: number; // in seconds
  isActive: boolean;
  currentEntry?: TimeEntry;
  entries: TimeEntry[];
  createdAt: Date;
}
