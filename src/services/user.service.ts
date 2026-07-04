import { Transaction, Op } from 'sequelize';
import { db } from '@config/sequelize';
import { logger } from '@config/logger';
import { redisClient } from '@config/redis-config';
import { NotFoundError, InternalServerError } from '@errors/app-error';
import withTransaction from '@utils/transaction.util';
import { UserInstance } from '@models/user.model';
import { WhereClause } from '@interfaces/base.dto';
import {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
  UserListDto,
  UserConfigDto,
} from '@interfaces/user.dto';

class UserService {
  /**
   * Creates a new user in the system
   * @param dto - The data transfer object containing user creation details
   * @returns Promise resolving to the created user DTO
   * @throws Error if user with same email/username already exists
   */
  create = async (dto: CreateUserDto): Promise<UserDto> =>
    withTransaction(async (transaction: Transaction) => {
      const user = await db.User.create({
        username: dto.username,
        hashedPassword: dto.password, // Will be hashed in auth service
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        roles: dto.roles || ['user'],
      }, { transaction });

      logger.info('User created', { userId: user.id });

      return this.toUserDto(user);
    });

  /**
   * Updates an existing user
   * @param id - The unique identifier of the user to update
   * @param dto - The data transfer object containing fields to update
   * @returns Promise resolving to the updated user DTO
   * @throws Error if user is not found
   */
  update = async (id: string, dto: UpdateUserDto): Promise<UserDto> =>
    withTransaction(async (transaction) => {
      const [updatedCount, [updatedUser]] = await db.User.update(dto, {
        where: { id },
        returning: true,
        transaction,
      });

      if (updatedCount === 0 || !updatedUser) {
        throw new NotFoundError('User', id);
      }

      logger.info('User updated', { userId: id });

      return this.toUserDto(updatedUser);
    });

  /**
   * Deletes a user from the system
   * @param id - The unique identifier of the user to delete
   * @returns Promise resolving when the deletion is complete
   * @throws Error if user is not found or has dependencies
   */
  delete = async (id: string): Promise<void> =>
    withTransaction(async (transaction) => {
      // Delete user config first
      await db.UserConfig.destroy({
        where: { userId: id },
        transaction,
      });

      const deletedCount = await db.User.destroy({
        where: { id },
        transaction,
      });

      if (deletedCount === 0) {
        throw new NotFoundError('User', id);
      }

      // Clear Redis cache
      const defaultAccountKey = `default_account_${id}`;
      await redisClient.del(defaultAccountKey);

      logger.info('User deleted', { userId: id });
    });

  /**
   * Retrieves a user by its unique identifier.
   * @param id - The unique identifier of the user
   * @returns Promise resolving to the user DTO, or null if not found
   */
  findById = async (id: string): Promise<UserDto | null> => {
    try {
      const user = await db.User.findByPk(id, {
        attributes: ['id', 'displayName', 'username', 'email', 'roles', 'createdAt', 'updatedAt'],
      });

      return user ? this.toUserDto(user) : null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Error finding user by id: ${id}`, error);
      throw new InternalServerError('Failed to fetch user');
    }
  };

  /**
   * Retrieves a paginated list of users based on filter criteria
   * @param filters - Filter parameters including search text, pagination, and role filters
   * @returns Promise resolving to a list of users with total count
   */
  findAll = async (filters: UserFilterDto = {}): Promise<UserListDto> => {
    try {
      const { searchText, offset = 0, limit = 50, role } = filters;
      const where: WhereClause = {};

      if (searchText) {
        where[Op.or] = [
          { username: { [Op.iLike]: `%${searchText}%` } },
          { email: { [Op.iLike]: `%${searchText}%` } },
        ];
      }

      if (role) {
        where.roles = { [Op.contains]: [role] };
      }

      const { count, rows } = await db.User.findAndCountAll({
        where,
        attributes: ['id', 'username', 'email', 'mobileNumber', 'roles', 'createdAt', 'updatedAt'],
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

      return {
        rows: rows.map((user) => this.toUserDto(user)),
        count: +count,
      };
    } catch (error) {
      logger.error('Error fetching all users', error);
      throw new InternalServerError('Failed to fetch users');
    }
  };

  setDefaultAccount = async (userId: string, accountId: string): Promise<void> => {
    try {
      await withTransaction(async (t) => {
        // Check if user config exists
        const userConfig = await db.UserConfig.findOne({
          where: { userId },
          transaction: t,
        });

        if (userConfig) {
          // Update existing config
          await userConfig.update({ defaultAccount: accountId }, { transaction: t });
        } else {
          // Create new config
          await db.UserConfig.create({
            userId,
            defaultAccount: accountId,
          }, { transaction: t });
        }
      });

      // Update Redis cache
      const defaultAccountKey = `default_account_${userId}`;
      await redisClient.set(defaultAccountKey, accountId);

      logger.info(`Default account set to ${accountId} for user ${userId}`);
    } catch (error) {
      logger.error(`Error setting default account for user ${userId}`, error);
      throw new InternalServerError('Failed to set default account');
    }
  };

  /**
   * Retrieves user configuration by user ID
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to user configuration or default values
   */
  getUserConfig = async (userId: string): Promise<UserConfigDto> => {
    try {
      const userConfig = await db.UserConfig.findOne({
        where: { userId },
      });

      if (!userConfig) {
        // Return default config if none exists
        return {
          defaultAccount: '',
        };
      }

      return {
        defaultAccount: userConfig.defaultAccount || '',
      };
    } catch (error) {
      logger.error(`Error fetching user config for user ${userId}`, error);
      throw new InternalServerError('Failed to fetch user configuration');
    }
  };

  /**
   * Updates user configuration
   * @param userId - The unique identifier of the user
   * @param config - Configuration data to update
   * @returns Promise resolving to the updated configuration
   */
  updateUserConfig = async (userId: string, config: UserConfigDto): Promise<UserConfigDto> => {
    try {
      const updatedConfig = await withTransaction(async (t) => {
        const [userConfig, created] = await db.UserConfig.findOrCreate({
          where: { userId },
          defaults: {
            userId,
            defaultAccount: config.defaultAccount ?? '',
          },
          transaction: t,
        });

        if (!created) {
          await userConfig.update(config, { transaction: t });
        }

        return userConfig;
      });

      // Update Redis if default account changed
      if (config.defaultAccount) {
        const defaultAccountKey = `default_account_${userId}`;
        await redisClient.set(defaultAccountKey, config.defaultAccount);
      }

      logger.info(`User config updated for user ${userId}`);
      return {
        defaultAccount: updatedConfig.defaultAccount || '',
      };
    } catch (error) {
      logger.error(`Error updating user config for user ${userId}`, error);
      throw new InternalServerError('Failed to update user configuration');
    }
  };

  /**
   * Converts database user entity to DTO
   * @param user - Database user entity
   * @returns User DTO
   */
  private toUserDto = (user: UserInstance): UserDto =>
    ({
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      mobileNumber: user.mobileNumber,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
}

export default new UserService();
