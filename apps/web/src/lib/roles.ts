import { Role } from '@omniops/shared';

// Human-readable labels for every platform role. Used wherever a role is
// rendered in the UI (dashboard badge, user lists, etc.).
export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Admin',
  [Role.FRANCHISE_OWNER]: 'Franchise Owner',
  [Role.BRAND_MANAGER]: 'Brand Manager',
  [Role.OPERATIONS_MANAGER]: 'Operations Manager',
  [Role.FINANCE_MANAGER]: 'Finance Manager',
  [Role.REVENUE_ASSURANCE]: 'Revenue Assurance',
  [Role.SITE_LEAD]: 'Site Lead',
  [Role.KITCHEN_STAFF]: 'Kitchen Staff',
  [Role.FOH]: 'Front of House',
  [Role.MAINTENANCE_TECH]: 'Maintenance Tech',
  [Role.QUALITY_AUDITOR]: 'Quality Auditor',
  [Role.HR_ADMIN]: 'HR Admin',
  [Role.MARKETING_ADMIN]: 'Marketing Admin',
  [Role.CUSTOMER]: 'Customer',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role.replace(/_/g, ' ');
}
