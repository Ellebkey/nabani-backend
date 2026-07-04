/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: User's email or username
 *           example: hello@joelbarranco.io
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *           example: mySecurePassword123
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: a15c3e5b-8a7b-48a7-81be-029c05808154
 *             username:
 *               type: string
 *               example: hello@joelbarranco.io
 *             roles:
 *               type: string
 *               example: admin
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: 2023-01-15T10:30:00.000Z
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: 2023-01-15T10:30:00.000Z
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - confirmPassword
 *       properties:
 *         username:
 *           type: string
 *           description: User's email or username
 *           example: newuser@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password (minimum 8 characters)
 *           example: mySecurePassword123
 *         confirmPassword:
 *           type: string
 *           format: password
 *           description: Confirmation of the password
 *           example: mySecurePassword123
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: Doe
 *
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: User registered successfully
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: a15c3e5b-8a7b-48a7-81be-029c05808154
 *             username:
 *               type: string
 *               example: newuser@example.com
 *             roles:
 *               type: string
 *               example: user
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: 2023-01-15T10:30:00.000Z
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *         - confirmNewPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           description: Current password
 *           example: oldPassword123
 *         newPassword:
 *           type: string
 *           format: password
 *           description: New password (minimum 8 characters)
 *           example: newPassword123
 *         confirmNewPassword:
 *           type: string
 *           format: password
 *           description: Confirmation of the new password
 *           example: newPassword123
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - newPassword
 *         - confirmNewPassword
 *       properties:
 *         newPassword:
 *           type: string
 *           format: password
 *           description: New password (minimum 8 characters)
 *           example: resetPassword123
 *         confirmNewPassword:
 *           type: string
 *           format: password
 *           description: Confirmation of the new password
 *           example: resetPassword123
 */
