import type { Request } from "express";
import { unauthenticated } from "./errors";

export function requireAuthContext(req: Request) {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}

export function requireProfile(req: Request) {
  const auth = requireAuthContext(req);
  if (!auth.profile) throw unauthenticated("Profile context is missing");
  return auth.profile;
}
