/**
 * DI Container Tokens
 * Used to identify services in the container
 */
export const TOKENS = {
  // Auth
  AuthService: Symbol.for("AuthService"),

  // API
  ApiClient: Symbol.for("ApiClient"),

  // Feature Services
  ProjectsService: Symbol.for("ProjectsService"),
  SessionsService: Symbol.for("SessionsService"),
  CollectorsService: Symbol.for("CollectorsService"),
  ActivityService: Symbol.for("ActivityService"),
  ConfigurationService: Symbol.for("ConfigurationService"),
  ModelsService: Symbol.for("ModelsService"),
} as const;

export type TokenKey = keyof typeof TOKENS;
