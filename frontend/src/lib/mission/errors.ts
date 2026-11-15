/**
 * Turns backend error responses into clear French messages for the Mission Builder.
 *
 * Every error handler of the NOVA backend (backend/app/api/error_handlers.py) answers with
 *   { "error": { "code": string, "message": string, "details": unknown } }
 * and, for HTTP 422, `details` is a list of { location, message, type } built from Pydantic
 * errors (location starts with "body"). The FastAPI default shape { "detail": ... } is also
 * understood, in case the frontend talks to a backend or proxy that does not use those handlers.
 *
 * This module is pure (no React, no fetch) and only uses erasable TypeScript syntax, so it can
 * be tested directly with `node --test`.
 */
import type { BuilderStep, ValidationIssue } from './types';

export type BackendErrorKind =
  | 'validation'    // 422
  | 'bad_request'   // 400
  | 'forbidden'     // 401, 403
  | 'not_found'     // 404
  | 'conflict'      // 409
  | 'server'        // 500
  | 'unavailable'   // 502, 503, 504
  | 'unexpected'    // any other status
  | 'malformed';    // unreadable or unexpected response body

export interface BackendFieldIssue {
  /** Backend location without the leading "body", e.g. "launcher.payload_capacity". */
  location: string;
  /** Builder field used by the inline issue lists, or null when there is no matching field. */
  field: string | null;
  /** Builder step where the value can be corrected, or null when unknown. */
  step: BuilderStep | null;
  /** French name of the value, e.g. "Lanceur : capacité d'emport". */
  label: string;
  /** French explanation of what is wrong. */
  message: string;
  /** French hint on how to correct it. */
  hint: string;
  /** Raw backend message and type, kept for diagnosis. */
  technical: string;
}

export interface BackendError {
  kind: BackendErrorKind;
  status: number;
  /** Backend error code (e.g. VALIDATION_ERROR), when the response provides one. */
  code: string | null;
  title: string;
  message: string;
  fieldIssues: BackendFieldIssue[];
  /** Raw information kept for diagnosis (status, code, backend messages). */
  technical: string[];
  /** Number of refused values the user has changed since the refusal (not re-checked yet). */
  changedSinceRefusal: number;
}

const STEP_NAME: Record<BuilderStep, string> = {
  mission: 'Mission', spacecraft: 'Plateforme', launcher: 'Lanceur', payload: 'Charge utile', review: 'Revue et lancement',
};

interface FieldTarget {
  field: string | null;
  step: BuilderStep | null;
  label: string;
  /** True when the value comes from the catalog and cannot be typed by the user. */
  fromCatalog: boolean;
}

const TOP_LEVEL: Record<string, FieldTarget> = {
  name: { field: 'name', step: 'mission', label: 'Nom de la mission', fromCatalog: false },
  destination: { field: 'destination', step: 'mission', label: 'Destination', fromCatalog: false },
  duration_days: { field: 'duration_days', step: 'mission', label: 'Durée', fromCatalog: false },
  difficulty: { field: 'difficulty', step: 'mission', label: 'Difficulté', fromCatalog: false },
  budget_allocated: { field: 'budget_allocated', step: 'mission', label: 'Budget alloué', fromCatalog: false },
};

const SPACECRAFT_FIELDS: Record<string, string> = {
  name: 'nom', base_mass: 'masse sèche', fuel_mass: "masse d'ergols", solar_power_generation: 'production électrique',
  base_power_consumption: 'consommation propre', cost: 'coût',
};
const LAUNCHER_FIELDS: Record<string, string> = {
  name: 'nom', payload_capacity: "capacité d'emport", cost: 'coût', reliability: 'fiabilité',
};
const INSTRUMENT_FIELDS: Record<string, string> = {
  name: 'nom', mass: 'masse', cost: 'coût', power_consumption: 'consommation électrique', utility_score: 'intérêt scientifique',
};

