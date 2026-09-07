import type { Scope } from "./roles";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "co_admin" | "employee" | "client" | "driver";
  employeeCategory?: "vehicle_master" | "entry_master" | "accountant" | "temporary" | null;
  isTemporary: boolean;
  temporaryScope?: "admin" | "co_admin" | null;
  isActive: boolean;
  licenseNumber?: string;
  licenseExpiry?: string;
  companyName?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  scope: Scope;
}
