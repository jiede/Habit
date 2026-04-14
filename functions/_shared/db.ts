export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  createSession(session: SessionRecord): Promise<void>;
  findSessionByToken(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}

export function createAuthRepository(): AuthRepository {
  throw new Error("createAuthRepository is not implemented yet");
}
