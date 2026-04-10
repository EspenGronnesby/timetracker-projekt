export interface User {
  id: string;
  name: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  contractNumber: string;
  description: string;
}

export interface TimeEntry {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  userId: string;
  userName: string;
}

export interface DriveEntry {
  id: string;
  startTime: Date;
  endTime?: Date;
  kilometers?: number;
  userId: string;
  userName: string;
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
  userId: string;
  userName: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  customerInfo: CustomerInfo;
  totalTime: number; // in seconds
  totalKilometers: number;
  totalMaterialCost: number;
  userId: string;
  activeUsers: Record<string, { isActive: boolean; isDriving: boolean }>;
  currentEntries: Record<string, TimeEntry>;
  currentDrives: Record<string, DriveEntry>;
  entries: TimeEntry[];
  driveEntries: DriveEntry[];
  materials: Material[];
  createdAt: Date;
  completed: boolean;
  hideCustomerInfo: boolean;
}
