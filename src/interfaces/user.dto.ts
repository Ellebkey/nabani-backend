import { BaseFilterDto, BaseListDto } from './base.dto';

// ===== USER DTOs =====
export interface CreateUserDto {
  username: string;
  password: string;
  email: string;
  mobileNumber?: string;
  roles?: string[];
}

export interface UpdateUserDto {
  username?: string;
  fullname?: string | null;
  email?: string;
  mobileNumber?: string;
  roles?: string[];
}

export interface UserDto {
  id: string;
  username: string;
  fullname?: string | null;
  email: string;
  mobileNumber?: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  hashedPassword?: never;
}

export type UserListDto = BaseListDto<UserDto>;

export interface UserFilterDto extends BaseFilterDto {
  role?: string;
}

export interface UserConfigDto {
  defaultAccount?: string;
}

export interface SetDefaultAccountDto {
  accountId: string;
}

export interface UserAttributes {
  id?: string;
  username: string;
  hashedPassword: string;
  email: string;
  mobileNumber: string;
  roles: string[];
}

// ===== AUTH DTOs =====

export interface LoginDto {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  email: string;
  displayName?: string;
  roles?: string[];
}

export interface ChangePasswordDto {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  email: string;
}

export interface ConfirmResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

// ===== JWT DTOs =====
export interface JWTPayload {
  id?: string;
  username: string;
  displayName?: string;
  roles: string[];
}

export interface JWTResponse {
  token: string;
  refreshToken: string;
  roles: string[];
  username: string;
  fullname?: string | null;
  expiresIn: string;
}
