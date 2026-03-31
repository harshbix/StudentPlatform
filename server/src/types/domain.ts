export type RoleType =
  | "super_admin"
  | "university_admin"
  | "student_organisation"
  | "class_rep"
  | "student";

export type RoleScope = {
  role: RoleType;
  university_id: string | null;
  class_id: string | null;
};

export type AuthContext = {
  userId: string;
  email?: string;
  profile?: {
    id: string;
    university_id: string | null;
    class_id: string | null;
    status: "active" | "inactive" | "suspended";
    xp: number;
    streak_count: number;
  };
  roles: RoleScope[];
};
