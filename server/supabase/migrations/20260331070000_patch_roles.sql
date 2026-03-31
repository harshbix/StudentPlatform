-- Phase 3 patch: Restrict to exact correct approved naming model
ALTER TYPE public.role_type RENAME VALUE 'super_admin' TO 'platform_admin';
ALTER TYPE public.role_type RENAME VALUE 'class_rep' TO 'class_representative';

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_scope_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_scope_check check (
(role = 'platform_admin' and university_id is null and class_id is null) or
(role in ('university_admin', 'student_organisation') and university_id is not null and class_id is null) or
(role in ('class_representative', 'student') and university_id is not null and class_id is not null)
);
