import { apiGet, apiPost } from "./api";

export interface SessionUser {
  id: string;
  email: string;
}

interface Credentials {
  email: string;
  password: string;
}

export function getMe(): Promise<SessionUser> {
  return apiGet<SessionUser>("/api/auth/me");
}

export function login(credentials: Credentials): Promise<SessionUser> {
  return apiPost<SessionUser>("/api/auth/login", credentials);
}

export function register(credentials: Credentials): Promise<SessionUser> {
  return apiPost<SessionUser>("/api/auth/register", credentials);
}

export function logout(): Promise<void> {
  return apiPost<void>("/api/auth/logout");
}
