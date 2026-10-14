import { module, test } from "qunit";
import {
  createBadgeLoader,
  GRANT_LIMIT,
  recentMembers,
} from "../../javascripts/discourse/lib/badge-grants";

module("Highlighted Badges | recent members", function () {
  test("keeps each member's first grant in feed order before applying the member limit", function (assert) {
    const grants = [
      { id: 3, user: { id: 10 }, grantedAt: 400 },
      { id: 2, user: { id: 20 }, grantedAt: 300 },
      { id: 4, user: { id: 30 }, grantedAt: 200 },
      { id: 1, user: { id: 10 }, grantedAt: 100 },
    ];

    assert.deepEqual(
      recentMembers(grants, 2).map((grant) => grant.id),
      [3, 2]
    );
    assert.deepEqual(
      recentMembers(grants, 6).map((grant) => grant.id),
      [3, 2, 4]
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
  test("shares one feed request across concurrent mounts and return visits", async function (assert) {
    const calls = [];
    const load = createBadgeLoader({
      fetchGrants: async (ids, options) => {
        calls.push({ ids, options });
        return [{ id: 10, user: { id: 5 }, grantedAt: 200 }];
      },
    });

    const [first, second] = await Promise.all([load({}), load({})]);
    const third = await load({});
    assert.deepEqual(calls, [
      { ids: [], options: { badgeTypeId: undefined, limit: GRANT_LIMIT } },
    ]);
    assert.deepEqual(first, second);
    assert.deepEqual(first, third);
  });

  test("maps tiers to badge types", async function (assert) {
    const calls = [];
    const load = createBadgeLoader({
      fetchGrants: async (ids, options) => {
        calls.push(options.badgeTypeId);
        return [];
      },
    });
    await load({ tier: "gold" });
    await load({ tier: "bronze" });
    await load({ tier: "all" });
    assert.deepEqual(calls, [1, 3, undefined]);
  });

  test("explicit IDs are normalized and take precedence over tiers", async function (assert) {
    const calls = [];
    const load = createBadgeLoader({
      fetchGrants: async (ids, options) => {
        calls.push({ ids, badgeTypeId: options.badgeTypeId });
        return [];
      },
    });
    await load({ badgeIds: [3, "2", 2, -1], tier: "gold" });
    await load({ badgeIds: [2, 3] });
    assert.deepEqual(
      calls,
      [{ ids: [2, 3], badgeTypeId: undefined }],
      "the same IDs in another order reuse the cached feed"
    );
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

  test("renders nothing after a failed request and retries on the next load", async function (assert) {
    let calls = 0;
    const load = createBadgeLoader({
      fetchGrants: async () => {
        calls++;
        if (calls === 1) {
          throw new Error("Temporary failure");
        }
        return [{ id: 1, user: { id: 1 }, grantedAt: 100 }];
      },
    });
    assert.deepEqual(await load({}), []);
    assert.deepEqual(
      (await load({})).map((grant) => grant.id),
      [1]
    );
    assert.strictEqual(calls, 2);
  });

  test("count changes reuse the cached feed", async function (assert) {
    let calls = 0;
    const load = createBadgeLoader({
      fetchGrants: async () => {
        calls++;
        return [
          { id: 2, user: { id: 2 }, grantedAt: 200 },
          { id: 1, user: { id: 1 }, grantedAt: 100 },
        ];
      },
    });
    assert.deepEqual(
      (await load({ count: 1 })).map((grant) => grant.id),
      [2]
    );
    assert.deepEqual(
      (await load({ count: 6 })).map((grant) => grant.id),
      [2, 1]
    );
    assert.strictEqual(calls, 1);
  });
});
