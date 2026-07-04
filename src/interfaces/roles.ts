/**
 * Nabani access roles. Clinic-wide, role-gated (no per-user ownership scoping).
 * See nabani/planning/00-MASTER-CONTEXT.md §8 for the full RBAC matrix.
 */
export const ROLES = ['admin', 'nutriologa', 'cocina', 'front_desk', 'reparto', 'paciente'] as const;

export type Role = typeof ROLES[number];

/** Roles allowed to see Finanzas + Catálogos (the rest are hidden for nutriologa/cocina/…). */
export const ADMIN_ROLE: Role = 'admin';
