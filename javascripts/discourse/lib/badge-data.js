import UserBadge from "discourse/models/user-badge";
import { createBadgeLoader } from "./badge-grants";

// Shared across component mounts for this browser page; nothing is persisted
// in local storage or shared with other visitors.
export const loadBadgeGrants = createBadgeLoader({
  fetchGrants: (ids, options) => UserBadge.findByBadgeIds(ids, options),
});
