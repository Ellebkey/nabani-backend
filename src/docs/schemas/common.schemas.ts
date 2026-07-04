/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: Error code identifier
 *               example: VALIDATION_ERROR
 *             message:
 *               type: string
 *               description: Human-readable error message
 *               example: Validation failed
 *             status:
 *               type: integer
 *               description: HTTP status code
 *               example: 400
 *             details:
 *               type: object
 *               description: Additional error details (optional)
 *               example:
 *                 field: username
 *                 value: ""
 *                 constraint: "Username is required"
 *
 *     ValidationErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: VALIDATION_ERROR
 *             message:
 *               type: string
 *               example: Validation failed
 *             status:
 *               type: integer
 *               example: 400
 *             details:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   field:
 *                     type: string
 *                     example: username
 *                   message:
 *                     type: string
 *                     example: Username is required
 *
 *     NotFoundErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: RESOURCE_NOT_FOUND
 *             message:
 *               type: string
 *               example: Article with ID 999 not found
 *             status:
 *               type: integer
 *               example: 404
 *
 *     UnauthorizedErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: UNAUTHORIZED
 *             message:
 *               type: string
 *               example: Invalid or missing authentication token
 *             status:
 *               type: integer
 *               example: 401
 *
 *     ConflictErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: CONFLICT
 *             message:
 *               type: string
 *               example: A record with username 'hello@joelbarranco.io' already exists
 *             status:
 *               type: integer
 *               example: 409
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         offset:
 *           type: integer
 *           description: Number of records skipped
 *           example: 0
 *         limit:
 *           type: integer
 *           description: Number of records per page
 *           example: 50
 *         total:
 *           type: integer
 *           description: Total number of records available
 *           example: 150
 *         hasMore:
 *           type: boolean
 *           description: Whether there are more records available
 *           example: true
 *
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         rows:
 *           type: array
 *           description: Array of result items
 *           items:
 *             type: object
 *         count:
 *           type: integer
 *           description: Total number of items matching the query
 *           example: 150
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *
 *     SuccessMessage:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: Operation completed successfully
 *
 *     SuccessWithId:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: Resource created successfully
 *         id:
 *           oneOf:
 *             - type: string
 *               format: uuid
 *               example: a15c3e5b-8a7b-48a7-81be-029c05808154
 *             - type: integer
 *               example: 12345
 *           description: ID of the created/updated resource
 *
 *     SuccessWithCount:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *           example: Records processed successfully
 *         count:
 *           type: integer
 *           description: Number of records affected
 *           example: 5
 */
