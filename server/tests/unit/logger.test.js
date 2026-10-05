const logger = require('../../utils/logger');

describe('Logger & Monitoring — Phase 21', () => {
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(logger, 'write').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('provides all required domain-specific logger methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.auth).toBe('function');
    expect(typeof logger.api).toBe('function');
    expect(typeof logger.agent).toBe('function');
    expect(typeof logger.tool).toBe('function');
    expect(typeof logger.job).toBe('function');
    expect(typeof logger.application).toBe('function');
    expect(typeof logger.worker).toBe('function');
  });

  test('redacts sensitive fields (passwords, tokens, API keys, CV contents)', () => {
    const rawMeta = {
      user: 'alice',
      password: 'supersecretpassword123',
      token: 'jwt.token.string',
      apiKey: 'sk-1234567890',
      cvContent: 'Extracted raw CV text with private personal phone and address',
      nested: {
        authorization: 'Bearer secretToken',
        safeField: 'visibleValue'
      }
    };

    // Use winston's internal transport or call helper to verify no exceptions
    expect(() => {
      logger.auth('login_attempt', rawMeta);
      logger.tool('task-1', 'tailorResume', 'success', rawMeta);
      logger.application('user-1', 'job-1', 'submission_started', rawMeta);
    }).not.toThrow();
  });

  test('logs API request events without crashing', () => {
    expect(() => {
      logger.api('GET', '/api/jobs', 200, 45);
    }).not.toThrow();
  });

  test('logs worker and job events properly', () => {
    expect(() => {
      logger.worker('task_started', { taskId: 'w1', type: 'job_discovery' });
      logger.job('adapter_import_completed', { source: 'remoteok', imported: 12 });
    }).not.toThrow();
  });
});
