import { useState, useEffect } from "react";
import { Project, TimeEntry, DriveEntry, Material, CustomerInfo } from "@/types/project";
import { getTotalSeconds } from "@/lib/timeUtils";
import { toast } from "sonner";

const STORAGE_KEY = "timetracker_projects";

export const useProjects = (userId: string, userName: string) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => {
        // Migration: Convert old structure to new per-user structure
        const activeUsers: Record<string, { isActive: boolean; isDriving: boolean }> = 
          p.activeUsers || {};
        const currentEntries: Record<string, TimeEntry> = {};
        const currentDrives: Record<string, DriveEntry> = {};

        // Migrate old currentEntry to new structure
        if (p.currentEntry && !p.currentEntries) {
          const entry = {
            ...p.currentEntry,
            startTime: new Date(p.currentEntry.startTime),
            endTime: p.currentEntry.endTime ? new Date(p.currentEntry.endTime) : undefined,
            userId: p.currentEntry.userId || p.userId || userId,
            userName: p.currentEntry.userName || userName,
          };
          currentEntries[entry.userId] = entry;
          activeUsers[entry.userId] = { 
            isActive: true, 
            isDriving: activeUsers[entry.userId]?.isDriving || false 
          };
        } else if (p.currentEntries) {
          Object.entries(p.currentEntries).forEach(([uid, e]: [string, any]) => {
            currentEntries[uid] = {
              ...e,
              startTime: new Date(e.startTime),
              endTime: e.endTime ? new Date(e.endTime) : undefined,
            };
          });
        }

        // Migrate old currentDrive to new structure
        if (p.currentDrive && !p.currentDrives) {
          const drive = {
            ...p.currentDrive,
            startTime: new Date(p.currentDrive.startTime),
            endTime: p.currentDrive.endTime ? new Date(p.currentDrive.endTime) : undefined,
            userId: p.currentDrive.userId || p.userId || userId,
            userName: p.currentDrive.userName || userName,
          };
          currentDrives[drive.userId] = drive;
          activeUsers[drive.userId] = { 
            isActive: activeUsers[drive.userId]?.isActive || false,
            isDriving: true 
          };
        } else if (p.currentDrives) {
          Object.entries(p.currentDrives).forEach(([uid, d]: [string, any]) => {
            currentDrives[uid] = {
              ...d,
              startTime: new Date(d.startTime),
              endTime: d.endTime ? new Date(d.endTime) : undefined,
            };
          });
        }

        // Migrate old isActive/isDriving flags
        if (p.isActive !== undefined && p.userId && !activeUsers[p.userId]) {
          activeUsers[p.userId] = {
            isActive: p.isActive || false,
            isDriving: p.isDriving || false,
          };
        }

        return {
          ...p,
          customerInfo: p.customerInfo || {
            name: p.name || "Ukjent kunde",
            address: "",
            phone: "",
            email: "",
            contractNumber: "",
            description: "",
          },
          createdAt: new Date(p.createdAt),
          activeUsers,
          currentEntries,
          currentDrives,
          entries: (p.entries || []).map((e: any) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: e.endTime ? new Date(e.endTime) : undefined,
            userId: e.userId || p.userId || userId,
            userName: e.userName || userName,
          })),
          driveEntries: (p.driveEntries || []).map((e: any) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: e.endTime ? new Date(e.endTime) : undefined,
            userId: e.userId || p.userId || userId,
            userName: e.userName || userName,
          })),
          materials: (p.materials || []).map((m: any) => ({
            ...m,
            addedAt: new Date(m.addedAt),
            userId: m.userId || p.userId || userId,
            userName: m.userName || userName,
          })),
          totalKilometers: p.totalKilometers || 0,
          totalMaterialCost: p.totalMaterialCost || 0,
        };
      });
    }
    return [];
  });

  useEffect(() => {
    const toStore = projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      currentEntries: Object.fromEntries(
        Object.entries(p.currentEntries).map(([uid, e]) => [
          uid,
          {
            ...e,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime?.toISOString(),
          },
        ])
      ),
      currentDrives: Object.fromEntries(
        Object.entries(p.currentDrives).map(([uid, d]) => [
          uid,
          {
            ...d,
            startTime: d.startTime.toISOString(),
            endTime: d.endTime?.toISOString(),
          },
        ])
      ),
      entries: p.entries.map((e) => ({
        ...e,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime?.toISOString(),
      })),
      driveEntries: p.driveEntries.map((e) => ({
        ...e,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime?.toISOString(),
      })),
      materials: p.materials.map((m) => ({
        ...m,
        addedAt: m.addedAt.toISOString(),
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }, [projects]);

  const addProject = (name: string, color: string, customerInfo: CustomerInfo) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      color,
      customerInfo,
      totalTime: 0,
      totalKilometers: 0,
      totalMaterialCost: 0,
      userId,
      activeUsers: {},
      currentEntries: {},
      currentDrives: {},
      entries: [],
      driveEntries: [],
      materials: [],
      createdAt: new Date(),
    };
    setProjects((prev) => [...prev, newProject]);
    toast.success(`Prosjekt "${name}" opprettet!`);
  };

  const toggleProject = (id: string) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;

        const userState = project.activeUsers[userId] || { isActive: false, isDriving: false };
        
        if (userState.isActive) {
          // Stop the project for this user
          const currentEntry = project.currentEntries[userId];
          if (currentEntry) {
            const endTime = new Date();
            const duration = getTotalSeconds(currentEntry.startTime, endTime);
            const completedEntry: TimeEntry = {
              ...currentEntry,
              endTime,
              duration,
            };

            toast.success(`Stoppet "${project.name}"`);
            
            const newCurrentEntries = { ...project.currentEntries };
            delete newCurrentEntries[userId];
            
            return {
              ...project,
              activeUsers: {
                ...project.activeUsers,
                [userId]: { ...userState, isActive: false },
              },
              currentEntries: newCurrentEntries,
              totalTime: project.totalTime + duration,
              entries: [...project.entries, completedEntry],
            };
          }
        } else {
          // Start the project for this user
          const newEntry: TimeEntry = {
            id: Date.now().toString(),
            startTime: new Date(),
            duration: 0,
            userId,
            userName,
          };
          
          toast.success(`Startet "${project.name}"`);
          
          return {
            ...project,
            activeUsers: {
              ...project.activeUsers,
              [userId]: { ...userState, isActive: true },
            },
            currentEntries: {
              ...project.currentEntries,
              [userId]: newEntry,
            },
          };
        }

        return project;
      })
    );
  };

  const toggleDriving = (id: string, kilometers?: number) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;

        const userState = project.activeUsers[userId] || { isActive: false, isDriving: false };

        if (userState.isDriving) {
          // Stop driving for this user
          const currentDrive = project.currentDrives[userId];
          if (currentDrive && kilometers !== undefined) {
            const endTime = new Date();
            const completedDrive: DriveEntry = {
              ...currentDrive,
              endTime,
              kilometers,
            };

            toast.success(`Registrert ${kilometers} km på "${project.name}"`);
            
            const newCurrentDrives = { ...project.currentDrives };
            delete newCurrentDrives[userId];
            
            return {
              ...project,
              activeUsers: {
                ...project.activeUsers,
                [userId]: { ...userState, isDriving: false },
              },
              currentDrives: newCurrentDrives,
              totalKilometers: project.totalKilometers + kilometers,
              driveEntries: [...project.driveEntries, completedDrive],
            };
          }
        } else {
          // Start driving for this user
          const newDrive: DriveEntry = {
            id: Date.now().toString(),
            startTime: new Date(),
            userId,
            userName,
          };
          
          toast.success(`Startet kjøring for "${project.name}"`);
          
          return {
            ...project,
            activeUsers: {
              ...project.activeUsers,
              [userId]: { ...userState, isDriving: true },
            },
            currentDrives: {
              ...project.currentDrives,
              [userId]: newDrive,
            },
          };
        }

        return project;
      })
    );
  };

  const addMaterial = (projectId: string, name: string, quantity: number, unitPrice: number) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;

        const material: Material = {
          id: Date.now().toString(),
          name,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          addedAt: new Date(),
          userId,
          userName,
        };

        toast.success(`Lagt til materiale: ${name}`);

        return {
          ...project,
          totalMaterialCost: project.totalMaterialCost + material.totalPrice,
          materials: [...project.materials, material],
        };
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
    projects,
    addProject,
    toggleProject,
    toggleDriving,
    addMaterial,
    deleteProject,
  };
};
