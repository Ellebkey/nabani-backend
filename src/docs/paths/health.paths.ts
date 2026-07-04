/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API health and status monitoring endpoints
 */

/**
 * @swagger
 * /health-check:
 *   get:
 *     summary: Check API health status
 *     tags: [Health]
 *     description: Returns a simple OK response to verify the API is running and accessible
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 *       500:
 *         description: API is experiencing issues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
