import type { NextFunction, Request, Response } from "express";
import type { RoleType } from "../types/domain";
import { unauthenticated, unauthorized } from "../utils/errors";

export function requireRole(allowed: RoleType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthenticated());

    const hasRole = req.auth.roles.some((r) => allowed.includes(r.role));
    if (!hasRole) return next(unauthorized());

    next();
  };
}
