import { useState, useEffect } from "react";
import { User } from "@/types/project";

const STORAGE_KEY = "timetracker_active_user";
const LOGIN_KEY = "timetracker_is_logged_in";

const DEFAULT_USERS: User[] = [
  { id: "espen", name: "Espen" },
  { id: "benjamin", name: "Benjamin" },
  { id: "lukas", name: "Lukas" },
];

export const useActiveUser = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const stored = localStorage.getItem(LOGIN_KEY);
    return stored === "true";
  });

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

  useEffect(() => {
    localStorage.setItem(LOGIN_KEY, isLoggedIn.toString());
  }, [isLoggedIn]);

  const login = (user: User) => {
    setActiveUser(user);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return {
    activeUser,
    setActiveUser,
    users: DEFAULT_USERS,
    isLoggedIn,
    login,
    logout,
  };
};
