export const requireUserId = jest.fn((id: string | undefined) => id);
export const requireSelf = jest.fn();
export const requireSelfOrAdmin = jest.fn();
export const requireAdmin = jest.fn();
