-- Phase 3 Hardening: Database Integrity & Indices
-- Applied non-destructively but strictly enforcing platform limits

-- 1. ENUM NORMALIZATION & SANITY CHECKS
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE role NOT IN (
            'platform_admin', 
            'university_admin', 
            'student_organisation', 
            'class_representative', 
            'student'
        )
    ) THEN
        RAISE EXCEPTION 'Legacy or invalid role found in user_roles. Cannot proceed with index enforcement until cleaned.';
    END IF;
END $$;

-- 2. DOMAIN INTEGRITY (Missing Unique Constraints)
ALTER TABLE public.submissions 
DROP CONSTRAINT IF EXISTS unique_task_student;
ALTER TABLE public.submissions 
ADD CONSTRAINT unique_task_student UNIQUE (task_id, student_id);

ALTER TABLE public.attendance_records 
DROP CONSTRAINT IF EXISTS unique_session_student;
ALTER TABLE public.attendance_records 
ADD CONSTRAINT unique_session_student UNIQUE (session_id, student_id);

-- 3. ROLE SCOPE UNIQUENESS (Avoid user holding duplicate identical role grants)
-- Using precise partial indexes to avoid COALESCE null-masking collisions
DROP INDEX IF EXISTS idx_user_roles_unique_grant;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_platform_admin 
    ON public.user_roles (user_id, role) WHERE role = 'platform_admin';
    
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_uni_admin 
    ON public.user_roles (user_id, role, university_id) WHERE role IN ('university_admin', 'student_organisation');
    
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_class_role 
    ON public.user_roles (user_id, role, university_id, class_id) WHERE role IN ('class_representative', 'student');

-- 4. PERFORMANCE & SCOPING INDEXES
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_uni_class ON public.user_roles(university_id, class_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_fast_scope ON public.user_roles(user_id, role, university_id, class_id);

CREATE INDEX IF NOT EXISTS idx_submissions_scope ON public.submissions(task_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);

CREATE INDEX IF NOT EXISTS idx_class_rep_requests_uni ON public.class_rep_requests(university_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_class ON public.tasks(class_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_uni_scope ON public.announcements(university_id, scope);
