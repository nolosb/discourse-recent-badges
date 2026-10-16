import { module, test } from "qunit";
import { badgeTypeId, recentMembers } from "../../discourse/lib/badge-grants";

module("Featured Badges | recent members", function () {
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

module("Featured Badges | badge type", function () {
  test("maps tiers to badge types", function (assert) {
    assert.strictEqual(badgeTypeId([], "gold"), 1);
    assert.strictEqual(badgeTypeId([], "bronze"), 3);
    assert.strictEqual(badgeTypeId([], "all"), undefined);
  });

  test("explicit IDs take precedence over tiers", function (assert) {
    assert.strictEqual(badgeTypeId([2, 3], "gold"), undefined);
  });
});
