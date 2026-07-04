const AuthService = {
  login: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
  changePassword: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  logoutWithToken: jest.fn(),
  hashPassword: jest.fn(),
  setDefaultAccount: jest.fn(),
};

export default AuthService;
