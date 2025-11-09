/**
 * Mock for MagicMirror logger
 * Used in testing environment
 */

module.exports = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};
