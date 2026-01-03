# Layout & Navigation

## App Shell

```
+------------------+----------------------------------------+
|     SIDEBAR      |              MAIN CONTENT              |
|                  |                                        |
|  [Logo/Title]    |  +----------------------------------+  |
|                  |  |  HEADER (Breadcrumb + Actions)   |  |
|  Navigation      |  +----------------------------------+  |
|  - Projects      |  |                                  |  |
|  - Sessions      |  |           PAGE CONTENT           |  |
|  - Git           |  |                                  |  |
|  - Collectors    |  |                                  |  |
|                  |  |                                  |  |
|  ─────────────   |  |                                  |  |
|                  |  +----------------------------------+  |
|  [User/Settings] |                                        |
+------------------+----------------------------------------+
```

---

## Sidebar

### Dimensionen

| State | Width | Beschreibung |
|-------|-------|--------------|
| Expanded | 240px | Volle Labels sichtbar |
| Collapsed | 56px | Nur Icons |
| Mobile | 100% | Overlay Sheet |

### Struktur

```tsx
<Sidebar>
  {/* Logo/Brand - klickbar für Home */}
  <SidebarHeader>
    <Logo />  {/* Im collapsed: nur Icon */}
  </SidebarHeader>

  {/* Main Navigation */}
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Archive</SidebarGroupLabel>
      <SidebarMenuItem icon={FolderOpen} href="/projects">Projects</SidebarMenuItem>
      <SidebarMenuItem icon={MessageSquare} href="/sessions">Sessions</SidebarMenuItem>
    </SidebarGroup>

    <SidebarGroup>
      <SidebarGroupLabel>Git</SidebarGroupLabel>
      <SidebarMenuItem icon={GitBranch} href="/repos">Repositories</SidebarMenuItem>
      <SidebarMenuItem icon={GitCommit} href="/commits">Commits</SidebarMenuItem>
    </SidebarGroup>

    <SidebarGroup>
      <SidebarGroupLabel>System</SidebarGroupLabel>
      <SidebarMenuItem icon={Server} href="/collectors">Collectors</SidebarMenuItem>
    </SidebarGroup>
  </SidebarContent>

  {/* Footer - User, Settings, Theme Toggle */}
  <SidebarFooter>
    <ThemeToggle />
    <UserMenu />
  </SidebarFooter>
</Sidebar>
```

### Collapse Behavior

- **Hotkey**: `[` zum Togglen
- **Hover**: Im collapsed State → Tooltip mit Label
- **Persistent**: State in localStorage speichern
- **Responsive**:
  - < 1024px: Automatisch collapsed
  - < 768px: Mobile Overlay

---

## Page Header

Jede Seite hat einen konsistenten Header:

```
+------------------------------------------------------------------+
| Breadcrumb: Projects > claude-code-archive        [Search] [+New] |
+------------------------------------------------------------------+
```

### Komponenten

```tsx
<PageHeader>
  <Breadcrumb items={[
    { label: "Projects", href: "/projects" },
    { label: "claude-code-archive" }  // Current, not clickable
  ]} />

  <PageHeaderActions>
    <SearchTrigger />  {/* Opens Cmd+K */}
    <Button>Action</Button>
  </PageHeaderActions>
</PageHeader>
```

### Sticky Behavior

- Header bleibt sichtbar beim Scrollen
- Subtle shadow erscheint bei Scroll > 0
- Z-Index: 10

---

## Content Area

### Standard Page Layout

```tsx
<main className="flex-1 overflow-auto">
  <div className="max-w-screen-2xl mx-auto px-4 py-4">
    <PageHeader />

    {/* Content */}
    <div className="space-y-4">
      {children}
    </div>
  </div>
</main>
```

### Content Width

| Screen | Max Width | Padding |
|--------|-----------|---------|
| < 1536px | 100% | 16px |
| >= 1536px | 1536px (centered) | 16px |

---

## Master-Detail Pattern

Für Sessions und Entries:

```
+------------------+----------------------------+------------------+
|     SIDEBAR      |          LIST              |     DETAIL       |
|                  |  +----------------------+  |  +------------+  |
|                  |  | Item 1               |  |  | Selected   |  |
|                  |  | Item 2  [selected]   |  |  | Item       |  |
|                  |  | Item 3               |  |  | Details    |  |
|                  |  | ...                  |  |  |            |  |
|                  |  +----------------------+  |  +------------+  |
+------------------+----------------------------+------------------+
```

### Dimensionen

| Panel | Width | Verhalten |
|-------|-------|-----------|
| List | 320-400px | Resizable |
| Detail | Flex (rest) | Scrollable |

### Responsive

- **< 1024px**: Stacked (List → Detail als Navigation)
- **>= 1024px**: Side-by-Side

---

## Modal / Dialog

### Größen

| Size | Max Width | Verwendung |
|------|-----------|------------|
| `sm` | 400px | Confirmations |
| `md` | 500px | Forms |
| `lg` | 640px | Complex Forms |
| `xl` | 800px | Preview, Details |
| `full` | 90vw | Entry Viewer |

### Verhalten

- Backdrop: Semi-transparent (Dark: 80% black, Light: 60% black)
- Close: ESC, Click outside, X Button
- Animation: Fade in (150ms)
- Scroll: Content scrollbar, nicht Viewport

---

## Command Palette (Cmd+K)

Globale Suche und Navigation:

```
+----------------------------------------+
| > Search projects, sessions, commits   |
+----------------------------------------+
| Recent                                 |
|   claude-code-archive                  |
|   xrai-website                         |
+----------------------------------------+
| Navigation                             |
|   Projects                      ⌘P     |
|   Sessions                      ⌘S     |
|   Settings                      ⌘,     |
+----------------------------------------+
```

### Features

- Fuzzy Search
- Keyboard Navigation (Arrow Keys + Enter)
- Kategorien: Recent, Navigation, Actions
- Hotkeys anzeigen

---

## Toast / Notifications

Position: **Top-Right**

```
+------------------------+
|  ✓ Sync completed      |
|  15 entries synced     |
|                   [X]  |
+------------------------+
```

### Typen

| Type | Icon | Auto-Dismiss |
|------|------|--------------|
| Success | CheckCircle | 3s |
| Error | XCircle | Manual |
| Warning | AlertTriangle | 5s |
| Info | Info | 4s |

---

## Loading States

### Skeleton

- Für Listen: Animated placeholder rows
- Für Details: Content-shaped placeholders

### Inline Loading

- Buttons: Spinner ersetzt Icon
- Tables: Subtle overlay mit Spinner

### Page Loading

- Skeleton für gesamte Content-Area
- Sidebar bleibt interaktiv

---

## Empty States

```
+------------------------------------------+
|                                          |
|              [Icon: FolderOpen]          |
|                                          |
|            No projects yet               |
|    Projects will appear after first      |
|              collector sync              |
|                                          |
|            [Run Collector]               |
+------------------------------------------+
```

- Zentriert in Content Area
- Icon: 48px, muted color
- Kurze Beschreibung
- Optionale Action
