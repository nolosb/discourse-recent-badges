// Grants requested per feed. Members can hold several recent grants, so the
// feed is larger than the member count to leave room for deduplication.
export const GRANT_LIMIT = 100;

const TIER_IDS = { gold: 1, silver: 2, bronze: 3 };

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
  fetchGrants,
  ttl = 15 * 60_000,
  now = Date.now,
}) {
  const cachedRequest = requestCache(ttl, now);

  return async ({ viewerId, badgeIds = [], tier = "all", count = 6 }) => {
    const ids = [...new Set(badgeIds.map(Number))]
      .filter((id) => Number.isInteger(id) && id > 0)
      .sort((a, b) => a - b);

    // Explicit badge IDs take precedence over the tier.
    const badgeTypeId = ids.length ? undefined : TIER_IDS[tier];

    // Responses can differ for staff and anonymous viewers. Never reuse a
    // response across accounts in the same application session.
    const key = [viewerId ?? "anonymous", ids.join(","), badgeTypeId ?? ""];

    const grants = await cachedRequest(key.join(":"), () =>
      fetchGrants(ids, { badgeTypeId, limit: GRANT_LIMIT })
    ).catch(() => []);

    return recentMembers(grants, count);
  };
}
