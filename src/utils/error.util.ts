/**
 * Renders an unknown catch value for log metadata: Errors keep their
 * name/message, everything else is JSON-serialized.
 */
const errorToString = (error: unknown): string => (
  error instanceof Error ? error.toString() : JSON.stringify(error)
);

export default errorToString;
