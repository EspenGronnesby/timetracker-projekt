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
      return parsed.map((p: any) => ({
        ...p,
        // Migration: Add default customerInfo if missing
        customerInfo: p.customerInfo || {
          name: p.name || "Ukjent kunde",
          address: "",
          phone: "",
          email: "",
          contractNumber: "",
          description: "",
        },
        createdAt: new Date(p.createdAt),
        currentEntry: p.currentEntry
          ? {
              ...p.currentEntry,
              startTime: new Date(p.currentEntry.startTime),
              endTime: p.currentEntry.endTime ? new Date(p.currentEntry.endTime) : undefined,
              userId: p.currentEntry.userId || p.userId || userId,
              userName: p.currentEntry.userName || userName,
            }
          : undefined,
        currentDrive: p.currentDrive
          ? {
              ...p.currentDrive,
              startTime: new Date(p.currentDrive.startTime),
              endTime: p.currentDrive.endTime ? new Date(p.currentDrive.endTime) : undefined,
              userId: p.currentDrive.userId || p.userId || userId,
              userName: p.currentDrive.userName || userName,
            }
          : undefined,
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
        isDriving: p.isDriving || false,
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
      currentDrive: p.currentDrive
        ? {
            ...p.currentDrive,
            startTime: p.currentDrive.startTime.toISOString(),
            endTime: p.currentDrive.endTime?.toISOString(),
          }
        : undefined,
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
      isActive: false,
      isDriving: false,
      userId,
      entries: [],
      driveEntries: [],
      materials: [],
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
            userId,
            userName,
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

  const toggleDriving = (id: string, kilometers?: number) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;

        if (project.isDriving) {
          // Stop driving
          if (project.currentDrive && kilometers !== undefined) {
            const endTime = new Date();
            const completedDrive: DriveEntry = {
              ...project.currentDrive,
              endTime,
              kilometers,
            };

            toast.success(`Registrert ${kilometers} km på "${project.name}"`);
            
            return {
              ...project,
              isDriving: false,
              totalKilometers: project.totalKilometers + kilometers,
              driveEntries: [...project.driveEntries, completedDrive],
              currentDrive: undefined,
            };
          }
        } else {
          // Start driving
          const newDrive: DriveEntry = {
            id: Date.now().toString(),
            startTime: new Date(),
            userId,
            userName,
          };
          
          toast.success(`Startet kjøring for "${project.name}"`);
          
          return {
            ...project,
            isDriving: true,
            currentDrive: newDrive,
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
    projects: userProjects,
    addProject,
    toggleProject,
    toggleDriving,
    addMaterial,
    deleteProject,
  };
};
