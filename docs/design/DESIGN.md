---
name: Industrial Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#574235'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#8b7263'
  outline-variant: '#dec1af'
  surface-tint: '#964900'
  primary: '#964900'
  on-primary: '#ffffff'
  primary-container: '#f57c00'
  on-primary-container: '#572800'
  inverse-primary: '#ffb786'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006a61'
  on-tertiary: '#ffffff'
  tertiary-container: '#3baea1'
  on-tertiary-container: '#003c36'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc6'
  primary-fixed-dim: '#ffb786'
  on-primary-fixed: '#311300'
  on-primary-fixed-variant: '#723600'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
  max-width: 1280px
---

## Brand & Style

The design system is engineered for the Argentinian construction sector, prioritizing reliability, structural integrity, and technical precision. The aesthetic balances industrial utility with modern professional software standards, ensuring that a *Maestro Mayor de Obras* (MMO) or architect feels they are using a high-caliber tool, while remaining intuitive for a homeowner planning a renovation.

The visual language is **Corporate / Modern** with a slight **Technical** edge. It utilizes high-density layouts, clear data visualization, and a "Safety First" approach to information hierarchy. Expect heavy use of structural lines, precise alignment, and a systematic approach to state changes. The UI should evoke the feeling of a well-organized blueprint or a digital caliper—accurate, durable, and essential.

## Colors

The palette is rooted in the functional colors of a construction site. 

- **Primary (Construction Orange):** Used exclusively for primary actions (Calculatar, Guardar Presupuesto) and critical highlights. It represents energy and the "active" phase of building.
- **Secondary (Architectural Navy):** A deep, stable blue used for headers, sidebars, and structural navigation. It provides the "professional" weight to the interface.
- **Tertiary (Site Teal):** Reserved for success states, completed "Rubros," and finalized calculations. It offers a calm contrast to the high-energy orange.
- **Neutrals:** A range of Slate greys (from #F8FAFC for backgrounds to #334155 for primary text) ensures high legibility and reduced eye strain during long technical sessions.

## Typography

Typography is treated as a functional data-delivery mechanism. 

- **Hanken Grotesk** is used for headings to provide a sharp, contemporary engineering feel. 
- **Inter** handles the bulk of the UI for its exceptional legibility in forms and descriptions.
- **JetBrains Mono** is introduced for numerical values, units (m2, m3, kg), and calculation results to ensure that digits align perfectly in tables and vertical lists, mimicking technical specifications.

For mobile, headlines scale down to ensure "Rubro" titles do not wrap awkwardly. All labels for input fields use high-contrast weights to remain visible in outdoor/glare conditions.

## Layout & Spacing

This design system utilizes a **12-column fluid grid** for desktop and a **single-column fluid layout** for mobile. 

The spacing rhythm is strictly based on a **4px baseline grid**. Components (like input groups for "Ladrillo Hueco 12x18x33") use "sm" spacing (8px) for internal elements and "lg" spacing (24px) to separate logical sections or "Rubros."

In calculation views, use a split-pane layout on desktop: inputs on the left (6 columns) and a "Real-time Presupuesto" sticky card on the right (4 columns). On mobile, the result card should be anchored to the bottom of the viewport as a persistent sheet.

## Elevation & Depth

To maintain a clean, tool-like feel, the design system avoids heavy shadows. It uses **Tonal Layers** and **Low-contrast outlines** to create hierarchy.

- **Level 0 (Background):** #F8FAFC (Cool White).
- **Level 1 (Cards/Containers):** Pure White with a 1px border in #E2E8F0. This is used for individual calculation sections.
- **Level 2 (Interactive/Floating):** A very soft, diffused shadow (0px 4px 12px rgba(15, 23, 42, 0.08)) is reserved for dropdown menus and the "Total General" summary card to give it a slight physical presence above the site data.
- **State Changes:** When an input is focused, the border transitions from grey to Primary Orange with a subtle outer glow to emphasize the active field.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a balance between the rigid, sharp corners of industrial materials (bricks, beams) and the modern friendliness of a digital app. 

- **Inputs and Buttons:** 4px (0.25rem) radius.
- **Section Cards:** 8px (0.5rem) radius for a slightly softer container feel.
- **Icons:** Use thick, 2px stroke icons with slightly rounded caps to match the component radius. 

Avoid pill-shaped buttons; they feel too "lifestyle" for a construction tool. Rectangular forms with slight rounding convey more stability.

## Components

### Buttons
- **Primary:** #F57C00 background, white text. Bold, uppercase labels for "CALCULAR".
- **Secondary:** Transparent background, #0F172A border and text. Used for "Agregar Rubro".
- **Ghost:** Minimal padding, used for "Limpiar campos".

### Input Fields
- **Technical Inputs:** Must include a trailing suffix (e.g., "m2", "cm", "unidades") inside the field, styled in `data-mono` font.
- **Numeric Steppers:** Use large + and - touch targets for ease of use on-site with gloves or dusty hands.

### Cards (The "Rubro" Container)
- Each card represents a category (e.g., *Mampostería*, *Contrapiso*). 
- Features a header with an icon, a summary of results at the bottom of the card in a light teal tint, and a collapse/expand toggle for dense projects.

### Data Tables
- High-density rows. Alternating row colors (Zebra striping) in #F1F5F9 for readability of long material lists.
- Column headers in `label-caps` for clear distinction.

### Progress Indicators
- A "Technical Stepper" at the top of long flows (Cimientos -> Paredes -> Techo) using the Architectural Navy for completed steps.