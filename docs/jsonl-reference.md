# Claude Code JSONL Format Reference

> Automatisch generierte Dokumentation basierend auf Analyse von 6 Open-Source Projekten und lokalen Daten.

## Quellen

| Repository | Sprache | Besonderheiten |
|------------|---------|----------------|
| [d-kimuson/claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) | TypeScript | **Zod-Schemas**, Agent-Session Handling, am umfangreichsten |
| [daaain/claude-code-log](https://github.com/daaain/claude-code-log) | Python | Pydantic Models, Factory Pattern, dev-docs mit Beispielen |
| [yigitkonur/claude-session-exporter](https://github.com/yigitkonur/claude-session-exporter) | TypeScript | Session Metadata Extraktion, Token Usage Tracking |
| [withLinda/claude-JSONL-browser](https://github.com/withLinda/claude-JSONL-browser) | TypeScript | Tool Input Formatierung, Heredoc Parsing |
| [yuis-ice/claude-code-jsonl-editor](https://github.com/yuis-ice/claude-code-jsonl-editor) | TypeScript | CRUD Operationen, Preact UI |
| [ZeroSumQuant/claude-conversation-extractor](https://github.com/ZeroSumQuant/claude-conversation-extractor) | Python | Export zu Markdown/HTML/JSON |

---

## Verzeichnisstruktur

```
~/.claude/projects/
├── -home-user-project-name/              # Projekt-Verzeichnis (Pfad mit - statt /)
│   ├── {uuid}.jsonl                      # Haupt-Session Dateien
│   ├── agent-{7-char-hex}.jsonl          # Sub-Agent Dateien
│   └── {uuid}/                           # Session-Ordner (optional)
│       └── tool-results/                 # Große Tool-Outputs
│           └── toolu_{id}.json           # Tool-Ergebnis Dateien
```

---

## Datei-Typen

### 1. Session-Dateien (`{uuid}.jsonl`)

- **Pattern**: UUID v4 (z.B. `583f4fa5-2802-4f21-9c83-143f6c770c14.jsonl`)
- **Inhalt**: Vollständige Konversation mit User, Assistant, Tool-Calls
- **Besonderheiten**:
  - Beginnt oft mit `summary` Record
  - Enthält `file-history-snapshot` für Undo-Funktion
  - `isSidechain: false` (normalerweise)

### 2. Agent-Dateien (`agent-{xxx}.jsonl`)

- **Pattern**: `agent-` + 7-stelliger Hex-String (z.B. `agent-a56fb9a.jsonl`)
- **Inhalt**: Sub-Agent/Sidechain Konversationen (Task Tool)
- **Besonderheiten**:
  - `isSidechain: true`
  - `agentId` Feld vorhanden
  - Referenziert Parent-Session via `sessionId`
  - Typischerweise kürzer, fokussiert

### 3. Tool-Results Verzeichnis

- Speichert große Outputs (Screenshots, lange Texte)
- Dateinamen: Tool-Use ID (z.B. `toolu_01UAAbN955FLqvfc1PrNdUeK.json`)

---

## Entry Types (Record-Level `type` Feld)

| Type | Beschreibung |
|------|--------------|
| `user` | User-Nachricht oder Tool-Result |
| `assistant` | Claude-Antwort (Text, Tool-Calls, Thinking) |
| `summary` | Session-Zusammenfassung (am Dateianfang) |
| `system` | System-Nachrichten (Hooks, Warnungen) |
| `file-history-snapshot` | Datei-Backup für Undo |
| `queue-operation` | Queue-Operationen (enqueue, dequeue, remove) |

---

## Content Types (in `message.content` Array)

| Type | Kontext | Felder |
|------|---------|--------|
| `text` | User/Assistant | `text: string` |
| `thinking` | Assistant | `thinking: string`, `signature?: string` |
| `tool_use` | Assistant | `id: string`, `name: string`, `input: object` |
| `tool_result` | User | `tool_use_id: string`, `content: string\|array`, `is_error?: boolean` |
| `image` | User/Assistant | `source: { type: "base64", data: string, media_type: string }` |
| `document` | User | `source: { type: "text"\|"base64", data: string, media_type: string }` |

---

## Vollständige TypeScript Type Definitionen

```typescript
// ============================================================
// ENTRY TYPES (Top-Level Records in JSONL)
// ============================================================

/** Basis-Felder für alle Entry-Typen (außer Summary) */
interface BaseEntry {
  uuid: string;                    // UUID v4
  parentUuid: string | null;       // Verknüpfung zur Parent-Nachricht
  timestamp: string;               // ISO 8601 (z.B. "2026-01-03T10:00:00.000Z")
  sessionId: string;               // Session UUID
  cwd: string;                     // Working Directory
  version: string;                 // Claude Code Version (z.B. "2.0.76")
  isSidechain: boolean;            // true bei Agent-Dateien
  userType: "external";            // Immer "external"

  // Optional
  gitBranch?: string;              // Aktueller Git Branch
  isMeta?: boolean;                // Meta-Nachrichten (Bash Context)
  agentId?: string;                // Nur in Agent-Dateien
  toolUseResult?: unknown;         // Tool-Ergebnis Metadaten
  isCompactSummary?: boolean;      // Kompakte Zusammenfassung
}

/** User Entry */
interface UserEntry extends BaseEntry {
  type: "user";
  message: UserMessage;
}

/** Assistant Entry */
interface AssistantEntry extends BaseEntry {
  type: "assistant";
  message: AssistantMessage;
  requestId?: string;              // API Request ID
  isApiErrorMessage?: boolean;     // API Fehler
}

/** Summary Entry (kein BaseEntry!) */
interface SummaryEntry {
  type: "summary";
  summary: string;                 // Zusammenfassungstext
  leafUuid: string;                // UUID der letzten Nachricht
  cwd?: string;
  sessionId?: null;
}

/** System Entry (mehrere Varianten) */
interface SystemEntry extends BaseEntry {
  type: "system";
  content?: string;
  subtype?: "stop_hook_summary" | "local_command" | "compact_boundary";
  level?: "info" | "warning" | "error" | "suggestion";
  toolUseID?: string;

  // stop_hook_summary spezifisch
  slug?: string;
  hookCount?: number;
  hookInfos?: Array<{ command: string }>;
  hookErrors?: unknown[];
  preventedContinuation?: boolean;
  stopReason?: string;
  hasOutput?: boolean;

  // compact_boundary spezifisch (Konversation wurde komprimiert)
  logicalParentUuid?: string | null;
  compactMetadata?: {
    trigger: string;       // z.B. "manual"
    preTokens: number;     // Token-Anzahl vor Komprimierung
  };
}

/** File History Snapshot Entry */
interface FileHistorySnapshotEntry {
  type: "file-history-snapshot";
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

/** Queue Operation Entry */
interface QueueOperationEntry {
  type: "queue-operation";
  operation: "enqueue" | "dequeue" | "remove" | "popAll";
  timestamp: string;
  sessionId: string;
  content?: string | ContentItem[];
}

// ============================================================
// MESSAGE TYPES
// ============================================================

interface UserMessage {
  role: "user";
  content: string | Array<string | TextContent | ToolResultContent | ImageContent | DocumentContent>;
}

interface AssistantMessage {
  id: string;                      // API Message ID (z.B. "msg_01GSa...")
  type: "message";
  role: "assistant";
  model: string;                   // z.B. "claude-opus-4-5-20251101"
  content: Array<TextContent | ThinkingContent | ToolUseContent>;
  stop_reason: "end_turn" | "tool_use" | null;
  stop_sequence: string | null;
  usage: UsageInfo;
}

// ============================================================
// CONTENT TYPES
// ============================================================

interface TextContent {
  type: "text";
  text: string;
}

interface ThinkingContent {
  type: "thinking";
  thinking: string;
  signature?: string;              // Signatur für Extended Thinking
}

interface ToolUseContent {
  type: "tool_use";
  id: string;                      // Tool-Use ID (z.B. "toolu_01...")
  name: ToolName;
  input: Record<string, unknown>;
}

interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<TextContent | ImageContent>;
  is_error?: boolean;
  agentId?: string;                // Bei Agent-Results
}

interface ImageContent {
  type: "image";
  source: {
    type: "base64";
    data: string;
    media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  };
}

interface DocumentContent {
  type: "document";
  source: {
    type: "text" | "base64";
    data: string;
    media_type: "text/plain" | "application/pdf";
  };
}

// ============================================================
// USAGE & METADATA
// ============================================================

interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
  service_tier?: "standard" | null;
  server_tool_use?: {
    web_search_requests?: number;
  };
}

interface ThinkingMetadata {
  level: "high" | "medium" | "low";
  disabled: boolean;
  triggers: string[];
}

// ============================================================
// TOOL NAMES
// ============================================================

type ToolName =
  // File Operations
  | "Read"
  | "Write"
  | "Edit"
  | "MultiEdit"
  | "Glob"
  | "Grep"
  // Shell
  | "Bash"
  // Web
  | "WebSearch"
  | "WebFetch"
  // Task Management
  | "Task"
  | "TodoWrite"
  // User Interaction
  | "AskUserQuestion"
  | "ExitPlanMode"
  // Notebook
  | "NotebookEdit"
  // MCP Tools (dynamisch)
  | `mcp__${string}`;

// ============================================================
// TOOL INPUT SCHEMAS
// ============================================================

interface BashInput {
  command: string;
  description?: string;
  timeout?: number;
  run_in_background?: boolean;
  dangerouslyDisableSandbox?: boolean;
}

interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

interface WriteInput {
  file_path: string;
  content: string;
}

interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
  replace_all?: boolean;
}

interface MultiEditInput {
  file_path: string;
  edits: Array<{
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }>;
}

interface GlobInput {
  pattern: string;
  path?: string;
}

interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: "content" | "files_with_matches" | "count";
  multiline?: boolean;
  head_limit?: number;
  offset?: number;
  "-i"?: boolean;
  "-n"?: boolean;
  "-A"?: number;
  "-B"?: number;
  "-C"?: number;
}

interface TaskInput {
  prompt: string;
  subagent_type: "Explore" | "general-purpose" | "Plan" | string;
  description: string;
  model?: "sonnet" | "opus" | "haiku";
  run_in_background?: boolean;
  resume?: string;
}

interface TodoWriteInput {
  todos: Array<{
    content: string;
    status: "pending" | "in_progress" | "completed";
    activeForm: string;
  }>;
}

interface WebSearchInput {
  query: string;
  allowed_domains?: string[];
  blocked_domains?: string[];
}

interface WebFetchInput {
  url: string;
  prompt: string;
}

// ============================================================
// UNION TYPES
// ============================================================

type Entry =
  | UserEntry
  | AssistantEntry
  | SummaryEntry
  | SystemEntry
  | FileHistorySnapshotEntry
  | QueueOperationEntry;

type ContentItem =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent
  | ImageContent
  | DocumentContent;
```

---

## Beispiel-Einträge

### Summary Entry
```json
{
  "type": "summary",
  "summary": "User arbeitet an Claude Code Archive Projekt",
  "leafUuid": "4bc8000a-11ef-4104-931b-6f9122672348"
}
```

### User Entry (Text)
```json
{
  "type": "user",
  "uuid": "583f4fa5-2802-4f21-9c83-143f6c770c14",
  "parentUuid": null,
  "timestamp": "2026-01-03T10:00:00.000Z",
  "sessionId": "583f4fa5-2802-4f21-9c83-143f6c770c14",
  "cwd": "/home/user/project",
  "version": "2.0.76",
  "isSidechain": false,
  "userType": "external",
  "gitBranch": "main",
  "message": {
    "role": "user",
    "content": "Analysiere die JSONL Dateien"
  }
}
```

### User Entry (Tool Result)
```json
{
  "type": "user",
  "uuid": "...",
  "message": {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_01ABC...",
        "content": "Dateiinhalt hier..."
      }
    ]
  }
}
```

### Assistant Entry (mit Tool Use)
```json
{
  "type": "assistant",
  "uuid": "...",
  "requestId": "req_01...",
  "message": {
    "id": "msg_01GSa...",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-5-20251101",
    "content": [
      {
        "type": "thinking",
        "thinking": "Ich analysiere die Anfrage...",
        "signature": "Es0ICkYIBRgC..."
      },
      {
        "type": "text",
        "text": "Ich werde die Dateien lesen."
      },
      {
        "type": "tool_use",
        "id": "toolu_01ABC...",
        "name": "Read",
        "input": {
          "file_path": "/home/user/project/data.json"
        }
      }
    ],
    "stop_reason": "tool_use",
    "stop_sequence": null,
    "usage": {
      "input_tokens": 1500,
      "output_tokens": 250,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 500,
      "service_tier": "standard"
    }
  }
}
```

### Agent Entry (Sidechain)
```json
{
  "type": "user",
  "uuid": "...",
  "sessionId": "583f4fa5-...",
  "agentId": "a56fb9a",
  "isSidechain": true,
  "message": {
    "role": "user",
    "content": "[Warmup message]"
  }
}
```

---

## Modelle

Beobachtete Model-IDs:

| Model | Verwendung |
|-------|------------|
| `claude-opus-4-5-20251101` | Haupt-Reasoning |
| `claude-sonnet-4-5-20250929` | Standard |
| `claude-haiku-4-5-20251001` | Explore Subagents, schnelle Antworten |

---

## Unterschiede: Agent vs Session Dateien

| Aspekt | Session (`{uuid}.jsonl`) | Agent (`agent-{xxx}.jsonl`) |
|--------|--------------------------|----------------------------|
| `isSidechain` | `false` | `true` |
| `agentId` | nicht vorhanden | vorhanden (z.B. `"a56fb9a"`) |
| `summary` Records | am Anfang | nicht vorhanden |
| `file-history-snapshot` | vorhanden | nicht vorhanden |
| Größe | KB bis MB | meist < 100KB |
| Inhalt | Vollständige Konversation | Fokussierte Sub-Task |

---

## Parsing-Empfehlungen

1. **Zeilen einzeln parsen**: Jede Zeile ist ein eigenständiges JSON-Objekt
2. **Fehlertoleranz**: Ungültige Zeilen überspringen, nicht abbrechen
3. **Discriminated Union**: `type` Feld für Entry-Typ-Erkennung verwenden
4. **Content flexibel**: `message.content` kann String ODER Array sein
5. **Agent-Files separat laden**: Via `agentId` Referenz aus Haupt-Session
6. **Timestamps**: ISO 8601 Format, immer mit "Z" Suffix

---

## Bekannte Edge Cases

1. **Leere Zeilen**: Müssen gefiltert werden
2. **Escape-Sequenzen**: Content kann doppelt-escaped sein (`\\n` -> `\n`)
3. **Heredoc in Bash**: `$(cat <<'EOF' ... EOF)` Pattern
4. **XML-Tags in User Content**: `<command-name>`, `<bash-input>`, etc.
5. **Große Tool-Results**: Werden in separaten Dateien gespeichert
6. **Meta-Messages**: `isMeta: true` für Bash-Kontext-Nachrichten
