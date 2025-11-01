import {EventName, EventPayload, Listener} from '@/shared/eventBus/config';

// Use a Map to store listeners for each event.
// This variable is encapsulated by the function scope below (a closure)
// and acts as the state for our singleton Event Bus.
const listeners = new Map<EventName, Listener<any>[]>();

/**
 * Registers a listener for a given event.
 */
function on<T extends EventName>(eventName: T, listener: Listener<T>): () => void {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, []);
  }
  // Type assertion is safe here
  listeners.get(eventName)!.push(listener as Listener<any>);

  // Returns the unsubscribe function (cleanup)
  return () => off(eventName, listener);
}

/**
 * Removes a listener for a given event.
 */
function off<T extends EventName>(eventName: T, listener: Listener<T>): void {
  const handlers = listeners.get(eventName);
  if (handlers) {
    listeners.set(
      eventName,
      handlers.filter(h => h !== listener)
    );
  }
}

/**
 * Emits an event, triggering all registered listeners.
 */
function emit<T extends EventName>(eventName: T, payload: EventPayload<T>): void {
  const handlers = listeners.get(eventName);
  if (handlers) {
    handlers.forEach(listener => listener(payload));
  }
}

/**
 * The functional, singleton Event Bus instance.
 * It exposes the public methods.
 */
export const eventBus = {
  on,
  off,
  emit,
};