# Leela website

A static website for Leela, a retreat center and community sanctuary in the foothills outside Lyons, Colorado.

It uses plain HTML, CSS and JavaScript, with no build step and no dependencies. To preview it, open `index.html` in a browser. To publish it, upload this folder to any static host (Netlify, Cloudflare Pages, GitHub Pages, and so on).

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: the central idea, "an ordinary day" log, the three movements, three ways in, daily rhythm, experiences, the bulletin board, the land, and how Leela stays open |
| `about.html` | The Idea: what Leela is, the three movements, the feeling, spirit, technology and attention, the substance-free policy |
| `experiences.html` | The seven experiences and the human experiences Leela protects |
| `calendar.html` | What's On: weekly offerings and a filterable list of upcoming events |
| `stay.html` | The House, the Yurts, the Camp, ways to stay, future buildings |
| `visit.html` | Drop-in info, getting here, what to bring, customs, FAQ, contact |
| `support.html` | Keep It Open: the economic model, sliding scale, scholarships, work-trade, giving |

Shared styles are in `assets/leela.css` and shared behavior is in `assets/leela.js`. The header and footer are repeated in every page, so a change to the navigation or footer needs to be made in all seven files.

## Placeholders to replace

Sample values that still need real ones are marked with a `data-ph` attribute. To find them all:

```sh
grep -n 'data-ph=' *.html
```

- `address`: the road address (visit page and every footer)
- `email`, `phone`: contact details (visit and calendar pages)
- `rate`, `price`, `capacity`, `minimum`, `season`: lodging rates and program prices

Other sample content to review:

- **Calendar events** (`calendar.html` and the bulletin board on `index.html`): the dates are real 2026 dates, but the events are examples. Teachers are described by role ("a visiting dharma teacher") instead of by name.
- **Daily log** on the homepage: the times are illustrative. The log switches to a rest-day version on Mondays and Tuesdays (Mountain Time) and highlights the current hour.
- **Physical details** that are plausible but not confirmed: wood stoves in the yurts, bathrooms a short walk from the yurts, the phone basket, the resident dog, a phone in the House, gravel road, number of yurts.
- **Coordinates and elevation** (40.22° N, 105.27° W, about 5,400 ft) are for Lyons itself. Update them to the property's.
- **Newsletter forms** only show a thank-you message for now. Connect them to a mailing service (Buttondown, Mailchimp, etc.) when one is chosen.
- **Photography**: the Stay page uses simple drawn illustrations in its image frames. Swap in real photographs by replacing the `<svg>` inside each `.figure__frame` with an `<img>`.
