

## Plan: Optimize Landing Page

### What to do

**File:** `src/pages/Landing.tsx` — full rewrite with the following changes:

### 1. Add the app logo
- Use `/icon-512x512.png` in the navbar and hero section alongside the "TimeTracker" text
- Replace the Hammer icon in the navbar with the actual logo image

### 2. Remove scroll indicator
- Delete the entire "Scroll indicator" block (lines 217-230) with the ChevronDown animation
- Remove `ChevronDown` from lucide imports

### 3. Add more scroll-triggered animations
Inspired by Toggl Track and My Hours patterns:
- **Parallax text reveal:** Each section heading slides in from different directions (left/right alternating)
- **Staggered feature cards:** Cards animate in with staggered delays as they enter viewport, with a slight horizontal slide (not just fade-up)
- **Counter/number animation:** Add a stats section (e.g. "1000+ brukere", "50 000+ timer logget") with number count-up animation on scroll
- **Sticky hero fade-out:** Hero content fades and scales down as user scrolls (already exists, keep it)
- **Section divider animations:** Subtle horizontal line that grows from center on scroll

### 4. Mobile-first optimization
- Hero: reduce `min-h-[100dvh]` to `min-h-[85dvh]` on mobile so content is visible without scrolling
- Feature cards: single column with full-width cards, larger touch targets (min 48px tap areas)
- CTA buttons: full-width on mobile with `w-full` below `sm:`
- Typography: use `text-3xl` on mobile instead of `clamp(2.5rem,7vw,5rem)` — ensure readable without zoom
- Section padding: reduce `py-32` to `py-16` on mobile (`py-16 md:py-32`)
- Navbar: sticky, compact (h-12 on mobile), logo + login button only

### 5. Layout improvements inspired by competitors
- **Hero split layout on desktop:** Text left, app mockup/phone frame right (using a CSS phone frame showing the app icon)
- **Social proof strip:** Add a subtle "Brukt av 500+ norske håndverkere" trust badge below hero
- **Alternating feature sections:** Instead of a 3-column grid, show features as alternating left-right rows on desktop with icon + text, similar to Toggl
- **Sticky CTA bar on mobile:** A fixed bottom bar appears after scrolling past hero with "Kom i gang gratis" button

### Technical details
- All animations use `framer-motion` `whileInView` with `viewport={{ once: true, margin: "-80px" }}`
- New animation variants: `slideInLeft`, `slideInRight` for alternating sections
- Phone mockup: pure CSS with rounded corners, border, and the app icon inside
- Sticky mobile CTA: uses `motion.div` with scroll-linked opacity (appears after 30% scroll)
- No new dependencies needed