/** Maps a backend location (e.g. ["body", "launcher", "cost"]) to a Builder field and step. */
export function mapLocation(location: readonly (string | number)[]): FieldTarget & { path: string } {
  const parts = location[0] === 'body' ? location.slice(1) : [...location];
  const path = parts.join('.');
  const [head, second, third] = parts;

  if (parts.length === 0) {
    return { field: null, step: null, label: 'Requête entière', fromCatalog: false, path };
  }
  if (typeof head === 'string' && Object.prototype.hasOwnProperty.call(TOP_LEVEL, head) && parts.length === 1) {
    return { ...TOP_LEVEL[head], path };
  }
  if (head === 'spacecraft') {
    if (second === 'fuel_mass') {
      return { field: 'fuel_mass', step: 'spacecraft', label: "Masse d'ergols", fromCatalog: false, path };
    }
    const sub = typeof second === 'string' ? SPACECRAFT_FIELDS[second] : undefined;
    return { field: 'spacecraft', step: 'spacecraft', label: sub ? `Plateforme : ${sub}` : 'Plateforme', fromCatalog: true, path };
  }
  if (head === 'launcher') {
    const sub = typeof second === 'string' ? LAUNCHER_FIELDS[second] : undefined;
    return { field: 'launcher', step: 'launcher', label: sub ? `Lanceur : ${sub}` : 'Lanceur', fromCatalog: true, path };
  }
  if (head === 'instruments') {
    if (typeof second === 'number') {
      const sub = typeof third === 'string' ? INSTRUMENT_FIELDS[third] : undefined;
      const label = `Instrument n° ${second + 1}${sub ? ` : ${sub}` : ''}`;
      return { field: 'instruments', step: 'payload', label, fromCatalog: true, path };
    }
    return { field: 'instruments', step: 'payload', label: 'Instruments', fromCatalog: false, path };
  }
  if (head === 'orbit') {
    if (second === 'altitude_km') return { field: 'altitude_km', step: 'mission', label: "Altitude de l'orbite", fromCatalog: false, path };
    if (second === 'inclination_deg') return { field: 'inclination_deg', step: 'mission', label: 'Inclinaison', fromCatalog: false, path };
    return { field: null, step: 'mission', label: 'Orbite', fromCatalog: false, path };
  }
  // Not a field the Builder knows (e.g. a JSON decode position): no step, honest label.
  return { field: null, step: null, label: `Champ « ${path} »`, fromCatalog: false, path };
}

const num = (raw: string | undefined) => (raw === undefined ? undefined : raw.replace('.', ','));

/** Translates a Pydantic error (type + English message) into French. Unknown types keep the backend text. */
export function translateValidationMessage(type: string, message: string): string {
  const limit = num(message.match(/(?:than|to) (-?\d+(?:\.\d+)?)/)?.[1]);
  const count = message.match(/at (?:least|most) (\d+)/)?.[1];
  switch (type) {
    case 'missing':
      return 'Valeur manquante.';
    case 'float_parsing':
    case 'float_type':
      return 'La valeur doit être un nombre.';
    case 'int_parsing':
    case 'int_type':
    case 'int_from_float':
      return 'La valeur doit être un nombre entier.';
    case 'finite_number':
      return 'La valeur doit être un nombre fini (ni NaN, ni infini).';
    case 'greater_than':
      return limit ? `La valeur doit être strictement supérieure à ${limit}.` : 'La valeur est trop petite.';
    case 'greater_than_equal':
      return limit ? `La valeur doit être supérieure ou égale à ${limit}.` : 'La valeur est trop petite.';
    case 'less_than':
      return limit ? `La valeur doit être strictement inférieure à ${limit}.` : 'La valeur est trop grande.';
    case 'less_than_equal':
      return limit ? `La valeur doit être inférieure ou égale à ${limit}.` : 'La valeur est trop grande.';
    case 'too_short':
      return count ? `La liste doit contenir au moins ${count} élément${count === '1' ? '' : 's'}.` : 'La liste est trop courte.';
    case 'too_long':
      return count ? `La liste doit contenir au plus ${count} élément${count === '1' ? '' : 's'}.` : 'La liste est trop longue.';
    case 'string_too_short':
      return count ? `Le texte doit contenir au moins ${count} caractère${count === '1' ? '' : 's'}.` : 'Le texte est trop court.';
    case 'string_too_long':
      return count ? `Le texte doit contenir au plus ${count} caractère${count === '1' ? '' : 's'}.` : 'Le texte est trop long.';
    case 'string_type':
      return 'La valeur doit être un texte.';
    case 'list_type':
      return 'La valeur doit être une liste.';
    case 'model_type':
    case 'model_attributes_type':
    case 'dict_type':
      return 'La valeur doit être un objet structuré.';
    case 'json_invalid':
      return "Le corps de la requête n'est pas un JSON valide.";
    default:
      // Unknown type: do not guess a cause, show the backend wording.
      return `Valeur refusée par le backend : ${message}`;
  }
}

