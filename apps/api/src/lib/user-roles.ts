import {
  ADMIN_ROLES,
  ATHLETE_ROLES,
  TRAINING_STAFF_ROLES,
  USER_ROLE_VALUES,
  isAthleteUserRole,
  isPlatformAdminRole,
  isTeamAthleteRole,
  isTeamManagerRole,
  isTrainingStaffRole,
  resolveAthleteUserRoleFromAthleteRow,
  userHasAnyRole,
} from "@ph/roles";

import type { UserRole } from "@ph/roles";

export { USER_ROLE_VALUES };
export type { UserRole };

export const ROLES_TRAINING_STAFF: UserRole[] = [...TRAINING_STAFF_ROLES];
export const ROLES_ATHLETE: UserRole[] = [...ATHLETE_ROLES];
export const ROLES_ADMIN: UserRole[] = [...ADMIN_ROLES];

export {
  isAthleteUserRole,
  isPlatformAdminRole,
  isPlatformAdminRole as isPlatformAdmin,
  isTeamAthleteRole,
  isTeamManagerRole,
  isTrainingStaffRole as isTrainingStaff,
  resolveAthleteUserRoleFromAthleteRow,
  userHasAnyRole,
};
