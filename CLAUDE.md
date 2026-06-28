# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-contained UI prototype for **ProHub** — a warehouse/product task-management dashboard (Thai-language). It is built as **Design Components (DC)**: standalone `.dc.html` files that render client-side via a small React-based runtime. There is no build step, no package manager, and no server-side code. All files live under `ref/Task management/`.

- `ProHub Task List.dc.html` — the root page. Three tabs: Timeline, All Tasks (list), Change Requests. All task/CR data is hardcoded inside the component's logic.
- `Dropdown.dc.html` — a reusable dropdown DC, imported by the root page.
- `support.js` — the DC runtime (see "Do not edit" below).
- `assets/`, `uploads/`, `screenshots/` — images and design references.

## Running / previewing

Open a `.dc.html` file through an HTTP server (not `file://` — the runtime `fetch()`es sibling components and the page's own source):

```bash
cd "ref/Task management" && python3 -m http.server 8000
# then open http://localhost:8000/ProHub%20Task%20List.dc.html
```

There are no tests, linters, or build commands.

## How a Design Component works

Each `.dc.html` has two parts inside `<body>`:

1. `<x-dc>…</x-dc>` — the HTML **template**, using these template directives:
   - `{{ expr }}` — interpolation / attribute binding. The expression language is **deliberately limited** (see `resolve()` in `support.js`): property/index paths (`a.b[0]`), `===`/`!==`/`==`/`!=` comparisons, `!negation`, and literals. **No function calls, arithmetic, or arbitrary JS.** Put all real logic in `renderVals()` and expose the result as a value/closure.
   - `<sc-for list="{{ items }}" as="x">` — loop; `$index` is available inside.
   - `<sc-if value="{{ cond }}">` — conditional render.
   - `<dc-import name="Dropdown" …>` — embed a **sibling** DC; the runtime fetches `./Dropdown.dc.html` by name. Pass props as attributes (kebab-case attrs become camelCase props; `dc-props="{{ obj }}"` spreads an object).
   - `<x-import from="url" component="X">` — embed an **external** JS/JSX module (Babel-compiled in-browser for `.jsx`/`.tsx`).
   - `<helmet>` — content hoisted into `<head>` (fonts, `<style>`, `<meta name="design_doc_mode">`).
   - `style-hover="…"`, `style-before="…"`, etc. — pseudo-class/element styles compiled to real CSS rules (plain inline `style` cannot express `:hover`).
   - `hint-size`, `hint-placeholder-count`, `hint-placeholder-val` — placeholder hints used only during streaming; ignore for static behavior.

2. `<script type="text/x-dc" data-dc-script data-props="…">` — the **logic**:
   - `data-props` is JSON declaring each prop's editor metadata + `default`, plus a `$preview` size. Defaults feed the template when no parent overrides.
   - The script must define `class Component extends DCLogic`. `DCLogic` (alias `StreamableLogic`) gives `this.props`, `this.state`, `this.setState(patch|fn, cb)`, `forceUpdate()`, and the React lifecycle hooks (`componentDidMount`/`DidUpdate`/`WillUnmount`).
   - **`renderVals()` is the core method.** It returns a flat object that is merged over `props` and becomes the `{{ … }}` namespace for the template. Event handlers are exposed as closures here (e.g. `onClick: () => this.setState(...)`), and `React` is in scope for building inline elements (e.g. the `icon()` helper returns `React.createElement(...)`).

`Dropdown.dc.html` is the clearest minimal example of the pattern (controlled value with internal state fallback, outside-click close via `componentDidMount`, `rootRef`).

## Conventions in this codebase

- **Styling is all inline** in the template, plus `style-hover` for interactive states. There is no external stylesheet. Colors are passed down via an `accent` prop and derived tints like `accent + '1A'` (hex alpha).
- **Data is hardcoded** in `renderVals()` of the root page (`ST`/`PR`/`TL`/`groups`/`CRG` tables). Editing tasks, statuses, timeline lanes, or change requests means editing these literals — there is no backend.
- **All UI text is Thai.** Preserve Thai labels and the `IBM Plex Sans Thai` font stack when adding UI.
- State that is purely view-local (open menus, current tab, pagination, optimistic deletes, priority overrides) lives in `this.state`; there is no persistence across reloads.

## Do not edit `support.js`

Its header says: `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with` `cd dc-runtime && bun run build`. The `dc-runtime` source is **not** in this repo, so treat `support.js` as a read-only vendored dependency. Read it to understand runtime behavior (expression resolution, component resolution, streaming, error boundaries), but make changes in the `.dc.html` files instead.
