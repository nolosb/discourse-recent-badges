import { module, test } from "qunit";
import {
  createBadgeLoader,
  recentMembers,
} from "../../javascripts/discourse/lib/badge-grants";

module("Highlighted Badges | recent members", function () {
  test("keeps each member's newest grant before applying the member limit", function (assert) {
    const grants = [
      { id: 1, user: { id: 10 }, grantedAt: 100 },
      { id: 2, user: { id: 20 }, grantedAt: 300 },
      { id: 3, user: { id: 10 }, grantedAt: 400 },
      { id: 4, user: { id: 30 }, grantedAt: 200 },
    ];

    assert.deepEqual(
      recentMembers(grants, 2).map((grant) => grant.id),
      [3, 2]
    );
    assert.deepEqual(
      grants.map((grant) => grant.id),
      [1, 2, 3, 4],
      "does not reorder its input"
    );
  });

  test("skips unavailable users and missing award dates", function (assert) {
    const grants = [
      { id: 1, grantedAt: 400 },
      { id: 2, user: { id: 20 }, grantedAt: null },
      { id: 3, user: { id: 30 }, grantedAt: 200 },
    ];

    assert.deepEqual(
      recentMembers(grants, 6).map((grant) => grant.id),
      [3]
    );
    assert.deepEqual(recentMembers([], 6), []);
  });
});

module("Highlighted Badges | requests", function () {
  test("skips unawarded badges and shares requests across concurrent mounts and return visits", async function (assert) {
    let indexCalls = 0;
    const grantCalls = [];
    const load = createBadgeLoader({
      fetchBadges: async () => {
        indexCalls++;
        return {
          badges: [
            { id: 1, enabled: true, grant_count: 0, badge_type_id: 1 },
            { id: 2, enabled: true, grant_count: 20, badge_type_id: 1 },
            { id: 3, enabled: false, grant_count: 20, badge_type_id: 1 },
          ],
        };
      },
      fetchGrants: async (id) => {
        grantCalls.push(id);
        return [{ id: 10, user: { id: 5 }, grantedAt: 200 }];
      },
    });

    const [first, second] = await Promise.all([load({}), load({})]);
    const third = await load({});
    assert.strictEqual(indexCalls, 1);
    assert.deepEqual(grantCalls, [2]);
    assert.deepEqual(first, second);
    assert.deepEqual(first, third);
  });

  test("explicit IDs skip the index, are deduplicated, and take precedence over tiers", async function (assert) {
    const calls = [];
    const load = createBadgeLoader({
      fetchBadges: () => {
        throw new Error("Index should not be requested");
      },
      fetchGrants: async (id) => {
        calls.push(id);
        return [];
      },
    });
    await load({ badgeIds: [2, "2", 3, -1], tier: "gold" });
    assert.deepEqual(calls, [2, 3]);
  });

  test("expires successful responses and isolates different viewers", async function (assert) {
    let time = 0;
    let calls = 0;
    const load = createBadgeLoader({
      now: () => time,
      fetchGrants: async () => {
        calls++;
        return [];
      },
    });
    await load({ badgeIds: [2] });
    time = 15 * 60_000 - 1;
    await load({ badgeIds: [2] });
    assert.strictEqual(calls, 1, "fresh response is reused");
    time = 15 * 60_000;
    await load({ badgeIds: [2] });
    assert.strictEqual(calls, 2, "expired response is fetched again");
    await load({ badgeIds: [2], viewerId: 10 });
    assert.strictEqual(calls, 3, "another account has a separate cache");
  });

  test("retries a failed grant without refetching successful grants", async function (assert) {
    const calls = [];
    let fail = true;
    const load = createBadgeLoader({
      fetchGrants: async (id) => {
        calls.push(id);
        if (id === 2 && fail) {
          throw new Error("Temporary failure");
        }
        return [{ id, user: { id }, grantedAt: id * 100 }];
      },
    });
    assert.deepEqual(
      (await load({ badgeIds: [1, 2] })).map((grant) => grant.id),
      [1]
    );
    fail = false;
    assert.deepEqual(
      (await load({ badgeIds: [1, 2] })).map((grant) => grant.id),
      [2, 1]
    );
    assert.deepEqual(calls, [1, 2, 2]);
  });

  test("tier and count changes reuse cached data without caching the filtered result", async function (assert) {
    let indexCalls = 0;
    const grantCalls = [];
    const load = createBadgeLoader({
      fetchBadges: async () => {
        indexCalls++;
        return {
          badges: [
            { id: 1, enabled: true, grant_count: 2, badge_type_id: 1 },
            { id: 2, enabled: true, grant_count: 2, badge_type_id: 2 },
          ],
        };
      },
      fetchGrants: async (id) => {
        grantCalls.push(id);
        return [{ id, user: { id }, grantedAt: id * 100 }];
      },
    });
    assert.deepEqual(
      (await load({ tier: "gold" })).map((grant) => grant.id),
      [1]
    );
    assert.deepEqual(
      (await load({ tier: "all", count: 1 })).map((grant) => grant.id),
      [2]
    );
    assert.deepEqual(
      (await load({ tier: "all", count: 6 })).map((grant) => grant.id),
      [2, 1]
    );
    assert.strictEqual(indexCalls, 1);
    assert.deepEqual(grantCalls, [1, 2]);
  });
});
