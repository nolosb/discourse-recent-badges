import { settings } from "virtual:theme";
import { apiInitializer } from "discourse/lib/api";
import BlockFeaturedBadges from "../blocks/block-featured-badges";

export default apiInitializer((api) => {
  api.renderBlocks("sidebar-discovery", [
    {
      block: BlockFeaturedBadges,
      id: "featured-badges",
      args: {
        title: "featured_badges.title",
        linkLabel: "featured_badges.link_label",
        badgeIds: settings.featured_badges_badge_ids
          .split("|")
          .map(Number)
          .filter((id) => id > 0),
        tier: settings.featured_badges_tiers,
        count: settings.featured_badges_count,
      },
      conditions: [
        { type: "setting", name: "enable_badges", enabled: true },
        {
          type: "setting",
          source: settings,
          name: "featured_badges_location",
          equals: "sidebar",
        },
      ],
    },
  ]);
});
