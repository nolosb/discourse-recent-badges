export function recentMembers(grants, count) {
  const seen = new Set();

  return grants
    .filter((grant) => grant.user && grant.grantedAt)
    .sort((a, b) => b.grantedAt - a.grantedAt)
    .filter((grant) => {
      if (seen.has(grant.user.id)) {
        return false;
      }
      seen.add(grant.user.id);
      return true;
    })
    .slice(0, count);
}

const TIER_IDS = { gold: 1, silver: 2, bronze: 3 };

// Cache successful responses and share pending requests. A failed request is
// removed so a later visit can retry instead of caching a temporary outage.
function requestCache(ttl, now) {
  const entries = new Map();

  return (key, fetch) => {
    const cached = entries.get(key);
    if (cached && (cached.pending || cached.expiresAt > now())) {
      return cached.promise;
    }

    const entry = { pending: true, expiresAt: 0 };
    entry.promise = Promise.resolve()
      .then(fetch)
      .then(
        (value) => {
          entry.pending = false;
          entry.expiresAt = now() + ttl;
          return value;
        },
        (error) => {
          entries.delete(key);
          throw error;
        }
      );
    entries.set(key, entry);
    return entry.promise;
  };
}

export function createBadgeLoader({
  fetchBadges,
  fetchGrants,
  ttl = 15 * 60_000,
  now = Date.now,
}) {
  const cachedRequest = requestCache(ttl, now);

  return async ({ viewerId, badgeIds = [], tier = "all", count = 6 }) => {
    // Responses can differ for staff and anonymous viewers. Never reuse a
    // response across accounts in the same application session.
    const scope = viewerId ?? "anonymous";
    let ids = [...new Set(badgeIds.map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0
    );

    if (!ids.length) {
      const data = await cachedRequest(`${scope}:index`, fetchBadges).catch(
        () => null
      );
      const tierId = TIER_IDS[tier];
      ids = (data?.badges ?? [])
        .filter(
          (badge) =>
            badge.enabled &&
            badge.grant_count !== 0 &&
            (!tierId || badge.badge_type_id === tierId)
        )
        .map((badge) => badge.id);
    }

    const grants = await Promise.all(
      ids.map((id) =>
        cachedRequest(`${scope}:badge:${id}`, () => fetchGrants(id)).catch(
          () => []
        )
      )
    );

    return recentMembers(grants.flat(), count);
  };
}
