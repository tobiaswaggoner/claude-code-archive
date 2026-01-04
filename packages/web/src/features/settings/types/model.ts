export interface ModelPricing {
  prompt: string;
  completion: string;
  request?: string;
  image?: string;
  discount?: number;
}

export interface Model {
  id: string;
  name: string;
  created?: number;
  context_length?: number | null;
  pricing: ModelPricing;
}

export interface ModelsResponse {
  data: Model[];
}
