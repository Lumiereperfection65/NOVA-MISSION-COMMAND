import type { Instrument, Launcher, MissionRequest, SimulationResult } from './types';
import { isSimulationResult, malformedResponse, parseBackendError } from './errors';
import type { BackendError } from './errors';

/** Backend base URL. Override with NEXT_PUBLIC_API_URL in frontend/.env.local. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const TIMEOUT_MS = 5000;

/**
 * The backend answered, but its answer cannot be used: an HTTP error status (4xx/5xx) or a
 * malformed body. `info` holds the analysed error (kind, French message, fields concerned).
 */
export class ApiHttpError extends Error {
  status: number;
  info: BackendError;

  constructor(info: BackendError) {
    super(`${info.title} : ${info.message}`);
    this.name = 'ApiHttpError';
    this.status = info.status;
    this.info = info;
    // Keep `instanceof` working when compiled down to ES5.
    Object.setPrototypeOf(this, ApiHttpError.prototype);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* response had no JSON body: parseBackendError reports it */
      }
      throw new ApiHttpError(parseBackendError(res.status, body));
    }
    try {
      return (await res.json()) as T;
    } catch {
      // The backend answered 2xx with a body that is not JSON: report it, never treat it as offline.
      throw new ApiHttpError(malformedResponse(res.status, 'Corps de réponse non JSON.'));
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error("Le backend n'a pas répondu à temps.");
    }
    if (err instanceof TypeError) {
      throw new Error(`Impossible de joindre le backend à l'adresse ${API_BASE_URL}.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const missionApi = {
  getLaunchers: () => request<Launcher[]>('/api/catalog/launchers'),
  getInstruments: () => request<Instrument[]>('/api/catalog/instruments'),
  simulate: async (payload: MissionRequest) => {
    const result = await request<unknown>('/api/simulate', { method: 'POST', body: JSON.stringify(payload) });
    if (!isSimulationResult(result)) {
      throw new ApiHttpError(malformedResponse(200, 'Le résultat ne contient pas de mission_status ni de score exploitables.'));
    }
    return result as SimulationResult;
  },
};
