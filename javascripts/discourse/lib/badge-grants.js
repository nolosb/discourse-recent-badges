import UserBadge from "discourse/models/user-badge";

// Members can hold several recent grants, so the feed is larger than the
// member count to leave room for deduplication.
const GRANT_LIMIT = 100;

const TIER_IDS = { gold: 1, silver: 2, bronze: 3 };

// Explicit badge IDs take precedence over the tier.
export function badgeTypeId(badgeIds, tier) {
  return badgeIds.length ? undefined : TIER_IDS[tier];
}

// The feed is ordered newest first, so the first grant per member is their
// most recent one.
export function recentMembers(grants, count) {
  const seen = new Set();

  return grants
    .filter((grant) => {
      if (!grant.user || !grant.grantedAt || seen.has(grant.user.id)) {
        return false;
      }
      seen.add(grant.user.id);
      return true;
    })
    .slice(0, count);
}

export async function loadRecentMembers({ badgeIds, tier, count }) {
  const grants = await UserBadge.findByBadgeIds(badgeIds, {
    badgeTypeId: badgeTypeId(badgeIds, tier),
    limit: GRANT_LIMIT,
  }).catch(() => []);

  return recentMembers(grants, count);
}
