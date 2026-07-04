// Jest test setup
jest.mock('@config/logger', () => require('./mocks/logger.mock'));

// Suppress verbose console output during tests, keep error/warn visible for debugging
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Add any global test utilities or configurations here
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});
