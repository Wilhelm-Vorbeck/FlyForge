/**
 * Scheme (方案) persistence utilities
 * Stores saved flywheel design schemes in localStorage for cross-session comparison.
 */
import { FlywheelParams, Material } from "../types";

const STORAGE_KEY = "flyforge_schemes";

/** A saved scheme snapshot */
export interface SavedScheme {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  params: FlywheelParams;
  material: Material;
  // Summary values from simulation (optional — may not be available if sim failed)
  summary?: {
    mass: number;
    moment_of_inertia: number;
    max_stress: number;
    safety_yield: number;
    safety_fatigue: number;
    energy_rated: number;
    energy_usable: number;
    specific_energy: number;
    safety_passed: boolean;
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadAll(): SavedScheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScheme[];
  } catch {
    return [];
  }
}

function saveAll(schemes: SavedScheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
}

/** Get all saved schemes */
export function getAllSchemes(): SavedScheme[] {
  return loadAll();
}

/** Save a new scheme */
export function saveScheme(
  name: string,
  params: FlywheelParams,
  material: Material,
  summary?: SavedScheme["summary"],
): SavedScheme {
  const scheme: SavedScheme = {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    params,
    material,
    summary,
  };
  const schemes = loadAll();
  schemes.push(scheme);
  saveAll(schemes);
  return scheme;
}

/** Delete a scheme by id */
export function deleteScheme(id: string): void {
  const schemes = loadAll().filter((s) => s.id !== id);
  saveAll(schemes);
}

/** Rename a scheme */
export function renameScheme(id: string, newName: string): void {
  const schemes = loadAll();
  const scheme = schemes.find((s) => s.id === id);
  if (scheme) {
    scheme.name = newName;
    saveAll(schemes);
  }
}

/** Clear all schemes */
export function clearAllSchemes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
