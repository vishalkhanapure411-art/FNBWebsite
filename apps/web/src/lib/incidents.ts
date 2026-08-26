import {
  Role,
  IncidentDepartment,
  TENANT_ADMIN_ROLES,
} from '@omniops/shared';
import type { IncidentStatus } from '@omniops/shared';

// Mirrors the backend incidents.service.ts role→department mapping and
// read-all / write permissions so the UI reflects RLS without hard-coding.
export const INCIDENT_DEPT_BY_ROLE: Partial<Record<Role, IncidentDepartment>> = {
  [Role.QUALITY_AUDITOR]: IncidentDepartment.QA,
  [Role.REVENUE_ASSURANCE]: IncidentDepartment.RA,
  [Role.MAINTENANCE_ASSURANCE]: IncidentDepartment.MAINTENANCE,
  [Role.CONTROLS]: IncidentDepartment.CONTROLS,
};

// Roles that can read across ALL departments (management read-only).
export const INCIDENT_READ_ALL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
];

// Every role that can view the incident console (assurance depts + read-all mgmt).
export const INCIDENT_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  ...Object.keys(INCIDENT_DEPT_BY_ROLE) as unknown as Role[],
  Role.BRAND_MANAGER,
  ...TENANT_ADMIN_ROLES,
];

// Assurance roles (QA/RA/MAINTENANCE/CONTROLS) can create / transition / comment.
export const INCIDENT_WRITE_ROLES: Role[] = [
  ...Object.keys(INCIDENT_DEPT_BY_ROLE) as unknown as Role[],
];

// Human readable labels for the four departments.
export const INCIDENT_DEPARTMENT_LABELS: Record<IncidentDepartment, string> = {
  [IncidentDepartment.QA]: 'Quality',
  [IncidentDepartment.RA]: 'Revenue Assurance',
  [IncidentDepartment.MAINTENANCE]: 'Maintenance',
  [IncidentDepartment.CONTROLS]: 'Controls',
};

// Valid status transitions (must match backend updateStatus allowed map).
export const INCIDENT_NEXT_STATUS: Record<IncidentStatus, string[]> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};
