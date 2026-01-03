export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface Session {
  user: User;
  expiresAt: Date;
}

export interface AuthService {
  /**
   * Sign in with email and password
   */
  signIn(email: string, password: string): Promise<{ error?: string }>;

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;

  /**
   * Get the current session (if authenticated)
   */
  getSession(): Promise<Session | null>;
}

export interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}
