// Unified incident-ticketing enums shared by QA / RA / Maintenance.
// Controls no longer participates in incident ticketing (owner direction);
// the CONTROLS department was removed from this enum.
export enum IncidentDepartment {
  QA = 'QA',
  RA = 'RA',
  MAINTENANCE = 'MAINTENANCE',
}
export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
export enum IncidentStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