function hintFor(target: FieldTarget): string {
  if (!target.step) return 'Aucune étape du Builder ne correspond à ce champ ; voir les détails techniques.';
  const step = STEP_NAME[target.step];
  if (target.fromCatalog) return `Cette valeur provient du catalogue : choisissez un autre élément à l'étape « ${step} ».`;
  return `Corrigez cette valeur à l'étape « ${step} ».`;
}

interface RawDetail {
  location: (string | number)[];
  message: string;
  type: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accepts both the NOVA format {location, message, type} and the FastAPI default {loc, msg, type}. */
function readDetails(details: unknown): RawDetail[] | null {
  if (!Array.isArray(details)) return null;
  const out: RawDetail[] = [];
  for (const item of details) {
    if (!isRecord(item)) return null;
    const location = item.location ?? item.loc;
    const message = item.message ?? item.msg;
    if (!Array.isArray(location) || typeof message !== 'string') return null;
    out.push({
      location: location.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number'),
      message,
      type: typeof item.type === 'string' ? item.type : 'unknown',
    });
  }
  return out;
}

function toFieldIssue(d: RawDetail): BackendFieldIssue {
  const target = mapLocation(d.location);
  return {
    location: target.path,
    field: target.field,
    step: target.step,
    label: target.label,
    message: translateValidationMessage(d.type, d.message),
    hint: hintFor(target),
    technical: `${d.location.join('.')} : ${d.message} (${d.type})`,
  };
}

function kindOf(status: number): BackendErrorKind {
  if (status === 422) return 'validation';
  if (status === 400) return 'bad_request';
  if (status === 401 || status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 500) return 'server';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'unexpected';
}

const TITLES: Record<BackendErrorKind, string> = {
  validation: 'Configuration refusée par le backend',
  bad_request: 'Requête refusée par le backend',
  forbidden: 'Accès refusé par le backend',
  not_found: 'Adresse introuvable sur le backend',
  conflict: 'Conflit signalé par le backend',
  server: 'Erreur interne du backend',
  unavailable: 'Service de simulation indisponible',
  unexpected: 'Réponse inattendue du backend',
  malformed: 'Réponse illisible du backend',
};

function messageFor(kind: BackendErrorKind, status: number, issueCount: number): string {
  switch (kind) {
    case 'validation':
      return issueCount > 0
        ? `Le backend a jugé ${issueCount === 1 ? 'une valeur invalide' : `${issueCount} valeurs invalides`}. Corrigez-${issueCount === 1 ? 'la' : 'les'}, puis relancez la simulation.`
        : "Le backend a refusé la configuration sans indiquer quel champ est en cause. Consultez les détails techniques.";
    case 'bad_request':
      return "Le backend a jugé la requête invalide (HTTP 400). Aucune simulation n'a été produite.";
    case 'forbidden':
      return `Le backend a refusé l'accès à cette ressource (HTTP ${status}).`;
    case 'not_found':
      return "L'adresse demandée n'existe pas sur ce backend (HTTP 404). Vérifiez que l'URL du backend correspond à cette version de l'application.";
    case 'conflict':
      return "Le backend signale un conflit avec l'état actuel de ses données (HTTP 409).";
    case 'server':
      return "Le backend a rencontré une erreur inattendue (HTTP 500). Aucun résultat n'a été produit ; vous pouvez réessayer.";
    case 'unavailable':
      return `Le backend ou le moteur de simulation est indisponible pour le moment (HTTP ${status}). Réessayez plus tard.`;
    case 'malformed':
      return `Le backend a répondu (HTTP ${status}), mais sa réponse n'a pas le format attendu. Aucun résultat n'est affiché.`;
    default:
      return `Le backend a répondu avec le code HTTP ${status}, que l'application ne sait pas interpréter.`;
  }
}

/**
 * Builds a BackendError from an HTTP status and the parsed JSON body (or null when the body was
 * empty or not JSON). Never throws.
 */
export function parseBackendError(status: number, body: unknown): BackendError {
  const kind = kindOf(status);
  const technical: string[] = [`HTTP ${status}`];
  let code: string | null = null;
  let details: unknown = undefined;

  if (isRecord(body) && isRecord(body.error)) {
    const err = body.error;
    code = typeof err.code === 'string' ? err.code : null;
    if (code) technical.push(`Code : ${code}`);
    if (typeof err.message === 'string') technical.push(`Message du backend : ${err.message}`);
    details = err.details;
  } else if (isRecord(body) && 'detail' in body) {
    if (typeof body.detail === 'string') technical.push(`Message du backend : ${body.detail}`);
    else details = body.detail;
  } else if (body === null) {
    technical.push('Réponse sans contenu JSON.');
  } else {
    technical.push(`Réponse non reconnue : ${JSON.stringify(body).slice(0, 200)}`);
  }

  const parsed = readDetails(details);
  const fieldIssues = parsed ? parsed.map(toFieldIssue) : [];
  for (const issue of fieldIssues) technical.push(issue.technical);
  if (details !== undefined && details !== null && !parsed) {
    technical.push(`Détails : ${JSON.stringify(details).slice(0, 300)}`);
  }

  return {
    kind,
    status,
    code,
    title: TITLES[kind],
    message: messageFor(kind, status, fieldIssues.length),
    fieldIssues,
    technical,
    changedSinceRefusal: 0,
  };
}

/** Error for a 2xx response whose body cannot be used (not JSON, or not the expected shape). */
export function malformedResponse(status: number, reason: string): BackendError {
  return {
    kind: 'malformed',
    status,
    code: null,
    title: TITLES.malformed,
    message: messageFor('malformed', status, 0),
    fieldIssues: [],
    technical: [`HTTP ${status}`, reason],
    changedSinceRefusal: 0,
  };
}

/**
 * Backend locations (without "body") whose value is produced by each MissionDraft key, see
 * buildMissionRequest in validation.ts. A key absent from this table is not sent to the backend.
 * Matching is by prefix: "launcher" covers "launcher" and "launcher.payload_capacity".
 */
const DRAFT_KEY_LOCATIONS: Record<string, readonly string[]> = {
  name: ['name'],
  destinationId: ['destination'],
  duration_days: ['duration_days'],
  difficulty: ['difficulty'],
  budget_allocated: ['budget_allocated'],
  altitude_km: ['orbit.altitude_km'],
  inclination_deg: ['orbit.inclination_deg'],
  // Choosing another platform replaces the whole spacecraft block (fuel included).
  spacecraftId: ['spacecraft'],
  fuel_mass: ['spacecraft.fuel_mass'],
  // Choosing another launcher replaces the whole launcher block.
  launcherId: ['launcher'],
  // Any change of selection rebuilds the whole list (positions shift), so every instrument issue is stale.
  instrumentIds: ['instruments'],
};

const covers = (location: string, prefix: string) => location === prefix || location.startsWith(`${prefix}.`);

/**
 * Removes the backend issues made obsolete by a change of the given draft keys, and keeps all
 * the others. Issues with no reliable link to a draft key (whole request, unknown field, whole
 * "orbit" block) and errors without field issues (HTTP 500, 503, malformed answer...) are kept
 * until the next launch. Returns null when every field issue has been addressed.
 */
export function clearIssuesForDraftChange(error: BackendError | null, changedKeys: readonly string[]): BackendError | null {
  if (!error || error.fieldIssues.length === 0) return error;
  const prefixes = changedKeys.flatMap(key => (Object.prototype.hasOwnProperty.call(DRAFT_KEY_LOCATIONS, key) ? DRAFT_KEY_LOCATIONS[key] : []));
  if (prefixes.length === 0) return error;
  const remaining = error.fieldIssues.filter(issue => !prefixes.some(prefix => covers(issue.location, prefix)));
  if (remaining.length === error.fieldIssues.length) return error;
  if (remaining.length === 0) return null;
  return {
    ...error,
    fieldIssues: remaining,
    message: messageFor(error.kind, error.status, remaining.length),
    changedSinceRefusal: error.changedSinceRefusal + (error.fieldIssues.length - remaining.length),
  };
}

const sameValue = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((item, idx) => Object.is(item, b[idx]))
    : Object.is(a, b);

/**
 * Keys of `patch` whose value really differs from `before` (re-selecting the same platform,
 * launcher or instrument list is not a change). Object.is treats NaN as equal to NaN.
 */
export function changedDraftKeys(before: object, patch: object): string[] {
  const prev = before as Record<string, unknown>;
  const next = patch as Record<string, unknown>;
  return Object.keys(next).filter(key => !sameValue(prev[key], next[key]));
}

export type ReviewBadgeState = 'idle' | 'ok' | 'refused' | 'failed';

/**
 * State of the "Revue et lancement" badge. Local validation comes first; when it passes, a
 * backend answer can still say otherwise: 'refused' when the backend judged the request invalid
 * (422, 400), 'failed' when the simulation could not be obtained for another reason.
 */
export function reviewBadgeState(hasLocalErrors: boolean, error: BackendError | null): ReviewBadgeState {
  if (hasLocalErrors) return 'idle';
  if (!error) return 'ok';
  return error.kind === 'validation' || error.kind === 'bad_request' ? 'refused' : 'failed';
}

export interface Readiness {
  state: 'blocked' | 'ready' | 'refused' | 'failed';
  label: string;
}

/**
 * Text of the "Préparation" card. Local blocking issues come first (unchanged rule); otherwise
 * the last backend answer decides between ready, refused and not completed.
 */
export function readinessSummary(localErrorCount: number, error: BackendError | null): Readiness {
  if (localErrorCount > 0) {
    const plural = localErrorCount > 1 ? 's' : '';
    return { state: 'blocked', label: `${localErrorCount} problème${plural} bloquant${plural}` };
  }
  const badge = reviewBadgeState(false, error);
  if (badge === 'refused') return { state: 'refused', label: 'CONFIGURATION REFUSÉE' };
  if (badge === 'failed') return { state: 'failed', label: 'SIMULATION NON ABOUTIE' };
  return { state: 'ready', label: 'PRÊT AU LANCEMENT' };
}

/** Backend field issues expressed as Builder issues, so they appear next to the matching fields. */
export function toBuilderIssues(error: BackendError | null): ValidationIssue[] {
  if (!error) return [];
  return error.fieldIssues
    .filter((i): i is BackendFieldIssue & { field: string; step: BuilderStep } => i.field !== null && i.step !== null)
    .map(i => ({ field: i.field, step: i.step, severity: 'error' as const, message: `Refusé par le backend : ${i.message}` }));
}

/** Minimal shape check of a simulation result before it is displayed. */
export function isSimulationResult(value: unknown): boolean {
  return isRecord(value)
    && (value.mission_status === 'SUCCESS' || value.mission_status === 'FAILED' || value.mission_status === 'INVALID')
    && typeof value.score === 'number';
}
