import { Request, Response, NextFunction } from 'express';
import { setRequestContext } from '@config/request-context';
import { UnauthorizedError } from '@errors/app-error';
import JWTService from '@services/jwt.service';

/**
 * Authentication middleware to validate JWT tokens
 * This is correctly a middleware (not a service/utility) as it handles HTTP concerns
 */
export default class Auth {
  private readonly jwtService: typeof JWTService;

  constructor() {
    this.jwtService = JWTService;
  }

  /**
   * Middleware to check if user is authenticated
   * Validates JWT token from authorization header and attaches user payload to request
   */
  public checkAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization;

    if (!token) {
      return next(new UnauthorizedError('Authentication token is required'));
    }

    try {
      // Validate token and get user payload
      const userPayload = this.jwtService.validateToken(token);

      // Attach user payload to request for use in controllers
      req.user = userPayload;

      // From here on, every log line in this request carries the userId
      setRequestContext({ userId: userPayload.id });

      return next();
    } catch {
      // Return 401 so the frontend interceptor can trigger token refresh
      return next(new UnauthorizedError('Token authentication failed'));
    }
  };
}
