import { settings } from "virtual:theme";
import { apiInitializer } from "discourse/lib/api";
import BlockHighlightedBadges from "../blocks/block-highlighted-badges";

export default apiInitializer((api) => {
  api.renderBlocks("main-outlet-blocks", [
    {
      block: BlockHighlightedBadges,
      id: "highlighted-badges",
      args: {
        title: "badges_ticker.title",
        buttonLabel: "badges_ticker.button_label",
        badgeIds: settings.badges_ticker_badge_ids,
        tier: settings.badges_ticker_tiers,
        count: settings.badges_ticker_count,
      },
      conditions: [
        { type: "setting", name: "enable_badges", enabled: true },
        {
          type: "setting",
          source: settings,
          name: "badges_ticker_location",
          equals: "main",
        },
      ],
    },
  ]);
});
