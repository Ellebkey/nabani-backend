import { Request, Response, NextFunction } from 'express';
import { validateDto } from '@utils/validation.util';
import { requireSelf } from '@utils/user-context.util';
import UserService from '@services/user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
  UserConfigDto,
  SetDefaultAccountDto,
} from '@interfaces/user.dto';
import { EntityUuidParamsDto } from '@interfaces/base.dto';

/**
 * Controller for managing users
 * Handles HTTP requests and delegates business logic to services
 */
class UserController {
  private userService: typeof UserService;

  constructor() {
    this.userService = UserService;
  }

  /**
   * Creates a new user (admin only)
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const dto = validateDto<CreateUserDto>('createUser', req.body);
      const user = await this.userService.create(dto);

      return res.status(201).json(user);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Updates an existing user (self only)
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      requireSelf(req.user, id);
      const dto = validateDto<UpdateUserDto>('updateUser', req.body);
      const user = await this.userService.update(id, dto);

      return res.json(user);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Retrieves a user by ID (self only)
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      requireSelf(req.user, id);
      const user = await this.userService.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      return res.json(user);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Lists users with optional filtering (admin only)
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = validateDto<UserFilterDto>('userFilter', req.query);
      const result = await this.userService.findAll(filters);

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Updates user configuration (self only)
   */
  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id: userId } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      requireSelf(req.user, userId);
      const configData = validateDto<UserConfigDto>('userConfig', req.body);
      const updatedConfig = await this.userService.updateUserConfig(userId, configData);

      return res.json(updatedConfig);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Retrieves user configuration (self only)
   */
  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id: userId } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      requireSelf(req.user, userId);
      const config = await this.userService.getUserConfig(userId);

      return res.json(config);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Sets the default account for a user (self only)
   */
  setDefaultAccount = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id: userId } = validateDto<EntityUuidParamsDto>('entityUuid', req.params);
      requireSelf(req.user, userId);
      const { accountId } = validateDto<SetDefaultAccountDto>('setDefaultAccount', req.body);
      await this.userService.setDefaultAccount(userId, accountId);

      return res.json({
        success: true,
        message: 'Default account set successfully',
      });
    } catch (error) {
      return next(error);
    }
  };
}

// Export singleton instance for use in routes
export default new UserController();
