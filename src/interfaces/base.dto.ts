/**
 * Base filter interface for common pagination and search functionality
 */
export interface BaseFilterDto {
  searchText?: string;
  offset?: number;
  limit?: number;
}

/**
 * Base pagination interface for offset and limit only
 */
export interface PaginationDto {
  offset?: number;
  limit?: number;
}

/**
 * Generic list response interface for paginated results
 */
export interface BaseListDto<T> {
  rows: T[];
  count: number;
}

/**
 * Date range filter interface for filtering by date ranges
 */
export interface DateRangeFilterDto {
  startDate?: string;
  endDate?: string;
}

/**
 * Date range where both bounds are required (validated by the dateRangeFilter schema)
 */
export interface RequiredDateRangeDto {
  startDate: string;
  endDate: string;
}

/**
 * Entity ID params DTO for numeric route params (e.g., /expenses/:id)
 */
export interface EntityIdParamsDto {
  id: number;
}

/**
 * Entity UUID params DTO for UUID route params (e.g., /users/:id)
 */
export interface EntityUuidParamsDto {
  id: string;
}

/**
 * Generic Sequelize where clause type for dynamic query building
 */
export type WhereClause = Record<string | symbol, unknown>;
