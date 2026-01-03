import type { ApiClient } from "@/core/api";
import type {
  Session,
  SessionListParams,
  SessionListResponse,
  EntryListParams,
  EntryListResponse,
} from "../types/session";

export class SessionsService {
  constructor(private api: ApiClient) {}

  async list(params?: SessionListParams): Promise<SessionListResponse> {
    return this.api.get<SessionListResponse>("/api/sessions", params);
  }

  async get(id: string): Promise<Session> {
    return this.api.get<Session>(`/api/sessions/${id}`);
  }

  async getEntries(
    sessionId: string,
    params?: EntryListParams
  ): Promise<EntryListResponse> {
    return this.api.get<EntryListResponse>(
      `/api/sessions/${sessionId}/entries`,
      params
    );
  }
}
