import type { RoleType } from "../types/domain";
import { unauthorized } from "../utils/errors";

export function hasRoleInUniversity(
  roles: Array<{ role: RoleType; university_id: string | null; class_id: string | null }>,
  allowedRoles: RoleType[],
  universityId: string,
) {
  return roles.some(
    (r) =>
      allowedRoles.includes(r.role) &&
      (r.role === "super_admin" || r.university_id === universityId),
  );
}

export function hasRoleInClass(
  roles: Array<{ role: RoleType; university_id: string | null; class_id: string | null }>,
  allowedRoles: RoleType[],
  classId: string,
) {
  return roles.some((r) => allowedRoles.includes(r.role) && (r.role === "super_admin" || r.class_id === classId));
}

export function ensure(condition: boolean, message = "Insufficient scope") {
  if (!condition) throw unauthorized(message);
}
