# Canvas App YAML Technical Guide

This guide captures best practices and learnings for generating Canvas App YAML screens.

## Quick Start Checklist
When generating a new Canvas App screen:

Always review this technical guide AND the design guide prior to designing a screen.

1. ⚠️ **Run `canvas_list_controls` FIRST — this is non-optional** - Controls you don't know exist can't influence your design. Skipping this step leads to rebuilding things like `Avatar`, `Badge`, `Progress`, `ModernTabList`, and `ModernCard` from scratch using primitive controls.
2. ✅ **Explore examples** - Review existing `.pa.yaml` files for patterns if available
3. ✅ **Plan state management** - Identify what variables you need (Set() calls)
4. ✅ **Choose layout strategy** - ManualLayout for precise control, AutoLayout for responsive design
5. ✅ **Select control types** - Match controls to use case
6. ✅ **Write formulas carefully** - Use Power Fx syntax with `=` prefix
7. ✅ **Validate early and often** - Use `canvas_compile` tool to catch errors

## File Structure
Have one .pa.yaml file for the App object, and a separate file for each screen.

```yaml
Screens:
  ScreenName:
    Properties:          # Optional screen-level properties
      Fill: =RGBA(...)
      OnVisible: |-      # Initialize variables on screen load
        =Set(var1, value);
        Set(var2, value)
    Children:
      - ControlName:
          Control: ControlType
          Variant: VariantName    # Optional
          Properties:
            PropertyName: =formula
          Children:      # Only for controls with children
            - NestedControl:
                ...
```

### Multi-line formulas — use `|-`
Any formula that spans multiple lines must use the `|-` block scalar. The `=` prefix goes on the first content line, not on the `|-` line:

```yaml
OnSelect: |-
  =Set(x, 1);
  Set(y, 2)
```

Single-line formulas can be written inline:

```yaml
Text: =firstName & " " & lastName
```

### Strings that contain `: ` must be quoted
YAML treats `key: value` as a mapping. If a plain string value contains a colon followed by a space, wrap the whole value in quotes:

```yaml
# WRONG — YAML parses "Label: something" as a nested mapping key
HintText: =Label: enter a value

# RIGHT
HintText: ="Label: enter a value"
```

### Power Fx record literals must be quoted — `={Value: "..."}` will fail
⚠️ This is a common source of hard-to-diagnose errors. Always wrap record literals in a quoted YAML string:

```yaml
# WRONG — YAML parses `Value:` as a mapping key
Default: ={Value: "Tab1"}

# RIGHT — outer quotes make the whole thing a YAML string first
Default: "={Value: ""Tab1""}"

# Also valid — single quotes
Default: '={Value: "Tab1"}'
```

### Layout Containers
| Use Case | Control Type | Variant |
|----------|--------------|---------|
| Precise positioning | `GroupContainer` | `ManualLayout` |
| Horizontal Responsive layout | `GroupContainer` | `Horizontal` with `LayoutDirection: =LayoutDirection.Horizontal` |
| Vertical Responsive layout | `GroupContainer` | `Vertical` with `LayoutDirection: =LayoutDirection.Vertical` |

⚠️ **`GroupContainer` has no `OnSelect` — it cannot be clicked.**

- **Clickable cards:** Use `ModernCard` instead — it has `OnSelect`.
- **Clickable non-card areas:** Overlay a transparent `Button` or `Rectangle` on top.

### Data Display
| Use Case | Control Type | Key Properties |
|----------|--------------|----------------|
| List of items | `Gallery` | Items, TemplateSize, OnSelect |
| Tabular data | `Table` | Items, columns |
| Grid data with editing | `DataGrid` | Items, columns, OnSelect |
| Forms | `Form`, `EntityForm` | DataSource, Item, OnSuccess |

### Positioning (ManualLayout)
```yaml
Properties:
  X: =100                    # Absolute position
  Y: =50
  Width: =200               # Fixed width
  Height: =40
```

