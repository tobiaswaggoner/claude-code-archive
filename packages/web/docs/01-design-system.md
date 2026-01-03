# Design System

> Claude Code Archive - Backoffice UI
> **Tailwind CSS 4.1** - CSS-first Configuration mit `@theme`

## Philosophie

- **Informationsdichte**: Kompaktes Layout, minimaler Whitespace
- **Klarheit**: Visuelle Hierarchie durch Farbe und Gewicht, nicht durch Abstände
- **Konsistenz**: Einheitliche Patterns für alle Interaktionen
- **Performance**: Keine unnötigen Animationen, schnelle Ladezeiten

---

## Farbsystem

### Semantische Farben

| Token | Light Mode | Dark Mode | Verwendung |
|-------|------------|-----------|------------|
| `--background` | `#fafafa` | `#0f0f10` | Page Background |
| `--background-subtle` | `#f4f4f5` | `#18181b` | Cards, Panels |
| `--foreground` | `#18181b` | `#fafafa` | Primary Text |
| `--foreground-muted` | `#71717a` | `#a1a1aa` | Secondary Text |
| `--border` | `#e4e4e7` | `#27272a` | Borders, Dividers |
| `--border-subtle` | `#f4f4f5` | `#1f1f23` | Subtle Dividers |

### Brand Colors (Orange Accent)

| Token | Value | Verwendung |
|-------|-------|------------|
| `--accent` | `#f97316` | Primary Actions, Links, Focus |
| `--accent-hover` | `#ea580c` | Hover State |
| `--accent-muted` | `#fed7aa` / `#7c2d12` | Badges, Highlights (Light/Dark) |
| `--accent-foreground` | `#ffffff` | Text on Accent |

### Anthrazit Palette

```css
/* Basis-Grautöne - bewusst warm/bräunlich für Anthrazit-Feeling */
--zinc-50:  #fafafa;
--zinc-100: #f4f4f5;
--zinc-200: #e4e4e7;
--zinc-300: #d4d4d8;
--zinc-400: #a1a1aa;
--zinc-500: #71717a;
--zinc-600: #52525b;
--zinc-700: #3f3f46;
--zinc-800: #27272a;
--zinc-900: #18181b;
--zinc-950: #0f0f10;
```

### Status Colors

| Status | Light | Dark | Verwendung |
|--------|-------|------|------------|
| Success | `#16a34a` | `#22c55e` | Erfolgsmeldungen, Sync OK |
| Warning | `#d97706` | `#f59e0b` | Warnungen, Dirty State |
| Error | `#dc2626` | `#ef4444` | Fehler, Failed Sync |
| Info | `#2563eb` | `#3b82f6` | Hinweise |

---

## Typography

### Font Stack

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", "SF Mono", monospace;
```

### Größen (kompakt)

| Token | Size | Line Height | Verwendung |
|-------|------|-------------|------------|
| `text-xs` | 11px | 14px | Labels, Badges, Timestamps |
| `text-sm` | 13px | 18px | **Default Body Text**, Table Cells |
| `text-base` | 14px | 20px | Wichtige Inhalte, Inputs |
| `text-lg` | 16px | 24px | Section Headers |
| `text-xl` | 18px | 26px | Page Titles |
| `text-2xl` | 22px | 28px | Main Headings |

> **Wichtig**: Base Font ist 13px, nicht 16px. Optimiert für Informationsdichte.

### Font Weights

| Weight | Verwendung |
|--------|------------|
| 400 (Regular) | Body Text |
| 500 (Medium) | Labels, wichtige Texte |
| 600 (Semibold) | Headers, Buttons |

---

## Spacing

### Kompakte Spacing-Skala

```css
--space-0: 0px;
--space-1: 2px;
--space-2: 4px;
--space-3: 6px;
--space-4: 8px;
--space-5: 12px;
--space-6: 16px;
--space-7: 20px;
--space-8: 24px;
--space-10: 32px;
--space-12: 40px;
```

### Anwendung

| Kontext | Spacing |
|---------|---------|
| Inline-Elemente (Icon + Text) | 4-6px |
| Form-Felder vertikal | 8px |
| Zwischen Sections | 16-20px |
| Card Padding | 12-16px |
| Page Margin | 16-24px |

---

## Border Radius

| Token | Value | Verwendung |
|-------|-------|------------|
| `--radius-sm` | 4px | Buttons, Inputs, Badges |
| `--radius-md` | 6px | Cards, Dropdowns |
| `--radius-lg` | 8px | Modals, Dialogs |

> Bewusst klein gehalten für professionellen Look.

---

## Shadows

| Token | Value | Verwendung |
|-------|-------|------------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 2px 4px rgba(0,0,0,0.1)` | Cards, Dropdowns |
| `--shadow-lg` | `0 4px 12px rgba(0,0,0,0.15)` | Modals, Popovers |

> In Dark Mode: Shadows durch Border-Highlights ersetzen, nicht verstärken.

---

## Icons

**Library**: Lucide Icons (bereits in shadcn/ui enthalten)

| Size | Verwendung |
|------|------------|
| 14px | Inline mit Text, Buttons |
| 16px | Standalone in kompakten Bereichen |
| 18px | Navigation Items |
| 20px | Page Headers, Empty States |

---

## Interaktions-States

### Focus

