import { EventEmitter } from 'events';
import type { AgentEvent } from '../types';
import { appendJsonl, dataPath } from '../store/JsonStore';

/**
 * Internal observability bus — not private chain-of-thought.
 * Emits concise agent lifecycle events for UI / debugging.
 */
class AgentEventBus extends EventEmitter {
  emitEvent(event: AgentEvent): AgentEvent {
    this.emit('event', event);
    this.emit(event.type, event);
    try {
      appendJsonl(dataPath('events', 'agent.jsonl'), event);
    } catch {
      /* ignore persistence errors */
    }
    return event;
  }

  now(type: AgentEvent['type'], message: string, data?: Record<string, unknown>): AgentEvent {
    return this.emitEvent({ type, ts: new Date().toISOString(), message, data });
  }
}

export const eventBus = new AgentEventBus();
