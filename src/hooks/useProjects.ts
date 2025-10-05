import { useState, useEffect } from "react";
import { Project, TimeEntry } from "@/types/project";
import { getTotalSeconds } from "@/lib/timeUtils";
import { toast } from "sonner";

const STORAGE_KEY = "timetracker_projects";

export const useProjects = (userId: string) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        currentEntry: p.currentEntry
          ? {
              ...p.currentEntry,
              startTime: new Date(p.currentEntry.startTime),
              endTime: p.currentEntry.endTime ? new Date(p.currentEntry.endTime) : undefined,
            }
          : undefined,
        entries: p.entries.map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: e.endTime ? new Date(e.endTime) : undefined,
        })),
      }));
    }
    return [];
  });

  useEffect(() => {
    const toStore = projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      currentEntry: p.currentEntry
        ? {
            ...p.currentEntry,
            startTime: p.currentEntry.startTime.toISOString(),
            endTime: p.currentEntry.endTime?.toISOString(),
          }
        : undefined,
      entries: p.entries.map((e) => ({
        ...e,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime?.toISOString(),
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [projects]);

  const addProject = (name: string, color: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      color,
      totalTime: 0,
      isActive: false,
      userId,
      entries: [],
      createdAt: new Date(),
    };
    setProjects((prev) => [...prev, newProject]);
    toast.success(`Prosjekt "${name}" opprettet!`);
  };

  const userProjects = projects.filter((p) => p.userId === userId);

  const toggleProject = (id: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;

        if (project.isActive) {
          // Stop the project
          if (project.currentEntry) {
            const endTime = new Date();
            const duration = getTotalSeconds(project.currentEntry.startTime, endTime);
            const completedEntry: TimeEntry = {
              ...project.currentEntry,
              endTime,
              duration,
            };

            toast.success(`Stoppet "${project.name}"`);
            
            return {
              ...project,
              isActive: false,
              totalTime: project.totalTime + duration,
              entries: [...project.entries, completedEntry],
              currentEntry: undefined,
            };
          }
        } else {
          // Start the project
          const newEntry: TimeEntry = {
            id: Date.now().toString(),
            startTime: new Date(),
            duration: 0,
          };
          
          toast.success(`Startet "${project.name}"`);
          
          return {
            ...project,
            isActive: true,
            currentEntry: newEntry,
          };
        }

        return project;
      })
    );
  };

  const deleteProject = (id: string) => {
    const project = projects.find((p) => p.id === id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (project) {
      toast.success(`Prosjekt "${project.name}" slettet`);
    }
  };

  return {
    projects: userProjects,
    addProject,
    toggleProject,
    deleteProject,
  };
};
