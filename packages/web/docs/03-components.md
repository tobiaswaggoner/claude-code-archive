# UI Components

> Basierend auf shadcn/ui mit Custom Styling

## Basis-Komponenten (shadcn/ui)

Diese installieren wir direkt:

| Component | Verwendung |
|-----------|------------|
| `Button` | Actions, Submit |
| `Input` | Text Input |
| `Select` | Dropdowns |
| `Checkbox` | Boolean Toggles |
| `Dialog` | Modals |
| `DropdownMenu` | Context Menus |
| `Popover` | Tooltips, Popovers |
| `Tabs` | Content Tabs |
| `Table` | Data Tables |
| `Badge` | Status Badges |
| `Skeleton` | Loading States |
| `Toast` | Notifications |
| `ScrollArea` | Custom Scrollbars |
| `Separator` | Dividers |
| `Command` | Command Palette |
| `Sheet` | Mobile Sidebar |

---

## Custom Components

### DataTable

Erweiterte Table mit:

```tsx
<DataTable
  columns={columns}
  data={data}
  // Features
  sortable
  filterable
  pagination={{ pageSize: 50 }}
  selectable
  // Callbacks
  onRowClick={(row) => navigate(`/sessions/${row.id}`)}
  onSelectionChange={(selected) => ...}
  // Loading
  loading={isLoading}
  emptyState={<EmptyState />}
/>
```

#### Column Definition

```tsx
const columns: ColumnDef<Session>[] = [
  {
    id: "project",
    header: "Project",
    accessorFn: (row) => row.projectName,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{row.original.projectName}</span>
      </div>
    ),
    sortable: true,
  },
  {
    id: "time",
    header: "Last Active",
    accessorFn: (row) => row.lastEntryAt,
    cell: ({ row }) => <RelativeTime date={row.original.lastEntryAt} />,
    sortable: true,
  },
  // ...
]
```

---

### StatusBadge

```tsx
<StatusBadge status="success">Synced</StatusBadge>
<StatusBadge status="warning">Dirty</StatusBadge>
<StatusBadge status="error">Failed</StatusBadge>
<StatusBadge status="info">Running</StatusBadge>
<StatusBadge status="neutral">Archived</StatusBadge>
```

#### Styling

| Status | Background | Text |
|--------|------------|------|
| success | green-100/green-900 | green-700/green-300 |
| warning | amber-100/amber-900 | amber-700/amber-300 |
| error | red-100/red-900 | red-700/red-300 |
| info | blue-100/blue-900 | blue-700/blue-300 |
| neutral | zinc-100/zinc-800 | zinc-600/zinc-400 |

---

### KeyValue

Für Detail-Ansichten:

```tsx
<KeyValue>
  <KeyValue.Item label="Session ID" value={session.id} copyable />
  <KeyValue.Item label="Created" value={<RelativeTime date={session.createdAt} />} />
  <KeyValue.Item label="Tokens">
    <span className="font-mono">{formatNumber(session.totalInputTokens)}</span>
    <span className="text-muted-foreground"> in / </span>
    <span className="font-mono">{formatNumber(session.totalOutputTokens)}</span>
    <span className="text-muted-foreground"> out</span>
  </KeyValue.Item>
</KeyValue>
```

#### Layout

```
Label ─────────────────────── Value
Label ─────────────────────── Value
```

- Label: `text-muted-foreground`, right-aligned
- Value: `text-foreground`, left-aligned
- Dotted line connector optional

---

### RelativeTime

```tsx
<RelativeTime date={date} />
// → "2 hours ago"
// → "yesterday"
// → "Jan 3, 2026"

<RelativeTime date={date} tooltip />
// Hover: "January 3, 2026 at 14:32:15"
```

---

### CodeBlock

Für JSONL Entries:

```tsx
<CodeBlock
  language="json"
  code={JSON.stringify(entry.data, null, 2)}
  maxHeight={400}
  copyable
  collapsible
  defaultCollapsed={code.length > 500}
/>
```

#### Features

- Syntax Highlighting (Shiki oder Prism)
- Line Numbers
- Copy Button (top-right)
- Collapse/Expand für lange Blöcke
- Horizontal Scroll, kein Wrap

---

### ConversationView

Für Claude Sessions:

