---
name: Teal Precision Admin
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf4'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d7e3fd'
  on-surface: '#101c2f'
  on-surface-variant: '#3e4949'
  inverse-surface: '#263144'
  inverse-on-surface: '#ecf0ff'
  outline: '#6e7979'
  outline-variant: '#bdc9c8'
  surface-tint: '#006a6a'
  primary: '#006565'
  on-primary: '#ffffff'
  primary-container: '#008080'
  on-primary-container: '#e3fffe'
  inverse-primary: '#76d6d5'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#dee0e3'
  on-secondary-container: '#606365'
  tertiary: '#8b4823'
  on-tertiary: '#ffffff'
  tertiary-container: '#a96039'
  on-tertiary-container: '#fff9f7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#93f2f2'
  primary-fixed-dim: '#76d6d5'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#004f4f'
  secondary-fixed: '#e1e2e5'
  secondary-fixed-dim: '#c5c6c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#44474a'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb692'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#733512'
  background: '#f9f9ff'
  on-background: '#101c2f'
  surface-variant: '#d7e3fd'
typography:
  headline-lg:
    fontFamily: Cairo
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Cairo
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Cairo
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Cairo
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Cairo
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Cairo
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Cairo
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-desktop: 40px
---

## Brand & Style
This design system is built for high-density information management and professional oversight. The brand personality is clinical, efficient, and authoritative, specifically optimized for Right-to-Left (RTL) Arabic contexts. 

The style utilizes a **Corporate Modern** approach with a focus on high legibility and spaciousness. It leverages a clean white-and-teal palette to evoke a sense of calm productivity. The UI avoids unnecessary decorative elements, favoring structural clarity through subtle borders and soft depth to differentiate dashboard modules.

## Colors
The color palette is anchored by a deep Teal primary, used for critical actions and brand presence. 
- **Surface**: The primary background is a very light gray (#F3F4F7) to reduce eye strain during long working sessions.
- **Containers**: White (#FFFFFF) is reserved for cards and content containers to create clear contrast against the background.
- **Accents**: Status colors are binary; Teal represents "Completed" or positive states, while a functional Red represents "Canceled" or errors. 
- **Borders**: A consistent light gray (#DEE3EC) defines the structure without creating visual clutter.

## Typography
The design system exclusively uses **Cairo** for its exceptional balance between traditional Arabic script aesthetics and modern geometric clarity. 

All typography is Right-to-Left (RTL) aligned. Headlines use a heavier weight (600-700) to provide clear section hierarchy. Body text is kept at a comfortable 14px or 16px size to ensure legibility in data-dense tables and dashboard widgets. Letter spacing is slightly adjusted for labels to maintain clarity at smaller scales.

## Layout & Spacing
The system follows a **Fluid Grid** model with a standard 12-column structure for desktop. 

- **Sidebar**: Fixed at 280px on the right side for RTL navigation.
- **Main Content**: Fluid area with 40px margins on desktop, reducing to 16px on mobile.
- **Spacing Rhythm**: Uses a 4px baseline. Most internal card padding is set to 24px (lg) to ensure the professional, airy feel required for complex data dashboards.
- **Responsive Behavior**: On tablets, the sidebar collapses into an icon-only rail or a hidden drawer. On mobile, all columns stack vertically.

## Elevation & Depth
This design system uses **Tonal Layering** combined with subtle **Ambient Shadows**. 

- **Resting State**: Cards and primary containers sit at a low elevation using a 1px solid border (#DEE3EC) and a soft shadow `0 1px 2px rgba(40, 51, 71, 0.05)`.
- **Interactive State**: Upon hover, elements (buttons, interactive cards) utilize a "2px lift" via a negative Y-transform and an increased shadow density to signal interactivity. 
- **Modals**: High elevation with a 15% opacity backdrop blur to focus user attention on the task at hand.

## Shapes
The shape language is modern and approachable, utilizing a tiered corner radius system:
- **Cards & Modules**: 16px radius for large surface areas to soften the professional aesthetic.
- **Buttons, Inputs, & Icons**: 12px radius to maintain consistency and a "friendly-professional" touch.
- **Small Badges**: Fully rounded (pill) for status indicators.

## Components
- **Buttons**: Primary buttons are solid Teal (#008080) with white text. Secondary buttons use a Teal outline or subtle gray ghost style. All buttons use a 12px border radius.
- **Cards**: Background is #FFFFFF, border is 1px #DEE3EC, and corner radius is 16px. Header sections within cards should have a subtle bottom border.
- **Input Fields**: 12px radius with a 1px #DEE3EC border. Focus states transition the border color to Teal with a 2px outer glow.
- **Status Chips**: 
    - *Completed*: Teal background at 10% opacity with solid Teal text.
    - *Canceled*: Red background at 10% opacity with solid Red text.
- **Data Tables**: Use horizontal dividers only (#DEE3EC). Row hover states should apply a very light Teal tint (#F0F8F8) and a slight 2px lift effect.
- **Navigation (RTL)**: Navigation items are right-aligned. Active states are indicated by a 4px vertical Teal bar on the far right edge of the nav item.