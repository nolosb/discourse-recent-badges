# Block: Featured Badges

Shows recently earned badges on the homepage, newest first, one entry per member. Wide containers show scrollable cards; containers narrower than 40rem show compact rows.

## Settings

| Setting                     | Default | Behavior                                                               |
| --------------------------- | ------- | ---------------------------------------------------------------------- |
| `featured_badges_location`  | `main`  | `main` (main-outlet-blocks), `sidebar` (sidebar-discovery), or `none`. |
| `featured_badges_count`     | `6`     | Maximum distinct members, from 1 to 50.                                |
| `featured_badges_badge_ids` | Empty   | Only feature these badges; takes precedence over the tier.             |
| `featured_badges_tiers`     | `all`   | All tiers, Gold, Silver, or Bronze.                                    |

## Conditions

The component renders only when:

- the `enable_badges` site setting is on
- the current page is the configured homepage
- at least one grant matches the badge selection

Each placement owns its block outlet, so that outlet must not already be used by another theme or component.

## Styling

Override these properties on `:root`:

```css
:root {
  /* Colors */
  --tc-FeaturedBadges-color-background-default: var(--secondary);
  --tc-FeaturedBadges-color-background-default-hovered: var(--primary-very-low);
  --tc-FeaturedBadges-color-border-default: var(--primary-200);
  --tc-FeaturedBadges-color-text-default: var(--primary);
  --tc-FeaturedBadges-color-text-muted: var(--primary-high);
  --tc-FeaturedBadges-color-text-link: var(--tertiary);

  /* Typography */
  --tc-FeaturedBadges-title-font-size: 1.25rem;
  --tc-FeaturedBadges-font-size: 1rem;
  --tc-FeaturedBadges-meta-font-size: 0.875rem;

  /* Shape and spacing */
  --tc-FeaturedBadges-border-radius: var(--d-border-radius-large);
  --tc-FeaturedBadges-space-padding: 1rem;

  /* Sidebar placement */
  --tc-FeaturedBadges-sidebar-size-inline: 18rem;
  --tc-FeaturedBadges-sidebar-space-gap-inline: var(--space-6);
  --tc-FeaturedBadges-sidebar-space-gap-block: var(--space-4);
}
```