```tsx
<ConversationView
  entries={entries}
  onEntryClick={(entry) => setSelectedEntry(entry)}
  selectedEntryId={selectedEntry?.id}
/>
```

#### Entry Typen

| Type | Darstellung |
|------|-------------|
| `user` | Blauer linker Border, User-Text |
| `assistant` | Orange linker Border, Assistant-Text + Tool Calls |
| `summary` | Grauer Hintergrund, kursiv |
| `system` | Muted, kleiner |

#### Tool Call Darstellung

```
┌──────────────────────────────────────────┐
│ [Icon] Read                              │
│ packages/server/src/routes/projects.ts   │
└──────────────────────────────────────────┘
```

- Expandable für Tool Result
- Icons pro Tool-Typ

---

### GitBranchBadge

```tsx
<GitBranchBadge
  name="main"
  aheadCount={3}
  behindCount={0}
  current
/>
// → [main] ↑3
```

#### States

- `current`: Bold, accent border
- `ahead`: Green arrow up + count
- `behind`: Red arrow down + count
- `diverged`: Both arrows

---

### TokenCounter

```tsx
<TokenCounter input={12345} output={67890} />
// → 12.3K in / 67.9K out

<TokenCounter input={12345} output={67890} cost />
// → 12.3K in / 67.9K out (~$0.42)
```

---

### ModelBadge

```tsx
<ModelBadge model="claude-opus-4-5-20251101" />
// → [Claude Opus 4.5]

<ModelBadge model="claude-sonnet-4-20251101" />
// → [Claude Sonnet 4]
```

---

### SearchInput

Mit Debounce und Clear:

```tsx
<SearchInput
  placeholder="Search projects..."
  value={search}
  onChange={setSearch}
  debounce={300}
/>
```

---

### Pagination

```tsx
<Pagination
  total={1234}
  pageSize={50}
  page={currentPage}
  onPageChange={setPage}
  showTotal
  showPageSize
  pageSizeOptions={[25, 50, 100]}
/>
// → Showing 51-100 of 1,234 | [<] 2 / 25 [>] | 50 per page
```

---

### FilterBar

Kombiniert mehrere Filter:

```tsx
<FilterBar>
  <FilterSelect
    label="Project"
    options={projects}
    value={selectedProject}
    onChange={setSelectedProject}
  />
  <FilterDateRange
    label="Date"
    value={dateRange}
    onChange={setDateRange}
  />
  <FilterToggle
    label="Main sessions only"
    checked={mainOnly}
    onChange={setMainOnly}
  />
  <FilterBar.Clear onClear={clearFilters} />
</FilterBar>
```

---

### Stat

Für Dashboard-Karten:

```tsx
<Stat
  label="Total Sessions"
  value={1234}
  icon={MessageSquare}
  trend={{ value: 12, direction: "up" }}
/>
```

```
+---------------------------+
|  [Icon] Total Sessions    |
|  1,234          ↑ 12%     |
+---------------------------+
```

---

## Patterns

### Inline Edit

```tsx
<InlineEdit
  value={project.name}
  onSave={(newValue) => updateProject({ name: newValue })}
  renderView={(value) => <span className="font-medium">{value}</span>}
/>
// Click to edit, Escape to cancel, Enter to save
```

---

### Confirm Dialog

```tsx
const { confirm } = useConfirmDialog();

await confirm({
  title: "Delete Session?",
  description: "This action cannot be undone.",
  confirmLabel: "Delete",
  variant: "destructive",
});
```

---

### Copy Button

```tsx
<CopyButton value={sessionId} />
// → [Copy Icon] → [Check Icon] (2s) → [Copy Icon]
```

---

## Composition Beispiel

```tsx
// Session List Item
<div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2">
      <span className="font-medium truncate">{session.summary || "No summary"}</span>
      {session.agentCount > 0 && (
        <Badge variant="secondary">{session.agentCount} agents</Badge>
      )}
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{session.projectName}</span>
      <span>•</span>
      <RelativeTime date={session.lastEntryAt} />
      <span>•</span>
      <TokenCounter input={session.totalInputTokens} output={session.totalOutputTokens} />
    </div>
  </div>
  <ChevronRight className="h-4 w-4 text-muted-foreground" />
</div>
```
