/**
 * Shared between middleware.ts (which reads the cookie) and app/preview/route.ts
 * (which sets it). A route file may only export HTTP handlers, so the name
 * cannot live there, and a literal repeated in two files is a rename away from
 * a gate that silently stops gating.
 */
export const PREVIEW_COOKIE = "preview_access";
