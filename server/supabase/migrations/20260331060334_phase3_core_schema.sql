-- Phase 3 additive schema completion for class-operations platform
-- Non-destructive: creates missing objects only.

create extension if not exists pgcrypto;

do $$
begin
	if not exists (select 1 from pg_type where typname = 'user_status') then
		create type public.user_status as enum ('active', 'inactive', 'suspended');
	end if;

	if not exists (select 1 from pg_type where typname = 'role_type') then
		create type public.role_type as enum (
			'super_admin',
			'university_admin',
			'student_organisation',
			'class_rep',
			'student'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'class_rep_request_status') then
		create type public.class_rep_request_status as enum ('pending', 'approved', 'rejected');
	end if;

	if not exists (select 1 from pg_type where typname = 'task_status') then
		create type public.task_status as enum ('draft', 'published', 'closed');
	end if;

	if not exists (select 1 from pg_type where typname = 'proof_type') then
		create type public.proof_type as enum ('text', 'file', 'both');
	end if;

	if not exists (select 1 from pg_type where typname = 'submission_status') then
		create type public.submission_status as enum ('submitted', 'approved', 'rejected');
	end if;

	if not exists (select 1 from pg_type where typname = 'attendance_session_status') then
		create type public.attendance_session_status as enum ('active', 'closed', 'flagged');
	end if;

	if not exists (select 1 from pg_type where typname = 'attendance_record_status') then
		create type public.attendance_record_status as enum ('present', 'absent');
	end if;

	if not exists (select 1 from pg_type where typname = 'announcement_scope') then
		create type public.announcement_scope as enum ('class', 'department', 'university');
	end if;

	if not exists (select 1 from pg_type where typname = 'announcement_priority') then
		create type public.announcement_priority as enum ('low', 'normal', 'high');
	end if;

	if not exists (select 1 from pg_type where typname = 'notification_type') then
		create type public.notification_type as enum (
			'class_rep_request_submitted',
			'class_rep_request_approved',
			'class_rep_request_rejected',
			'task_published',
			'submission_approved',
			'submission_rejected',
			'announcement_published',
			'attendance_session_started'
		);
	end if;
end
$$;

create table if not exists public.universities (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	code text,
	status public.user_status not null default 'active',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint universities_name_unique unique (name),
	constraint universities_code_unique unique (code)
);

create table if not exists public.departments (
	id uuid primary key default gen_random_uuid(),
	university_id uuid not null references public.universities(id) on delete cascade,
	name text not null,
	code text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint departments_unique_per_university unique (university_id, name)
);

create table if not exists public.classes (
	id uuid primary key default gen_random_uuid(),
	university_id uuid not null references public.universities(id) on delete cascade,
	department_id uuid references public.departments(id) on delete set null,
	name text not null,
	code text,
	created_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint classes_unique_per_university unique (university_id, name),
	constraint classes_code_unique_per_university unique (university_id, code)
);

create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	full_name text,
	avatar_url text,
	status public.user_status not null default 'active',
	university_id uuid references public.universities(id) on delete set null,
	class_id uuid references public.classes(id) on delete set null,
	xp integer not null default 0,
	streak_count integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint profiles_xp_non_negative check (xp >= 0),
	constraint profiles_streak_non_negative check (streak_count >= 0)
);

create table if not exists public.user_roles (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	role public.role_type not null,
	university_id uuid references public.universities(id) on delete cascade,
	class_id uuid references public.classes(id) on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint user_roles_scope_check check (
		(role = 'super_admin' and university_id is null and class_id is null) or
		(role in ('university_admin', 'student_organisation') and university_id is not null and class_id is null) or
		(role in ('class_rep', 'student') and university_id is not null and class_id is not null)
	)
);

create table if not exists public.class_rep_requests (
	id uuid primary key default gen_random_uuid(),
	requester_id uuid not null references auth.users(id) on delete cascade,
	university_id uuid not null references public.universities(id) on delete cascade,
	class_id uuid not null references public.classes(id) on delete cascade,
	status public.class_rep_request_status not null default 'pending',
	request_reason text,
	reviewed_by uuid references auth.users(id) on delete set null,
	reviewed_at timestamptz,
	rejection_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
	id uuid primary key default gen_random_uuid(),
	class_id uuid not null references public.classes(id) on delete cascade,
	created_by uuid not null references auth.users(id) on delete restrict,
	title text not null,
	description text,
	due_at timestamptz not null,
	proof_type public.proof_type not null,
	status public.task_status not null default 'draft',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
	id uuid primary key default gen_random_uuid(),
	task_id uuid not null references public.tasks(id) on delete cascade,
	student_id uuid not null references auth.users(id) on delete cascade,
	text_response text,
	file_url text,
	status public.submission_status not null default 'submitted',
	feedback text,
	reviewed_by uuid references auth.users(id) on delete set null,
	reviewed_at timestamptz,
	submitted_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint submissions_proof_required check (
		coalesce(nullif(text_response, ''), '') <> '' or coalesce(nullif(file_url, ''), '') <> ''
	)
);

create table if not exists public.attendance_sessions (
	id uuid primary key default gen_random_uuid(),
	class_id uuid not null references public.classes(id) on delete cascade,
	started_by uuid not null references auth.users(id) on delete restrict,
	starts_at timestamptz not null,
	ends_at timestamptz not null,
	status public.attendance_session_status not null default 'active',
	suspicious boolean not null default false,
	suspicion_reason text,
	verification_photo_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint attendance_session_time_check check (ends_at > starts_at)
);

