const { isSafeUrl } = require('../../utils/security');

describe('isSafeUrl — SSRF protection', () => {
  test('allows valid HTTPS public URL', () => {
    expect(isSafeUrl('https://remoteok.com/api')).toBe(true);
  });

  test('allows valid HTTP public URL', () => {
    expect(isSafeUrl('http://arbeitnow.com/api/job-board-api')).toBe(true);
  });

  test('blocks localhost', () => {
    // force non-dev env
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSafeUrl('http://localhost:8080')).toBe(false);
    process.env.NODE_ENV = origEnv;
  });

  test('blocks 127.0.0.1', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSafeUrl('http://127.0.0.1/secret')).toBe(false);
    process.env.NODE_ENV = origEnv;
  });

  test('blocks private 192.168.x.x', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSafeUrl('http://192.168.1.100/admin')).toBe(false);
    process.env.NODE_ENV = origEnv;
  });

  test('blocks private 10.x.x.x', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSafeUrl('http://10.0.0.5/internal')).toBe(false);
    process.env.NODE_ENV = origEnv;
  });

  test('blocks non-http protocol (file://)', () => {
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  test('blocks non-http protocol (ftp://)', () => {
    expect(isSafeUrl('ftp://ftp.example.com')).toBe(false);
  });

  test('returns false for garbage input', () => {
    expect(isSafeUrl('not-a-url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });

  test('blocks .local domains', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(isSafeUrl('http://internal.local/api')).toBe(false);
    process.env.NODE_ENV = origEnv;
  });
});
