import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test";
import { SummarySettingsForm } from "../components/summary-settings-form";
import { TOKENS } from "@/core/di/tokens";
import type { Configuration } from "../types/configuration";
import type { ModelsResponse } from "../types/model";

const mockModelsResponse: ModelsResponse = {
  data: [
    {
      id: "moonshotai/kimi-k2-0905",
      name: "Moonshot Kimi K2",
      pricing: { prompt: "0.000001", completion: "0.000002" },
      context_length: 128000,
    },
    {
      id: "openai/gpt-4o",
      name: "OpenAI GPT-4o",
      pricing: { prompt: "0.000005", completion: "0.000015" },
      context_length: 128000,
    },
  ],
};

const mockConfigs: Configuration[] = [
  {
    id: "1",
    category: "summary",
    key: "prompt_template",
    valueType: "text",
    value: "Test template {{conversation}}",
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    category: "summary",
    key: "model",
    valueType: "text",
    value: "moonshotai/kimi-k2-0905",
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    category: "summary",
    key: "max_tokens",
    valueType: "int",
    value: "1000",
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    category: "summary",
    key: "history_count",
    valueType: "int",
    value: "3",
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "5",
    category: "summary",
    key: "temperature",
    valueType: "text",
    value: "0.3",
    description: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const createMockConfigService = () => ({
  listByCategory: vi.fn().mockResolvedValue(mockConfigs),
  get: vi.fn(),
  update: vi.fn().mockResolvedValue(mockConfigs[0]),
});

const createMockModelsService = () => ({
  list: vi.fn().mockResolvedValue(mockModelsResponse),
});

describe("SummarySettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields when loaded", async () => {
    const mockConfigService = createMockConfigService();
    const mockModelsService = createMockModelsService();
    const diOverrides = new Map<symbol, () => unknown>([
      [TOKENS.ConfigurationService, () => mockConfigService],
      [TOKENS.ModelsService, () => mockModelsService],
    ]);

    render(<SummarySettingsForm />, { diOverrides });

    await waitFor(() => {
      expect(screen.getByLabelText(/prompt template/i)).toBeInTheDocument();
    });

    // Model is now a picker (combobox), so check for the label text
    expect(screen.getByText(/^model$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/history count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument();
  });

  it("populates form with loaded config values", async () => {
    const mockConfigService = createMockConfigService();
    const mockModelsService = createMockModelsService();
    const diOverrides = new Map<symbol, () => unknown>([
      [TOKENS.ConfigurationService, () => mockConfigService],
      [TOKENS.ModelsService, () => mockModelsService],
    ]);

    render(<SummarySettingsForm />, { diOverrides });

    // Wait for form to load and check other fields (model is now a picker)
    await waitFor(() => {
      expect(screen.getByLabelText(/max tokens/i)).toHaveValue(1000);
    });

    expect(screen.getByLabelText(/history count/i)).toHaveValue(3);
    expect(screen.getByLabelText(/temperature/i)).toHaveValue(0.3);
  });

  it("disables save button when no changes", async () => {
    const mockConfigService = createMockConfigService();
    const mockModelsService = createMockModelsService();
    const diOverrides = new Map<symbol, () => unknown>([
      [TOKENS.ConfigurationService, () => mockConfigService],
      [TOKENS.ModelsService, () => mockModelsService],
    ]);

    render(<SummarySettingsForm />, { diOverrides });

    await waitFor(() => {
      expect(screen.getByLabelText(/max tokens/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it("shows loading skeleton while fetching", () => {
    const slowService = {
      listByCategory: vi.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      ),
    };
    const mockModelsService = createMockModelsService();

    const diOverrides = new Map<symbol, () => unknown>([
      [TOKENS.ConfigurationService, () => slowService],
      [TOKENS.ModelsService, () => mockModelsService],
    ]);

    render(<SummarySettingsForm />, { diOverrides });

    // Should show skeletons (no form fields visible yet)
    expect(screen.queryByLabelText(/max tokens/i)).not.toBeInTheDocument();
  });
});
