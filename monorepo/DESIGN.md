# Design & UX Brief

Read frontend-design guidance before building any UI, in all three frontends.

Ground it in the actual subject matter: this is an astrologer's practice -
birth charts, precise time and position, an old and exact discipline. Do not
default to the generic "spiritual app" look (purple-to-pink cosmic gradients,
glittery stars, wispy cursive script) - that is as much a cliche as a SaaS
dashboard look. Draw instead from observatory and chart instruments: fine
hairline circles and radial divisions like an actual birth chart wheel,
precise typographic rules, a restrained palette closer to an astronomer's
brass instrument than a horoscope app.

## Direction (adapt, do not copy blindly)

- Color: a deep ink/midnight base (near #14192B), one warm brass/gold accent
  (near #C89B5C) used sparingly - for the one thing that should stand out per
  screen, not on every button and icon. Neutral warm greys for body text and
  surfaces.
- Type: one confident serif for headings that nods to old astronomical
  charts, one clean sans for body/UI text and data-dense screens. Two
  families max.
- Layout: let a radial/circular motif show up deliberately in one meaningful
  place (e.g. a literal day-view clock face for picking time blocks) rather
  than scattering "cosmic" decoration everywhere.

## Explicitly avoid

- Generic purple/violet gradients as a stand-in for "mystical"
- Identical rounded cards with the same soft grey drop-shadow on everything
- ALL-CAPS tracked-out labels, an eyebrow label above every heading
- A numbered 01/02/03 treatment unless the content is genuinely a sequence
- Emoji or sparkle icons used as decoration rather than meaning
- Accenting a single word in a headline with italics/color/bold

## Practical UX requirements

- Admin dashboard and both Flutter apps share the same information
  architecture and terminology - a booking is called the same thing
  everywhere.
- Empty states (no bookings today, no availability set) say what to do
  next, not just "No data."
- The cancel-booking flow shows the auto-generated client message before
  it's sent, not sent silently.
- The "running late" status update is reachable in one or two taps from the
  widget, not buried in a settings menu.
- WCAG-reasonable contrast and keyboard/touch target sizing, without
  calling it out as a feature.