/**
 * Parameter change history for undo/redo support.
 * Keeps a rolling window of the last N parameter snapshots.
 */
import { FlywheelParams } from "../types";

const MAX_HISTORY = 20;

export class ParamHistory {
  private past: FlywheelParams[] = [];
  private future: FlywheelParams[] = [];

  /** Record a new state (call before each param change) */
  push(params: FlywheelParams): void {
    this.past.push({ ...params });
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = []; // clear redo stack on new action
  }

  /** Undo: returns previous params or null if nothing to undo */
  undo(): FlywheelParams | null {
    if (this.past.length === 0) return null;
    const prev = this.past.pop()!;
    this.future.push(prev);
    return prev;
  }

  /** Redo: returns next params or null if nothing to redo */
  redo(): FlywheelParams | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(next);
    return next;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
