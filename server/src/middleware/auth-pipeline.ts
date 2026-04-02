import type { Request, Response, NextFunction, RequestHandler } from "express";
import { notFound, unauthorized, unauthenticated } from "../utils/errors";
import { supabaseAdmin } from "../config/supabase";
import type { RoleType } from "../types/domain";

// 1. Authentication is currently handled by `requireAuth` in auth.ts
// It validates the token and injects req.auth.roles

// 2. Role Verification
export function requireRole(allowedRoles: RoleType[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roles = req.auth?.roles || [];
    if (roles.some((r) => r.role === "platform_admin")) return next();

    const hasRole = roles.some((r) => allowedRoles.includes(r.role));
    if (!hasRole) return next(unauthorized("Insufficient role"));
    next();
  };
}

// 3. Scope Verification
// Supports parameter-based target lookup (e.g. university_id from params/body/query)
// OR derived scope (verifies they just have the role *at some* scoped level)
export function requireScope(level: "university" | "class", paramKey?: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roles = req.auth?.roles || [];
    if (roles.some((r) => r.role === "platform_admin")) return next();

    let targetId: string | undefined;
    if (paramKey) {
      targetId = (req.params[paramKey] || req.body[paramKey] || req.query[paramKey]) as string;
      if (!targetId) return next(unauthorized(`Missing structural scope parameter: ${paramKey}`));
    }

    const hasScope = roles.some((r) => {
      if (level === "university") {
        if (targetId) return r.university_id === targetId;
        return r.university_id != null;
      } else if (level === "class") {
        if (targetId) return r.class_id === targetId;
        return r.class_id != null;
      }
      return false;
    });

    if (!hasScope) return next(unauthorized(`Insufficient ${level} scope`));
    next();
  };
}

// 4. Resource Boundary / Access
export function requireResourceAccess(
  tableName: string,
  options: {
    ownerColumn?: string;
    classColumn?: string;
    universityColumn?: string;
    paramKey?: string;
    selectQuery?: string;
  },
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const paramKey = options.paramKey || "id";
      const targetId = req.params[paramKey] || req.body[paramKey] || req.query[paramKey];
      if (!targetId) return next(unauthorized("Resource lookup ID missing"));

      // Standardize query to fetch everything required for boundary check
      const { data: resource, error } = await supabaseAdmin
        .from(tableName)
        .select(options.selectQuery || "*")
        .eq("id", targetId)
        .single();

      if (error || !resource) return next(notFound("Resource not found"));

      // Inject resource so controllers don't duplicate the query
      req.resource = resource;

      const roles = req.auth?.roles || [];
      // Platform Admins can access any resource
      if (roles.some((r) => r.role === "platform_admin")) return next();

      const userId = req.auth?.userId;
      if (!userId) return next(unauthenticated("Not authenticated"));

      // Match 1: Direct Ownership 
      if (options.ownerColumn && (resource as any)[options.ownerColumn] === userId) {
        return next();
      }

      // Helper to resolve nested column like "tasks.class_id"
      const resolveColumn = (obj: any, path: string) => {
        return path.split('.').reduce((o, i) => {
           if (o === undefined || o === null) return undefined;
           if (Array.isArray(o)) return o[0]?.[i];
           return o[i];
        }, obj);
      };

      // Match 2: Class Scope Authority
      if (options.classColumn) {
        const classId = resolveColumn(resource, options.classColumn);
        if (classId && roles.some((r) => r.class_id === classId)) {
          return next();
        }
      }

      // Match 3: University Scope Authority
      if (options.universityColumn) {
        const uniId = resolveColumn(resource, options.universityColumn);
        if (uniId && roles.some((r) => r.university_id === uniId)) {
          return next();
        }
      }

      return next(unauthorized("Unauthorized to access this resource boundary"));
    } catch (err) {
      next(err);
    }
  };
}