```css
/* Outline statt Box-Shadow für bessere Accessibility */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Hover

```css
/* Subtle background change, keine Transforms */
:hover {
  background-color: var(--background-subtle);
}
```

### Active/Selected

```css
/* Accent-Farbe als linker Border */
[aria-selected="true"] {
  border-left: 2px solid var(--accent);
  background-color: var(--accent-muted);
}
```

---

## Z-Index Skala

| Layer | Z-Index | Verwendung |
|-------|---------|------------|
| Base | 0 | Default Content |
| Sticky | 10 | Sticky Headers, Sidebars |
| Dropdown | 20 | Dropdowns, Selects |
| Modal Backdrop | 30 | Modal Background |
| Modal | 40 | Modal Content |
| Toast | 50 | Notifications |
| Tooltip | 60 | Tooltips |

---

## Responsive Breakpoints

| Name | Min Width | Verwendung |
|------|-----------|------------|
| `sm` | 640px | Mobile Landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop (Sidebar collapsed) |
| `xl` | 1280px | Desktop (Sidebar expanded) |
| `2xl` | 1536px | Large Desktop |

> **Mobile**: Sidebar wird zu Bottom-Sheet oder Overlay.
> **1024-1280px**: Sidebar default collapsed (nur Icons).
> **>1280px**: Sidebar default expanded.

---

## Animation Guidelines

```css
--transition-fast: 100ms ease-out;
--transition-normal: 150ms ease-out;
--transition-slow: 200ms ease-out;
```

### Regeln

1. **Keine Animationen bei Datenladen** - Skeleton States statt Spinner
2. **Sidebar Toggle**: Schnelle Transition (100ms)
3. **Modals**: Fade-in (150ms), kein Slide
4. **Hover-States**: Sofort (keine Transition auf Background)
5. **Toasts**: Slide-in von rechts (200ms)

---

## Dark Mode Implementierung

> **Tailwind v4**: Kein `tailwind.config.js` mehr! Alles in CSS.

### Kontrast-Regeln

- Dark Mode ist **nicht** einfach invertiert
- Accent-Farben bleiben gleich (Orange funktioniert in beiden Modi)
- Shadows werden durch subtile Borders ersetzt
- Text-Kontrast: Minimum 4.5:1 (WCAG AA)

---

## Tailwind v4 CSS Configuration

```css
/* globals.css */
@import "tailwindcss";

/* ============================================
   DESIGN TOKENS - Claude Archive
   ============================================ */

@theme {
  /* ----------------------------------------
     COLORS - Orange Accent + Anthrazit
     ---------------------------------------- */

  /* Accent (Orange) */
  --color-accent: #f97316;
  --color-accent-hover: #ea580c;
  --color-accent-muted: #fed7aa;
  --color-accent-foreground: #ffffff;

  /* Status Colors */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;

  /* ----------------------------------------
     TYPOGRAPHY
     ---------------------------------------- */

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Kompakte Größen (13px base) */
  --text-xs: 0.6875rem;    /* 11px */
  --text-sm: 0.8125rem;    /* 13px - Default Body */
  --text-base: 0.875rem;   /* 14px */
  --text-lg: 1rem;         /* 16px */
  --text-xl: 1.125rem;     /* 18px */
  --text-2xl: 1.375rem;    /* 22px */

  /* ----------------------------------------
     SPACING (kompakt)
     ---------------------------------------- */

  --spacing-0: 0px;
  --spacing-1: 2px;
  --spacing-2: 4px;
  --spacing-3: 6px;
  --spacing-4: 8px;
  --spacing-5: 12px;
  --spacing-6: 16px;
  --spacing-7: 20px;
  --spacing-8: 24px;

  /* ----------------------------------------
     BORDER RADIUS (klein, professionell)
     ---------------------------------------- */

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* ----------------------------------------
     SHADOWS
     ---------------------------------------- */

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);

  /* ----------------------------------------
     TRANSITIONS
     ---------------------------------------- */

  --transition-fast: 100ms ease-out;
  --transition-normal: 150ms ease-out;
  --transition-slow: 200ms ease-out;

  /* ----------------------------------------
     LAYOUT
     ---------------------------------------- */

  --sidebar-width: 240px;
  --sidebar-collapsed: 56px;
}

/* ============================================
   LIGHT MODE (Default)
   ============================================ */

:root {
  --color-background: #fafafa;
  --color-background-subtle: #f4f4f5;
  --color-foreground: #18181b;
  --color-foreground-muted: #71717a;
  --color-border: #e4e4e7;
  --color-border-subtle: #f4f4f5;

  /* Status colors for light mode */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;

  /* Accent muted for light */
  --color-accent-muted: #fed7aa;
}

/* ============================================
   DARK MODE
   ============================================ */

.dark {
  --color-background: #0f0f10;
  --color-background-subtle: #18181b;
  --color-foreground: #fafafa;
  --color-foreground-muted: #a1a1aa;
  --color-border: #27272a;
  --color-border-subtle: #1f1f23;

  /* Status colors for dark mode */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Accent muted for dark */
  --color-accent-muted: #7c2d12;
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --color-background: #0f0f10;
    --color-background-subtle: #18181b;
    --color-foreground: #fafafa;
    --color-foreground-muted: #a1a1aa;
    --color-border: #27272a;
    --color-border-subtle: #1f1f23;
    --color-success: #22c55e;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --color-info: #3b82f6;
    --color-accent-muted: #7c2d12;
  }
}

/* ============================================
   BASE STYLES
   ============================================ */

body {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.5;
  background-color: var(--color-background);
  color: var(--color-foreground);
}

/* Focus styles */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Selection */
::selection {
  background-color: var(--color-accent);
  color: var(--color-accent-foreground);
}
```

### Usage in Components

```tsx
// Tailwind v4 verwendet die CSS Variables automatisch
<div className="bg-background text-foreground border-border">
  <button className="bg-accent text-accent-foreground hover:bg-accent-hover">
    Action
  </button>
</div>

// Spacing
<div className="p-4 gap-3">  {/* 8px, 6px */}

// Typography
<p className="text-sm text-foreground-muted">  {/* 13px, muted */}
```
