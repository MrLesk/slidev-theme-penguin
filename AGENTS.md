# Slidev Theme Penguin - Agent Instructions

## What is This Project?

**This is a Slidev theme called "Penguin".** Slidev is a presentation framework for developers that allows creating slide decks using Markdown, Vue components, and modern web technologies. This theme provides custom layouts, styling, and components that users can apply to their Slidev presentations.

## What is Slidev?

Slidev is built on Vite, Vue 3, and UnoCSS. It enables developers to create presentations using:
- **Markdown files** as the source for slide content
- **Frontmatter** to configure individual slides (layout, transitions, etc.)
- **Vue components** for interactive elements
- **Themes** (like this one) to style entire presentations
- **Layouts** to define different slide structures (two columns, cover, etc.)

**Key Slidev Concepts:**
- Each slide is separated by `---` in the markdown file
- Slides use frontmatter to specify layout: `layout: center` or `layout: two-cols`
- Themes provide layouts, components, and styles that slides can use
- Code highlighting uses Shiki, with Monaco Editor integration available

**Official Slidev Documentation:** https://sli.dev/llms.txt

## Project Structure

```
slidev-theme-penguin/
├── components/          # Reusable Vue SFC components (PascalCase naming)
│   └── corner-curves/   # Shared SVG/partials for visual elements
├── layouts/            # Slide layout templates (kebab-case naming)
│   ├── center.vue      # Used as `layout: center` in frontmatter
│   ├── two-cols.vue    # Used as `layout: two-cols` in frontmatter
│   └── ...
├── styles/             # Theme styling tokens and CSS
│   └── index.ts        # Main style entry point
├── setup/              # Slidev setup and configuration
│   └── theme/          # Theme utilities and tokens
├── global-top.vue      # Global component loaded on all slides
├── example.md          # Sample presentation demonstrating layouts
├── example-export/     # Exported static assets
├── example-export.pdf  # PDF export example
└── dist/               # Build output (do not edit directly)
```

## How Slidev Themes Work

A Slidev theme is an npm package that provides:

1. **Layouts** (`layouts/*.vue`): Vue components that define slide structures. Each layout file becomes available as a frontmatter option.
   ```yaml
   ---
   layout: two-cols
   ---
   ```

2. **Components** (`components/*.vue`): Reusable Vue components that can be used within slides.

3. **Styles** (`styles/`): CSS/SCSS styling, theme tokens, and global overrides.

4. **Setup** (`setup/`): Theme initialization code, utilities, and configuration.

5. **Global Components** (`global-top.vue`, `global-bottom.vue`): Components injected into every slide.

**Theme Distribution:**
- Users install themes via npm: `npm install slidev-theme-penguin`
- Users apply themes in their presentation's frontmatter:
  ```yaml
  ---
  theme: penguin
  ---
  ```

## Development Workflow

**Prerequisites:**
- This repo uses `bun@1.3.1` as the package manager
- Install dependencies: `bun install`

**Commands:**
| Command | Purpose |
|---------|---------|
| `bun dev` | Launch Slidev with `example.md` and live reload |
| `bun build` | Build production bundle |
| `bun export` | Generate PDF and static exports |
| `bun screenshot` | Create PNG previews for releases |
| `bun lint` | Run Biome checks (linting + formatting) |
| `bun lint:fix` | Auto-fix linting and formatting issues |
| `bun format` | Format code with Biome |
| `bun release` | Trigger release-it for versioning |

**Testing Changes:**
1. Run `bun dev` to start the dev server
2. Edit layouts/components/styles
3. View changes in browser with `example.md` presentation
4. Navigate through slides to verify animations, dark/light modes, code blocks
5. Run `bun screenshot` to update visual references before committing

## Coding Guidelines

**Technology Stack:**
- Vue 3 with `<script setup>` syntax
- TypeScript for type safety
- SCSS modules for component styling
- CSS custom properties for theme tokens
- UnoCSS for utility classes

**Naming Conventions:**
- **Components**: PascalCase files (`MyComponent.vue`)
- **Layouts**: kebab-case files (`my-layout.vue`)
- **Props**: camelCase in JavaScript, kebab-case in templates
- Match component filenames with their default export names

**Code Style:**
- Linting and formatting enforced by Biome
- Use 2-space indentation
- Single quotes for strings
- Prefer `<script setup>` blocks
- Use TypeScript for props and complex logic
- Place theme tokens in `setup/theme/`
- Use CSS variables for theme colors

**Layout Development Tips:**
- Layouts receive props from slide frontmatter
- Use `$slidev.nav` for navigation state
- Use `$clicks` for click-based animations
- Layouts should support both light and dark modes
- Test layouts with various content lengths

## Making Changes

**When Adding/Modifying Layouts:**
1. Create/edit layout file in `layouts/`
2. Add example usage to `example.md`
3. Test with `bun dev`
4. Update screenshots with `bun screenshot`

**When Adding Components:**
1. Create component in `components/` with PascalCase naming
2. Import and use in layouts or make globally available
3. Document usage in component comments

**When Changing Styles:**
1. Modify tokens in `styles/index.ts` or layout-specific SCSS
2. Test in both light and dark modes
3. Verify all layouts still look correct

**When Updating Example:**
1. Edit `example.md` to showcase new features
2. Run `bun export` to regenerate PDF
3. Run `bun screenshot` to update previews

## Commit & Release Process

**Commit Messages:**
Follow Conventional Commits format:
- `feat: add two-thirds layout`
- `fix: correct dark mode contrast`
- `chore: update dependencies`
- `docs: improve layout usage examples`

**Pull Requests:**
- Summarize changes clearly
- Link related issues
- Include screenshots for visual changes
- Note any breaking changes
- Update README.md if user-facing behavior changes

**Releases:**
- Use `bun release` to trigger release-it
- Update CHANGELOG.md with notable changes
- Ensure example.md and exports are up-to-date

## Important Notes

- **This theme serves production users** - treat all code as production-grade
- **Manual testing only** - no automated test suite exists yet
- **Screenshots matter** - visual regression is caught via screenshot comparison
- **Slidev compatibility** - always verify against latest Slidev release
- **Reference upstream** - check https://sli.dev/llms.txt for canonical Slidev patterns

## Common Tasks

**Adding a new layout:**
```bash
# 1. Create layout file
touch layouts/my-new-layout.vue

# 2. Implement layout with Vue 3 + TypeScript
# 3. Add example to example.md:
---
layout: my-new-layout
---

# 4. Test
bun dev

# 5. Update visuals
bun screenshot
```

**Debugging styling issues:**
```bash
# Start dev server
bun dev

# Open browser DevTools
# Inspect element styles
# Check CSS custom properties
# Verify UnoCSS classes
# Test dark mode toggle
```

**Before pushing:**
```bash
bun lint           # Check for errors (linting + formatting)
bun lint:fix       # Auto-fix issues
bun dev            # Manual test
bun screenshot     # Update visuals
```
