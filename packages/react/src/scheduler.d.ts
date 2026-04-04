declare module "scheduler" {
  export function unstable_scheduleCallback(priority: number, callback: () => void): unknown;
  export function unstable_cancelCallback(handle: unknown): void;
  export function unstable_shouldYield(): boolean;
  export function unstable_now(): number;
}
