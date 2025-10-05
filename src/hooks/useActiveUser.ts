import { useState, useEffect } from "react";
import { User } from "@/types/project";

const STORAGE_KEY = "timetracker_active_user";

const DEFAULT_USERS: User[] = [
  { id: "espen", name: "Espen" },
  { id: "benjamin", name: "Benjamin" },
  { id: "lukas", name: "Lukas" },
];

export const useActiveUser = () => {
  const [activeUser, setActiveUser] = useState<User>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_USERS[0];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUser));
  }, [activeUser]);

  return {
    activeUser,
    setActiveUser,
    users: DEFAULT_USERS,
  };
};
