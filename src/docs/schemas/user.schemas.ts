/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - mobileNumber
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         username:
 *           type: string
 *           description: Username for authentication
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         mobileNumber:
 *           type: string
 *           description: User's mobile number
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           description: User roles array
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     CreateUserDto:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - email
 *         - mobileNumber
 *       properties:
 *         username:
 *           type: string
 *           description: Username for authentication
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         mobileNumber:
 *           type: string
 *           description: User's mobile number
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           description: User roles array (optional)
 *     UpdateUserDto:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: Username for authentication
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         mobileNumber:
 *           type: string
 *           description: User's mobile number
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           description: User roles array
 *     LoginUserDto:
 *       type: object
 *       required:
 *         - usernameOrEmail
 *         - password
 *       properties:
 *         usernameOrEmail:
 *           type: string
 *           description: Username or email for login
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *     UserAuth:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     UserCreated:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User identifier
 *         displayName:
 *           type: string
 *           description: Display name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         gender:
 *           type: string
 *           description: User's gender (optional)
 *         birthday:
 *           type: string
 *           description: User's birthday (optional)
 *     UserConfig:
 *       type: object
 *       properties:
 *         defaultAccount:
 *           type: string
 *           description: Default account ID for the user
 *     UserFilterDto:
 *       type: object
 *       properties:
 *         searchText:
 *           type: string
 *           description: Text to search in username and email
 *         offset:
 *           type: integer
 *           description: Number of records to skip for pagination
 *         limit:
 *           type: integer
 *           description: Maximum number of records to return
 *         role:
 *           type: string
 *           description: Filter by role
 */
