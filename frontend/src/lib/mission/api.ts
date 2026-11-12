import type { Instrument, Launcher, MissionRequest, SimulationResult } from './types';

/** Backend base URL. Override with NEXT_PUBLIC_API_URL in frontend/.env.local. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const TIMEOUT_MS = 5000;

/** The backend answered, but rejected the request (4xx/5xx). */
export class ApiHttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiHttpError';
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
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        /* response had no JSON body */
      }
      throw new ApiHttpError(`Backend rejected the request: ${detail}`, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The backend did not respond in time.');
    }
    if (err instanceof TypeError) {
      throw new Error(`Cannot reach the backend at ${API_BASE_URL}.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const missionApi = {
  getLaunchers: () => request<Launcher[]>('/api/catalog/launchers'),
  getInstruments: () => request<Instrument[]>('/api/catalog/instruments'),
  simulate: (payload: MissionRequest) =>
    request<SimulationResult>('/api/simulate', { method: 'POST', body: JSON.stringify(payload) }),
};