create table if not exists public.attendance_records (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.attendance_sessions(id) on delete cascade,
	student_id uuid not null references auth.users(id) on delete cascade,
	status public.attendance_record_status not null default 'present',
	marked_at timestamptz not null default now(),
	verification_photo_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
	id uuid primary key default gen_random_uuid(),
	university_id uuid not null references public.universities(id) on delete cascade,
	scope public.announcement_scope not null,
	class_id uuid references public.classes(id) on delete cascade,
	department_id uuid references public.departments(id) on delete cascade,
	title text not null,
	body text not null,
	priority public.announcement_priority not null default 'normal',
	created_by uuid not null references auth.users(id) on delete restrict,
	expires_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint announcements_scope_target_check check (
		(scope = 'class' and class_id is not null and department_id is null) or
		(scope = 'department' and department_id is not null and class_id is null) or
		(scope = 'university' and class_id is null and department_id is null)
	)
);

create table if not exists public.xp_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	source text not null,
	points integer not null,
	source_ref_id uuid,
	created_at timestamptz not null default now(),
	constraint xp_events_points_nonzero check (points <> 0)
);

create table if not exists public.streak_logs (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	activity_date date not null,
	source text not null,
	created_at timestamptz not null default now(),
	constraint streak_logs_unique_day_per_source unique (user_id, activity_date, source)
);

create table if not exists public.notifications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	type public.notification_type not null,
	title text not null,
	body text,
	data jsonb,
	is_read boolean not null default false,
	read_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index if not exists user_roles_unique_global_role
	on public.user_roles (user_id, role)
	where university_id is null and class_id is null;

create unique index if not exists user_roles_unique_university_role
	on public.user_roles (user_id, role, university_id)
	where university_id is not null and class_id is null;

create unique index if not exists user_roles_unique_class_role
	on public.user_roles (user_id, role, class_id)
	where class_id is not null;

create index if not exists profiles_university_idx on public.profiles(university_id);
create index if not exists profiles_class_idx on public.profiles(class_id);
create index if not exists departments_university_idx on public.departments(university_id);
create index if not exists classes_university_idx on public.classes(university_id);
create index if not exists classes_department_idx on public.classes(department_id);
create index if not exists user_roles_user_idx on public.user_roles(user_id);
create index if not exists user_roles_role_idx on public.user_roles(role);
create index if not exists user_roles_university_idx on public.user_roles(university_id);
create index if not exists user_roles_class_idx on public.user_roles(class_id);

create unique index if not exists class_rep_requests_pending_unique
	on public.class_rep_requests (requester_id, class_id)
	where status = 'pending';
create index if not exists class_rep_requests_university_idx on public.class_rep_requests(university_id, status);
create index if not exists class_rep_requests_class_idx on public.class_rep_requests(class_id, status);

create index if not exists tasks_class_due_idx on public.tasks(class_id, due_at);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_created_by_idx on public.tasks(created_by);

create unique index if not exists submissions_task_student_unique on public.submissions(task_id, student_id);
create index if not exists submissions_task_idx on public.submissions(task_id);
create index if not exists submissions_student_idx on public.submissions(student_id);
create index if not exists submissions_status_idx on public.submissions(status);

create index if not exists attendance_sessions_class_status_time_idx
	on public.attendance_sessions(class_id, status, starts_at, ends_at);
create index if not exists attendance_records_session_student_idx on public.attendance_records(session_id, student_id);
create unique index if not exists attendance_records_unique_per_session
	on public.attendance_records(session_id, student_id);

create index if not exists announcements_scope_target_idx
	on public.announcements(scope, university_id, class_id, department_id, created_at desc);
create index if not exists announcements_expires_idx on public.announcements(expires_at);

create index if not exists xp_events_user_created_idx on public.xp_events(user_id, created_at desc);
create index if not exists streak_logs_user_date_idx on public.streak_logs(user_id, activity_date desc);

create index if not exists notifications_user_unread_idx
	on public.notifications(user_id, is_read, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists set_updated_at_universities on public.universities;
create trigger set_updated_at_universities
before update on public.universities
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_departments on public.departments;
create trigger set_updated_at_departments
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_classes on public.classes;
create trigger set_updated_at_classes
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_roles on public.user_roles;
create trigger set_updated_at_user_roles
before update on public.user_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_class_rep_requests on public.class_rep_requests;
create trigger set_updated_at_class_rep_requests
before update on public.class_rep_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_tasks on public.tasks;
create trigger set_updated_at_tasks
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_submissions on public.submissions;
create trigger set_updated_at_submissions
before update on public.submissions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_attendance_sessions on public.attendance_sessions;
create trigger set_updated_at_attendance_sessions
before update on public.attendance_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_attendance_records on public.attendance_records;
create trigger set_updated_at_attendance_records
before update on public.attendance_records
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_announcements on public.announcements;
create trigger set_updated_at_announcements
before update on public.announcements
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_notifications on public.notifications;
create trigger set_updated_at_notifications
before update on public.notifications
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

insert into storage.buckets (id, name, public)
select 'submission-files', 'submission-files', false
where not exists (select 1 from storage.buckets where id = 'submission-files');

insert into storage.buckets (id, name, public)
select 'attendance-verification', 'attendance-verification', false
where not exists (select 1 from storage.buckets where id = 'attendance-verification');
