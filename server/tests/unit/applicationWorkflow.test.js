/**
 * Phase 10: Application Workflow Tests
 * Tests the Application model, state machine, and service layer
 */

const { APPLICATION_STATES, STATE_TRANSITIONS } = require('../../models/Application');

// ─── State machine unit tests (no DB required) ───────────────────────────────

describe('Application STATE_TRANSITIONS', () => {
  test('all states are defined in APPLICATION_STATES', () => {
    expect(APPLICATION_STATES).toEqual(expect.arrayContaining([
      'discovered', 'saved', 'preparing', 'ready_for_review',
      'applied', 'interview', 'rejected', 'offer', 'withdrawn'
    ]));
    expect(APPLICATION_STATES).toHaveLength(9);
  });

  test('every state in STATE_TRANSITIONS is a valid APPLICATION_STATE', () => {
    for (const state of Object.keys(STATE_TRANSITIONS)) {
      expect(APPLICATION_STATES).toContain(state);
    }
  });

  test('every transition target is a valid APPLICATION_STATE', () => {
    for (const [, targets] of Object.entries(STATE_TRANSITIONS)) {
      for (const target of targets) {
        expect(APPLICATION_STATES).toContain(target);
      }
    }
  });

  test('terminal states have no outgoing transitions', () => {
    // withdrawn is the only terminal state with no transitions allowed
    expect(STATE_TRANSITIONS['withdrawn']).toEqual([]);
  });

  test('discovered can transition to saved or withdrawn', () => {
    expect(STATE_TRANSITIONS['discovered']).toContain('saved');
    expect(STATE_TRANSITIONS['discovered']).toContain('withdrawn');
  });

  test('applied can transition to interview, rejected, offer, or withdrawn', () => {
    expect(STATE_TRANSITIONS['applied']).toContain('interview');
    expect(STATE_TRANSITIONS['applied']).toContain('rejected');
    expect(STATE_TRANSITIONS['applied']).toContain('offer');
    expect(STATE_TRANSITIONS['applied']).toContain('withdrawn');
  });

  test('ready_for_review requires explicit move to applied (no auto-submit)', () => {
    // The key spec requirement: user must explicitly move to applied
    expect(STATE_TRANSITIONS['ready_for_review']).toContain('applied');
    expect(STATE_TRANSITIONS['ready_for_review']).toContain('preparing'); // can go back
    expect(STATE_TRANSITIONS['ready_for_review']).toContain('withdrawn');
  });

  test('rejected can only move to withdrawn', () => {
    expect(STATE_TRANSITIONS['rejected']).toEqual(['withdrawn']);
  });

  test('offer can only move to withdrawn', () => {
    expect(STATE_TRANSITIONS['offer']).toEqual(['withdrawn']);
  });
});

// ─── transitionTo method tests (mock model instance) ─────────────────────────

function makeApplicationInstance(status) {
  // Minimal mock of a Mongoose document with the transitionTo method
  const Application = require('../../models/Application');
  const app = new Application({
    user: '000000000000000000000001',
    job:  '000000000000000000000002',
    status
  });
  return app;
}

describe('Application.transitionTo()', () => {
  test('valid transition succeeds', () => {
    const app = makeApplicationInstance('discovered');
    const result = app.transitionTo('saved');
    expect(result.ok).toBe(true);
    expect(app.status).toBe('saved');
  });

  test('sets savedAt date when transitioning to saved', () => {
    const app = makeApplicationInstance('discovered');
    app.transitionTo('saved');
    expect(app.savedAt).toBeInstanceOf(Date);
  });

  test('sets appliedAt date when transitioning to applied', () => {
    const app = makeApplicationInstance('ready_for_review');
    app.transitionTo('applied');
    expect(app.appliedAt).toBeInstanceOf(Date);
  });

  test('invalid transition returns error', () => {
    const app = makeApplicationInstance('discovered');
    const result = app.transitionTo('applied'); // can't jump from discovered → applied
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot transition from/);
    expect(app.status).toBe('discovered'); // status unchanged
  });

  test('no transition from withdrawn', () => {
    const app = makeApplicationInstance('withdrawn');
    const result = app.transitionTo('saved');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Cannot transition from/);
  });

  test('logs entry is added on valid transition', () => {
    const app = makeApplicationInstance('saved');
    const initialLogCount = app.logs.length;
    app.transitionTo('preparing', 'Started working on my resume');
    expect(app.logs.length).toBe(initialLogCount + 1);
    expect(app.logs[app.logs.length - 1].message).toBe('Started working on my resume');
    expect(app.logs[app.logs.length - 1].fromStatus).toBe('saved');
    expect(app.logs[app.logs.length - 1].toStatus).toBe('preparing');
  });

  test('duplicate date field is not overwritten on second transition', () => {
    const app = makeApplicationInstance('saved');
    app.transitionTo('preparing');
    const firstPreparingAt = app.preparingAt;
    app.status = 'saved'; // manually reset for test
    app.transitionTo('preparing');
    expect(app.preparingAt).toEqual(firstPreparingAt); // not overwritten
  });

  test('does not auto-skip ready_for_review to applied', () => {
    const app = makeApplicationInstance('preparing');
    app.transitionTo('ready_for_review');
    // Must still be at ready_for_review — not auto-applied
    expect(app.status).toBe('ready_for_review');
  });
});

// ─── Application service unit tests ──────────────────────────────────────────

describe('applicationService.addNote()', () => {
  const appService = require('../../services/applicationService');

  test('rejects empty notes', async () => {
    await expect(appService.addNote('uid', 'aid', '')).rejects.toThrow('non-empty string');
    await expect(appService.addNote('uid', 'aid', '   ')).rejects.toThrow('non-empty string');
    await expect(appService.addNote('uid', 'aid', null)).rejects.toThrow('non-empty string');
  });
});

describe('applicationService.getApplicationStats()', () => {
  test('function is exported', () => {
    const appService = require('../../services/applicationService');
    expect(typeof appService.getApplicationStats).toBe('function');
  });
});

describe('applicationService API exports', () => {
  const appService = require('../../services/applicationService');

  const EXPECTED_EXPORTS = [
    'getApplications', 'getApplicationById', 'getApplicationForJob',
    'trackJob', 'updateStatus', 'updateApplication', 'addNote',
    'deleteApplication', 'prepareApplication', 'fillApplication',
    'submitApplication', 'checkStatus', 'getApplicationStats'
  ];

  test.each(EXPECTED_EXPORTS)('exports %s', (fn) => {
    expect(typeof appService[fn]).toBe('function');
  });
});
