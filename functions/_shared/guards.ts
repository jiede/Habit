export interface AuthUser {
  id: string;
  email: string;
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function requireUser<TUser extends AuthUser | null | undefined>(
  user: TUser
): AuthUser {
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  return user;
}
