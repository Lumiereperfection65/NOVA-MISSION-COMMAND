// Targeted tests for backend error handling (errors.ts and api.ts).
// No dependency: Node's built-in test runner and TypeScript type stripping (Node >= 22.18 / 23.6).
// Run from the repository root:  node --test frontend/src/lib/mission/errors.test.mjs
import { register } from 'node:module';
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

// The app imports sibling modules without extension ('./errors'); resolve them to '.ts' for Node.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(specifier)) return next(specifier + '.ts', context);
    throw err;
  }
}`));

const {
  parseBackendError, malformedResponse, mapLocation, translateValidationMessage, toBuilderIssues, isSimulationResult,
  clearIssuesForDraftChange, reviewBadgeState, changedDraftKeys, readinessSummary,
} = await import('./errors.ts');
const { ApiHttpError, missionApi } = await import('./api.ts');

// Payloads below are copied from real responses of the NOVA FastAPI backend (POST /api/simulate).
const validation = details => ({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', details } });

describe('parseBackendError: HTTP 422', () => {
  test('one identifiable field', () => {
    const err = parseBackendError(422, validation([{ location: ['body', 'name'], message: 'Field required', type: 'missing' }]));
    assert.equal(err.kind, 'validation');
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.equal(err.title, 'Configuration refusée par le backend');
    assert.match(err.message, /une valeur invalide/);
    assert.equal(err.fieldIssues.length, 1);
    const [issue] = err.fieldIssues;
    assert.equal(issue.field, 'name');
    assert.equal(issue.step, 'mission');
    assert.equal(issue.label, 'Nom de la mission');
    assert.equal(issue.message, 'Valeur manquante.');
    assert.match(issue.hint, /étape « Mission »/);
    assert.ok(err.technical.includes('Message du backend : Request validation failed.'));
    assert.ok(err.technical.includes('body.name : Field required (missing)'));
  });

  test('several fields on different steps', () => {
    const err = parseBackendError(422, validation([
      { location: ['body', 'spacecraft', 'base_mass'], message: 'Input should be a valid number, unable to parse string as a number', type: 'float_parsing' },
      { location: ['body', 'launcher', 'payload_capacity'], message: 'Input should be greater than 0', type: 'greater_than' },
      { location: ['body', 'orbit', 'inclination_deg'], message: 'Input should be less than or equal to 180', type: 'less_than_equal' },
    ]));
    assert.match(err.message, /3 valeurs invalides/);
    assert.deepEqual(err.fieldIssues.map(i => [i.field, i.step, i.label]), [
      ['spacecraft', 'spacecraft', 'Plateforme : masse sèche'],
      ['launcher', 'launcher', "Lanceur : capacité d'emport"],
      ['inclination_deg', 'mission', 'Inclinaison'],
    ]);
    assert.deepEqual(err.fieldIssues.map(i => i.message), [
      'La valeur doit être un nombre.',
      'La valeur doit être strictement supérieure à 0.',
      'La valeur doit être inférieure ou égale à 180.',
    ]);
    // Catalog values cannot be typed: the hint says to choose another element.
    assert.match(err.fieldIssues[0].hint, /catalogue/);
    assert.doesNotMatch(err.fieldIssues[2].hint, /catalogue/);
  });

  test('instrument inside the list maps to the payload step', () => {
    const err = parseBackendError(422, validation([
      { location: ['body', 'instruments', 0, 'utility_score'], message: 'Input should be less than or equal to 100', type: 'less_than_equal' },
      { location: ['body', 'instruments'], message: 'List should have at least 1 item after validation, not 0', type: 'too_short' },
    ]));
    assert.equal(err.fieldIssues[0].label, 'Instrument n° 1 : intérêt scientifique');
    assert.equal(err.fieldIssues[0].step, 'payload');
    assert.equal(err.fieldIssues[1].message, 'La liste doit contenir au moins 1 élément.');
  });

  test('fields that match no Builder field keep step and field empty', () => {
    const err = parseBackendError(422, validation([
      { location: ['body', 9], message: 'JSON decode error', type: 'json_invalid' },
      { location: ['body'], message: 'Field required', type: 'missing' },
    ]));
    assert.deepEqual(err.fieldIssues.map(i => [i.field, i.step]), [[null, null], [null, null]]);
    assert.equal(err.fieldIssues[1].label, 'Requête entière');
    assert.match(err.fieldIssues[0].hint, /Aucune étape/);
    assert.deepEqual(toBuilderIssues(err), []);
  });

  test('unexpected details format: honest message, raw details kept', () => {
    const err = parseBackendError(422, validation('something odd'));
    assert.equal(err.kind, 'validation');
    assert.equal(err.fieldIssues.length, 0);
    assert.match(err.message, /sans indiquer quel champ/);
    assert.ok(err.technical.some(t => t.includes('something odd')));

    const badItems = parseBackendError(422, validation([{ where: 'x' }]));
    assert.equal(badItems.fieldIssues.length, 0);
    assert.ok(badItems.technical.some(t => t.startsWith('Détails : ')));
  });

  test('FastAPI default shape {detail: [{loc, msg, type}]}', () => {
    const err = parseBackendError(422, { detail: [{ loc: ['body', 'duration_days'], msg: 'Input should be greater than or equal to 1', type: 'greater_than_equal' }] });
    assert.equal(err.code, null);
    assert.equal(err.fieldIssues[0].field, 'duration_days');
    assert.equal(err.fieldIssues[0].message, 'La valeur doit être supérieure ou égale à 1.');
  });

  test('unknown Pydantic type keeps the backend wording instead of guessing', () => {
    assert.equal(translateValidationMessage('url_scheme', 'URL scheme should be http'), 'Valeur refusée par le backend : URL scheme should be http');
  });

  test('decimal limits use a French decimal comma', () => {
    assert.equal(translateValidationMessage('less_than_equal', 'Input should be less than or equal to 0.5'), 'La valeur doit être inférieure ou égale à 0,5.');
  });
});

describe('parseBackendError: other statuses', () => {
  const cases = [
    [400, { error: { code: 'INVALID_OPERATION', message: 'Mission configuration is required before a simulation can run.', details: { mission_id: 'x' } } }, 'bad_request'],
    [401, { detail: 'Not authenticated' }, 'forbidden'],
    [403, null, 'forbidden'],
    [404, { error: { code: 'NOT_FOUND', message: 'Not Found', details: null } }, 'not_found'],
    [409, { error: { code: 'CONFLICT', message: 'Conflict', details: null } }, 'conflict'],
    [500, { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.', details: null } }, 'server'],
    [503, { error: { code: 'SIMULATION_ENGINE_UNAVAILABLE', message: 'Simulation engine is unavailable.', details: null } }, 'unavailable'],
    [418, null, 'unexpected'],
  ];
  for (const [status, body, kind] of cases) {
    test(`HTTP ${status} -> ${kind}`, () => {
      const err = parseBackendError(status, body);
      assert.equal(err.kind, kind);
      assert.equal(err.status, status);
      assert.equal(err.fieldIssues.length, 0);
      assert.ok(err.technical[0] === `HTTP ${status}`);
      assert.ok(err.title.length > 0 && err.message.length > 0);
    });
  }

  test('backend message and code are kept for diagnosis', () => {
    const err = parseBackendError(400, cases[0][1]);
    assert.ok(err.technical.includes('Code : INVALID_OPERATION'));
    assert.ok(err.technical.includes('Message du backend : Mission configuration is required before a simulation can run.'));
    assert.ok(err.technical.some(t => t.includes('mission_id')));
  });

  test('a body that is not JSON is reported as such', () => {
    assert.ok(parseBackendError(500, null).technical.includes('Réponse sans contenu JSON.'));
    assert.ok(parseBackendError(502, 'Bad gateway').technical.some(t => t.startsWith('Réponse non reconnue')));
  });
});

describe('helpers', () => {
  test('mapLocation covers every top-level field sent by the Builder', () => {
    const steps = Object.fromEntries(
      ['name', 'destination', 'duration_days', 'difficulty', 'budget_allocated'].map(f => [f, mapLocation(['body', f]).step]),
    );
    assert.deepEqual(steps, { name: 'mission', destination: 'mission', duration_days: 'mission', difficulty: 'mission', budget_allocated: 'mission' });
    assert.deepEqual([mapLocation(['body', 'spacecraft', 'fuel_mass']).field, mapLocation(['body', 'spacecraft', 'fuel_mass']).step], ['fuel_mass', 'spacecraft']);
    assert.equal(mapLocation(['body', 'orbit', 'altitude_km']).field, 'altitude_km');
    assert.equal(mapLocation(['body', 'constructor']).step, null);
  });

  test('toBuilderIssues returns blocking issues for mapped fields only', () => {
    const err = parseBackendError(422, validation([
      { location: ['body', 'budget_allocated'], message: 'Input should be greater than 0', type: 'greater_than' },
      { location: ['body', 'orbit'], message: 'Field required', type: 'missing' },
    ]));
    assert.deepEqual(toBuilderIssues(err), [{
      field: 'budget_allocated', step: 'mission', severity: 'error',
      message: 'Refusé par le backend : La valeur doit être strictement supérieure à 0.',
    }]);
    assert.deepEqual(toBuilderIssues(null), []);
  });

  test('isSimulationResult checks the minimal shape', () => {
    assert.equal(isSimulationResult({ mission_status: 'SUCCESS', score: 97 }), true);
    assert.equal(isSimulationResult({ mission_status: 'INVALID', score: 0 }), true);
    assert.equal(isSimulationResult({ status: 'ok' }), false);
    assert.equal(isSimulationResult(null), false);
    assert.equal(malformedResponse(200, 'x').kind, 'malformed');
  });
});

describe('review badge and selective clearing (SM-C corrections)', () => {
  // Three independent refusals on three steps, plus one issue that matches no Builder field.
  const threeErrors = () => parseBackendError(422, validation([
    { location: ['body', 'budget_allocated'], message: 'Input should be greater than 0', type: 'greater_than' },
    { location: ['body', 'launcher', 'payload_capacity'], message: 'Input should be greater than 0', type: 'greater_than' },
    { location: ['body', 'instruments', 0, 'utility_score'], message: 'Input should be less than or equal to 100', type: 'less_than_equal' },
  ]));
  const withGlobal = () => parseBackendError(422, validation([
    { location: ['body', 'launcher', 'payload_capacity'], message: 'Input should be greater than 0', type: 'greater_than' },
    { location: ['body'], message: 'Input should be a valid dictionary or object to extract fields from', type: 'model_attributes_type' },
  ]));

  test('1. a backend refusal is visible on the review badge, distinct from local states', () => {
    assert.equal(reviewBadgeState(false, null), 'ok');
    assert.equal(reviewBadgeState(true, null), 'idle');
    assert.equal(reviewBadgeState(false, threeErrors()), 'refused');
    assert.equal(reviewBadgeState(false, parseBackendError(400, null)), 'refused');
    assert.equal(reviewBadgeState(false, parseBackendError(500, null)), 'failed');
    assert.equal(reviewBadgeState(false, malformedResponse(200, 'x')), 'failed');
    // Local errors keep priority: the user must fix them first.
    assert.equal(reviewBadgeState(true, threeErrors()), 'idle');
  });

  test('2. three backend errors are reported at the same time', () => {
    const err = threeErrors();
    assert.match(err.message, /3 valeurs invalides/);
    assert.deepEqual(toBuilderIssues(err).map(i => [i.field, i.step]), [
      ['budget_allocated', 'mission'], ['launcher', 'launcher'], ['instruments', 'payload'],
    ]);
  });

  test('3. fixing one field keeps the two independent errors', () => {
    const after = clearIssuesForDraftChange(threeErrors(), ['launcherId']);
    assert.deepEqual(after.fieldIssues.map(i => i.location), ['budget_allocated', 'instruments.0.utility_score']);
    assert.match(after.message, /2 valeurs invalides/);
    assert.equal(after.changedSinceRefusal, 1);
    assert.equal(reviewBadgeState(false, after), 'refused');
    // Technical details of the original answer are kept for diagnosis.
    assert.ok(after.technical.some(t => t.startsWith('body.launcher.payload_capacity')));
  });

  test('3b. only the changed field is cleared, whatever the step', () => {
    let err = threeErrors();
    err = clearIssuesForDraftChange(err, ['name', 'objectives', 'fuel_mass']); // not refused: nothing changes
    assert.equal(err.fieldIssues.length, 3);
    assert.equal(err.changedSinceRefusal, 0);
    err = clearIssuesForDraftChange(err, ['budget_allocated']);
    assert.deepEqual(err.fieldIssues.map(i => i.location), ['launcher.payload_capacity', 'instruments.0.utility_score']);
    err = clearIssuesForDraftChange(err, ['instrumentIds']);
    assert.deepEqual(err.fieldIssues.map(i => i.location), ['launcher.payload_capacity']);
    assert.equal(err.changedSinceRefusal, 2);
    // Last refused value changed: nothing obsolete is left, the badge goes back to the local state.
    assert.equal(clearIssuesForDraftChange(err, ['launcherId']), null);
    assert.equal(reviewBadgeState(false, null), 'ok');
  });

  test('3c. a platform change clears the whole spacecraft block, a fuel change only the fuel', () => {
    const err = parseBackendError(422, validation([
      { location: ['body', 'spacecraft', 'base_mass'], message: 'Input should be greater than 0', type: 'greater_than' },
      { location: ['body', 'spacecraft', 'fuel_mass'], message: 'Input should be greater than or equal to 0', type: 'greater_than_equal' },
    ]));
    assert.deepEqual(clearIssuesForDraftChange(err, ['fuel_mass']).fieldIssues.map(i => i.location), ['spacecraft.base_mass']);
    assert.equal(clearIssuesForDraftChange(err, ['spacecraftId', 'fuel_mass']), null);
  });

  test('4. an issue without identifiable field is never cleared by an edit', () => {
    const after = clearIssuesForDraftChange(withGlobal(), ['launcherId', 'name', 'budget_allocated', 'instrumentIds', 'spacecraftId']);
    assert.deepEqual(after.fieldIssues.map(i => [i.location, i.step]), [['', null]]);
    assert.equal(reviewBadgeState(false, after), 'refused');
    // Whole "orbit" block: no single draft key fixes it reliably, so it stays too.
    const orbit = parseBackendError(422, validation([{ location: ['body', 'orbit'], message: 'Field required', type: 'missing' }]));
    assert.equal(clearIssuesForDraftChange(orbit, ['altitude_km', 'inclination_deg']).fieldIssues.length, 1);
    // Errors without field issues (server error, unreadable answer) stay until the next launch.
    const server = parseBackendError(500, null);
    assert.equal(clearIssuesForDraftChange(server, ['launcherId']), server);
    const noField = parseBackendError(422, validation('odd'));
    assert.equal(clearIssuesForDraftChange(noField, ['name']), noField);
  });

  test('5. clearing never touches the draft data (pure function, input left intact)', () => {
    const err = threeErrors();
    const snapshot = JSON.stringify(err);
    clearIssuesForDraftChange(err, ['launcherId']);
    assert.equal(JSON.stringify(err), snapshot);
  });

  test('6. a new submission starts from the new backend answer only', () => {
    // MissionBuilder.launch() clears the previous error, then stores the new answer as is.
    const second = parseBackendError(422, validation([{ location: ['body', 'budget_allocated'], message: 'Input should be greater than 0', type: 'greater_than' }]));
    assert.equal(second.changedSinceRefusal, 0);
    assert.equal(second.fieldIssues.length, 1);
    assert.equal(reviewBadgeState(false, null), 'ok'); // accepted submission: no backend error left
  });
});

describe('SM-C final corrections: readiness card and real changes only', () => {
  const refusal = () => parseBackendError(422, validation([
    { location: ['body', 'budget_allocated'], message: 'Input should be greater than 0', type: 'greater_than' },
    { location: ['body', 'launcher', 'payload_capacity'], message: 'Input should be greater than 0', type: 'greater_than' },
    { location: ['body', 'instruments', 0, 'utility_score'], message: 'Input should be less than or equal to 100', type: 'less_than_equal' },
  ]));
  const draft = {
    name: 'Lunar Explorer Alpha', objectives: ['A'], destinationId: 'leo', duration_days: 30, difficulty: 'Intermediate',
    budget_allocated: 200, altitude_km: 400, inclination_deg: 28.5, spacecraftId: 'smallsat-explorer', fuel_mass: 200,
    launcherId: 'nova-1', instrumentIds: ['cam-hr'],
  };

  test('A. readiness card: local issues first, then the backend answer', () => {
    assert.deepEqual(readinessSummary(0, null), { state: 'ready', label: 'PRÊT AU LANCEMENT' });
    assert.deepEqual(readinessSummary(2, null), { state: 'blocked', label: '2 problèmes bloquants' });
    assert.deepEqual(readinessSummary(1, refusal()), { state: 'blocked', label: '1 problème bloquant' });
    for (const status of [422, 400]) {
      assert.deepEqual(readinessSummary(0, parseBackendError(status, null)), { state: 'refused', label: 'CONFIGURATION REFUSÉE' });
    }
    for (const status of [500, 503]) {
      assert.deepEqual(readinessSummary(0, parseBackendError(status, null)), { state: 'failed', label: 'SIMULATION NON ABOUTIE' });
    }
    assert.equal(readinessSummary(0, malformedResponse(200, 'x')).state, 'failed');
  });

  test('A. accepted resubmission restores the normal state', () => {
    // launch() stores no backend error when the backend accepts the configuration.
    assert.deepEqual(readinessSummary(0, null), { state: 'ready', label: 'PRÊT AU LANCEMENT' });
  });

  test('B. re-selecting the same launcher, platform or instruments is not a change', () => {
    assert.deepEqual(changedDraftKeys(draft, { launcherId: 'nova-1' }), []);
    assert.deepEqual(changedDraftKeys(draft, { spacecraftId: 'smallsat-explorer', fuel_mass: 200 }), []);
    assert.deepEqual(changedDraftKeys(draft, { instrumentIds: ['cam-hr'] }), []);
    const err = refusal();
    assert.equal(clearIssuesForDraftChange(err, changedDraftKeys(draft, { launcherId: 'nova-1' })), err);
    assert.equal(clearIssuesForDraftChange(err, changedDraftKeys(draft, { instrumentIds: ['cam-hr'] })), err);
  });

  test('B. a different value clears only its own issues', () => {
    const err = refusal();
    const keys = changedDraftKeys(draft, { launcherId: 'falcon-heavy-x' });
    assert.deepEqual(keys, ['launcherId']);
    const after = clearIssuesForDraftChange(err, keys);
    assert.deepEqual(after.fieldIssues.map(i => i.location), ['budget_allocated', 'instruments.0.utility_score']);
    assert.equal(after.changedSinceRefusal, 1);
    // Same platform re-selected, but its default fuel differs from the user's value: only the fuel changed.
    assert.deepEqual(changedDraftKeys(draft, { spacecraftId: 'smallsat-explorer', fuel_mass: 150 }), ['fuel_mass']);
    // Another instrument list (order included) is a change.
    assert.deepEqual(changedDraftKeys(draft, { instrumentIds: ['cam-hr', 'mag'] }), ['instrumentIds']);
    assert.deepEqual(changedDraftKeys(draft, { instrumentIds: [] }), ['instrumentIds']);
  });

  test('B. numbers are compared by value, NaN included', () => {
    assert.deepEqual(changedDraftKeys({ ...draft, altitude_km: NaN }, { altitude_km: NaN }), []);
    assert.deepEqual(changedDraftKeys(draft, { budget_allocated: 200 }), []);
    assert.deepEqual(changedDraftKeys(draft, { budget_allocated: 250 }), ['budget_allocated']);
  });
});

describe('missionApi.simulate with a mocked fetch', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });
  const payload = {
    name: 'Lunar Explorer Alpha', destination: 'Low Earth Orbit', duration_days: 30, difficulty: 'Intermediate', budget_allocated: 200,
    spacecraft: { name: 'SmallSat Explorer', base_mass: 150, fuel_mass: 200, solar_power_generation: 250, base_power_consumption: 50, cost: 50 },
    instruments: [{ name: 'High-Res Optical Camera', mass: 15, cost: 12, power_consumption: 20, utility_score: 85 }],
    launcher: { name: 'Nova-1 Light', payload_capacity: 500, cost: 30 },
    orbit: { altitude_km: 400, inclination_deg: 28.5 },
  };
  const respond = (status, body, contentType = 'application/json') => {
    let sent;
    globalThis.fetch = async (url, init) => {
      sent = { url, init };
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } });
    };
    return () => sent;
  };

  test('success: result returned and payload sent unchanged', async () => {
    const sent = respond(200, { mission_status: 'SUCCESS', score: 97, recommendations: [] });
    const res = await missionApi.simulate(payload);
    assert.equal(res.mission_status, 'SUCCESS');
    assert.equal(sent().init.method, 'POST');
    assert.ok(sent().url.endsWith('/api/simulate'));
    assert.equal(sent().init.body, JSON.stringify(payload));
  });

  test('422 with fields: ApiHttpError carrying the analysed fields', async () => {
    respond(422, validation([{ location: ['body', 'launcher', 'payload_capacity'], message: 'Input should be greater than 0', type: 'greater_than' }]));
    await assert.rejects(missionApi.simulate(payload), err => {
      assert.ok(err instanceof ApiHttpError);
      assert.equal(err.status, 422);
      assert.equal(err.info.fieldIssues[0].step, 'launcher');
      assert.match(err.message, /^Configuration refusée par le backend : /);
      return true;
    });
  });

  test('500 with a non-JSON body: server error, not an offline fallback', async () => {
    respond(500, 'Internal Server Error', 'text/plain');
    await assert.rejects(missionApi.simulate(payload), err => {
      assert.ok(err instanceof ApiHttpError);
      assert.equal(err.info.kind, 'server');
      assert.ok(err.info.technical.includes('Réponse sans contenu JSON.'));
      return true;
    });
  });

  test('200 with a non-JSON body: malformed, never shown as a result', async () => {
    respond(200, '<html>proxy page</html>', 'text/html');
    await assert.rejects(missionApi.simulate(payload), err => err instanceof ApiHttpError && err.info.kind === 'malformed');
  });

  test('200 with an unexpected JSON shape: malformed', async () => {
    respond(200, { status: 'done' });
    await assert.rejects(missionApi.simulate(payload), err => err instanceof ApiHttpError && err.info.kind === 'malformed');
  });

  test('network failure: plain Error (the Builder then shows the offline estimate)', async () => {
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(missionApi.simulate(payload), err => {
      assert.ok(!(err instanceof ApiHttpError));
      assert.match(err.message, /^Impossible de joindre le backend/);
      return true;
    });
  });

  test('timeout: plain Error with the timeout message', async () => {
    globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError'); };
    await assert.rejects(missionApi.simulate(payload), err => !(err instanceof ApiHttpError) && /pas répondu à temps/.test(err.message));
  });
});
