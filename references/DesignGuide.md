# Canvas App Design Guide

This guide helps create distinctive, production-grade Canvas App screens that avoid generic aesthetics.

## Design Thinking Process
Before generating YAML, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this screen solve? Who uses it? What's their context?
- **Tone**: Pick an extreme aesthetic direction - brutally minimal, maximalist, retro-futuristic, luxury/refined, playful, editorial/magazine, brutalist, art deco, soft/pastel, industrial, data-dense dashboard, etc.
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision.

## Know Your Control Palette Before Designing
**Run `canvas_list_controls` before committing to any layout.**

Key controls that expand your design vocabulary:

| Control | What it enables |
|---------|----------------|
| `ModernCard` | Card with Title, Subtitle, Description, shadow, and `OnSelect` |
| `Avatar` | User/entity representation with image, initials fallback, size variants |
| `Badge` | Status indicators, counts, labels with semantic color variants |
| `Progress` | Linear and circular progress display |
| `ModernTabList` | Tab navigation with selection state built in |

**Pattern to avoid:** Reaching for `GroupContainer` + `Label` + `Rectangle` to assemble something that already exists as a semantic control.

## Know Your Data Sources and APIs
**Run `canvas_list_data_sources` and `canvas_list_apis` before creating collections.**

## Typography & Text Hierarchy
- Favor modern controls: `ModernText` over `Label`, `ModernCombobox` over `Classic/ComboBox`, `Button` over `Classic/Button`, etc.
- **Size Contrast**: Headers at 24-32, subheaders at 18-20, body at 14-16
- **Font Properties**: `Size`/`FontSize`, `FontWeight`, `Align`, `VerticalAlign`, `FontColor`

## Color & Visual Theme
- **Commit to a Palette**: Use `Color` constants or custom `RGBA()` values consistently
- **Dominant + Accent**: One dominant color for primary actions, sharp contrasting accents
- **Background Depth**: Don't default to `Color.White`. Use subtle grays, tinted backgrounds, or bold fills

## Spatial Composition & Layout
- **Layout Strategy Choice**: ManualLayout for precision, AutoLayout for responsive
- **Card UI**: Use `ModernCard` as the starting point for anything that functions as a card
- **Spacing as Design**: Generous padding = breathing room. Dense layouts = energy.

## Interactive States & Behavior
- **State-Driven Design**: Use `Set()` variables for dynamic interfaces
- **DisplayMode**: Toggle between Edit, View, Disabled
- **Visibility Choreography**: Use `Visible` property for progressive disclosure
- **Conditional Styling**: Every property can be a formula with `If()` statements

## Visual Details & Polish
- **DropShadow**: `Semilight`, `Regular`, `Heavy` for elevation
- **Border Radius**: `RadiusTopLeft/Right`, `RadiusBottomLeft/Right`
- **Transparency**: RGBA with alpha < 1 for overlays
- **Touch Targets**: At least 44-48px for mobile

## Anti-Patterns to AVOID
- ❌ Default white backgrounds with no variation
- ❌ Everything centered and evenly spaced
- ❌ Using `Button` for everything
- ❌ Defaulting to Classic controls
- ❌ All text at size 12-14 with no hierarchy
- ❌ Static screens with no state management
- ❌ No use of DropShadow or radius properties
- ❌ Building Avatar, Badge, Progress from primitives when semantic controls exist

## Design Process Summary
1. **Discover** — Run `canvas_list_controls` before committing to any design
2. **Choose direction** — Commit to a specific, bold tone
3. **Plan hierarchy** — Primary, secondary, tertiary elements
4. **Choose layout** — ManualLayout for precision; AutoLayout for responsiveness
5. **Plan interactivity** — State variables, dynamic behavior
6. **Implement YAML** — Execute with intentional choices at every property
7. **Validate** — Use `canvas_compile` early, not just at the end
8. **Refine** — Polish spacing, color, sizing, and depth
