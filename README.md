# Recent Badges

An independent Discourse theme component extracted from the Discourse Skills demo theme. The demo theme is unchanged; this component has no dependency on its styles, settings, translations, or layout.

Displays recently earned badges, newest first, with one entry per member. Each entry links to the member and their badge and shows the age of the award. Wide containers show horizontally scrollable cards with previous/next buttons; containers narrower than 40rem show compact rows. There is no automatic scrolling.

## Installation and placement

Install this directory as a theme component and attach it to your theme. By default it renders in the `main-outlet-blocks` block outlet on the current homepage (whichever page is configured as the homepage). It does not replace the homepage or register a homepage block layout.

Set `badges_ticker_location` to `sidebar` to render in Discourse's `sidebar-discovery` block outlet, or `none` to disable the component. On desktop it spans the category header, navigation, and content; below the `lg` breakpoint it stacks above them. Layout styles apply only while badges are actually rendered, so other pages and empty states keep their full-width content. The layout follows the actual component width, so a narrow main content area also uses rows.

Visibility follows Discourse’s configured homepage via `defaultHomepage()`. Sidebar placement uses the `sidebar-discovery` outlet supplied by the discovery page. The component declares layouts for `main-outlet-blocks` and `sidebar-discovery`; block conditions select the configured placement. Discourse allows only one layout per block outlet, so these outlets must not already be owned by another theme or component.

Both block placements are homepage-only and respect `enable_badges`. The component is independent of the demo theme and does not modify or extend its block layouts.

## Settings

| Setting                   | Default | Behavior                                                                        |
| ------------------------- | ------- | ------------------------------------------------------------------------------- |
| `badges_ticker_location`  | `main`  | `main`, `sidebar`, or `none`.                                                   |
| `badges_ticker_count`     | `6`     | Maximum distinct members, from 1 to 50.                                         |
| `badges_ticker_badge_ids` | Empty   | Selected badge IDs; these take precedence over tiers, as in the original.       |
| `badges_ticker_tiers`     | `all`   | Dropdown: All tiers, Gold, Silver, or Bronze. Applies when no IDs are selected. |

The standalone default is main content. Recipients come from core's aggregate `/user_badges.json` feed: the 100 most recent grants across the selected badges (or every enabled, listable badge when no IDs are set), filtered by tier through `badge_type_id`. The latest grant for each member is retained, so a feed dominated by a few very active members can show fewer than `badges_ticker_count` entries.

Change the title, button label, and arrow labels through the component's translations.

## Implementation

`block-highlighted-badges.gjs` directly owns homepage visibility, fetching, scrolling, and the badge markup. Each placement has its own declarative block-outlet initializer, with placement controlled by setting conditions. The initializers pass the imported block class directly to `renderBlocks()`, so no pre-initializer or named block registration is needed. Both initializers pass title, button label, badge IDs, tier, and count through `args`. The block declares their types and defaults in its decorator and reads `this.args`; it does not read theme settings directly. The initializers pass the raw badge-ID string, which the block resolves into a numeric array. A responsive skeleton reserves space during loading; an empty response renders nothing. There are no plugin-outlet connectors or intermediary rendering components. Shared request caching and recent-member selection live in `lib/`.

## Request caching

The grant feed is cached in memory for 15 minutes, separately for each viewer and each badge selection. Concurrent component mounts share the pending request; returning to the homepage within that period reuses the data. A failed request renders nothing and is not cached. There is no background polling, and a full reload clears the cache.

Explicit badge IDs are deduplicated and sorted, so the same selection in another order shares a cache entry. Count changes reuse the cached feed; relative times are recalculated each time the block renders its fetched content.

A first visit needs a single request. Cached responses can delay newly earned badges by up to 15 minutes before the next visit refreshes them.

## Styling

Override the `--tc-highlightedBadges-*` properties from `stylesheets/brand/tokens.scss` to customize colors, typography, padding, and rounding. No demo-theme mixins or variables are required.

## Validation

Run `pnpm lint` for lint, formatting, and type checks. The included system spec checks Discourse's core features when run with the Discourse theme CLI and a test instance.