### Responsive Sizing
```yaml
Properties:
  X: =(Parent.Width - Self.Width) / 2    # Center horizontally
  Width: =Parent.Width                    # Full width
  Height: =Parent.Height - Self.Y         # Fill remaining height
```

### Colors
```yaml
# Using color constants
Fill: =Color.White
BasePaletteColor: =Color.Blue

# Using RGBA
Fill: =RGBA(240, 240, 240, 1)
FontColor: =RGBA(0, 0, 0, 1)

# Conditional colors
BasePaletteColor: =If(isActive, Color.Blue, Color.Gray)
```

### State Management
```yaml
# Initialize variables on screen load
OnVisible: |-
  =Set(variable1, "initial value");
  Set(variable2, 0);
  Set(variable3, false)

# Update state on interaction
OnSelect: |-
  =Set(counter, counter + 1);
  Set(status, "updated")
```

### Auto Layout (Responsive)
```yaml
- Container:
    Control: GroupContainer
    Variant: AutoLayout
    Properties:
      LayoutDirection: =LayoutDirection.Horizontal
      LayoutAlignItems: =LayoutAlignItems.Center
      LayoutJustifyContent: =LayoutJustifyContent.SpaceBetween
      LayoutGap: =16
      PaddingTop: =8
      PaddingBottom: =8
    Children:
      - Button1:
          Properties:
            FillPortions: =1
```

**Key Learnings:**
1. **Dynamic Gallery Height:** Use `Height: =CountRows(Self.AllItems) * Self.TemplateHeight`
2. **Enable Container Scrolling:** Set `LayoutOverflowY: =LayoutOverflow.Scroll`
3. **FillPortions Required for Fixed-Size Children:** Every child of an AutoLayout container must set `FillPortions: =0` if it has a fixed `Width`/`Height`.

### App.Formulas for Reusable Logic
```yaml
App:
  Properties:
    Formulas: |-
      =// Named constants
      MaxItems = 100;
      ColorPrimary = RGBA(52, 120, 246, 1);

      // Functions with parameters
      GetStatusColor(status: Text): Color =
        If(
          status = "complete", Color.Green,
          status = "pending", Color.Yellow,
          Color.Gray
        );
```

### Best Practices
- ✅ Set `App.StartScreen` to the initial landing screen
- ✅ Initialize all variables in `OnVisible`
- ✅ Use guard clauses to prevent invalid operations
- ✅ Use ManualLayout for precise, fixed layouts
- ✅ Use AutoLayout for responsive, flexible layouts
- ✅ Set `AutoHeight: =true` on most Text labels
- ✅ Use `canvas_list_controls` tool to discover options
- ✅ Use `canvas_describe_control` tool to verify properties
- ✅ Validate with `canvas_compile` after major changes
- ❌ Don't mix ManualLayout inside AutoLayout containers
- ❌ Don't guess at property names
- ❌ Don't skip validation until the end

### Common Property Reference
**Positioning:** `X`, `Y`, `Width`, `Height`, `Align`, `VerticalAlign`
**Styling:** `Fill`, `FontColor`, `BasePaletteColor`, `Size`, `FontWeight`
**Behavior:** `DisplayMode`, `Visible`, `OnSelect`, `OnVisible`
**Layout (AutoLayout):** `LayoutDirection`, `LayoutAlignItems`, `LayoutJustifyContent`, `LayoutGap`, `LayoutOverflowY`, `FillPortions`, `PaddingTop/Bottom/Left/Right`

## Implementation Workflow
1. **canvas_list_controls** — required before planning layout
2. **canvas_describe_control** — verify property names and variants
3. **Draft screen structure** — sketch the container/control hierarchy
4. **Write properties and formulas** — positioning, colors, state, event handlers
5. **Validate with canvas_compile** — catch errors early
6. **Fix errors** — use canvas_describe_control to confirm valid property names
7. **Iterate** — validate after each meaningful change
