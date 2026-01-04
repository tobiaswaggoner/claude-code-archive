export interface ProjectUpdateInput {
  name?: string;
  description?: string | null;
  upstreamUrl?: string | null;
  archived?: boolean;
}
