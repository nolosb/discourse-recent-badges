import Component from "@glimmer/component";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import { service } from "@ember/service";
import { themePrefix } from "virtual:theme";
import { block } from "discourse/blocks";
import BadgePill from "discourse/components/user-badge";
import { bind } from "discourse/lib/decorators";
import { relativeAge } from "discourse/lib/formatter";
import getURL from "discourse/lib/get-url";
import { defaultHomepage } from "discourse/lib/utilities";
import DAsyncContent from "discourse/ui-kit/d-async-content";
import DButton from "discourse/ui-kit/d-button";
import DSkeleton from "discourse/ui-kit/d-skeleton";
import DUserLink from "discourse/ui-kit/d-user-link";
import dAvatar from "discourse/ui-kit/helpers/d-avatar";
import { i18n } from "discourse-i18n";
import { loadBadgeGrants } from "../lib/badge-data";

const FeaturedBadge = <template>
  <li class="featured-badge {{@grant.badge.badgeTypeClassName}}">
    <DUserLink @user={{@grant.user}} class="featured-badge__avatar">
      {{dAvatar @grant.user imageSize="large"}}
    </DUserLink>
    <div class="featured-badge__body">
      <DUserLink @user={{@grant.user}} class="featured-badge__username">
        {{@grant.user.username}}
      </DUserLink>
      {{! BadgePill doesn't splat attributes — the class must live on a wrapper }}
      <span class="featured-badge__badge">
        <BadgePill
          @badge={{@grant.badge}}
          @user={{@grant.user}}
          @showName={{true}}
        />
      </span>
      <span class="featured-badge__earned">{{@grant.earnedAgo}}</span>
    </div>
  </li>
</template>;

// Header, body and footer, as in the panel blocks of the theme skills theme.
// The header and footer stay in place while the body loads. Wide containers
// show the link in the header, narrow ones in the footer.
const PanelChrome = <template>
  <div class="featured-badges">
    <section class="featured-badges__panel">
      <header class="featured-badges__header">
        <h3 class="featured-badges__title">{{i18n (themePrefix @title)}}</h3>
        <a href={{getURL "/badges"}} class="featured-badges__link --header">
          {{i18n (themePrefix @linkLabel)}}
        </a>
      </header>
      <div class="featured-badges__body">
        {{yield}}
      </div>
      <footer class="featured-badges__footer">
        <a href={{getURL "/badges"}} class="featured-badges__link">
          {{i18n (themePrefix @linkLabel)}}
        </a>
      </footer>
    </section>
  </div>
</template>;

@block("theme:featured-badges:recent", {
  description:
    "Recently earned badges, adapting to the width of their container",
  allowedOutlets: ["main-outlet-blocks", "sidebar-discovery"],
  args: {
    title: { type: "string", default: "featured_badges.title" },
    linkLabel: { type: "string", default: "featured_badges.link_label" },
    badgeIds: { type: "string", default: "" },
    tier: {
      type: "string",
      enum: ["all", "gold", "silver", "bronze"],
      default: "all",
    },
    count: { type: "number", integer: true, min: 1, max: 50, default: 6 },
  },
})
export default class BlockFeaturedBadges extends Component {
  @service currentUser;
  @service router;
  @service siteSettings;

  viewportEl = null;

  get visible() {
    return (
      this.siteSettings.enable_badges &&
      this.router.currentRouteName === `discovery.${defaultHomepage()}`
    );
  }

  get badgeIds() {
    return this.args.badgeIds
      .split("|")
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  get skeletonRows() {
    return Array.from({ length: this.args.count }, (_, index) => index);
  }

  @action
  registerViewport(element) {
    this.viewportEl = element;
  }

  @action
  scrollPrev() {
    this.#scrollByPage(-1);
  }

  @action
  scrollNext() {
    this.#scrollByPage(1);
  }

  #scrollByPage(direction) {
    this.viewportEl?.scrollBy({
      left: direction * this.viewportEl.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  @bind
  async fetchGrants() {
    const grants = await loadBadgeGrants({
      viewerId: this.currentUser?.id,
      badgeIds: this.badgeIds,
      tier: this.args.tier,
      count: this.args.count,
    });

    if (!grants.length) {
      return null;
    }

    // Derive display values afresh without mutating cached model instances.
    return grants.map((grant) => ({
      id: grant.id,
      user: grant.user,
      badge: grant.badge,
      earnedAgo: relativeAge(new Date(grant.grantedAt), {
        format: "medium",
        leaveAgo: true,
        wrapInSpan: false,
      }),
    }));
  }

  <template>
    {{#if this.visible}}
      <DAsyncContent
        @asyncData={{this.fetchGrants}}
        @retainWhileReloading={{true}}
      >
        <:loading>
          <PanelChrome @title={{@title}} @linkLabel={{@linkLabel}}>
            <div class="featured-badges__loading" aria-busy="true">
              <DSkeleton
                class="featured-badges__skeleton --cards"
                @variant="rect"
                @count={{@count}}
              />
              <div class="featured-badges__skeleton --rows" aria-hidden="true">
                {{#each this.skeletonRows as |row|}}
                  <div class="featured-badges__skeleton-row" data-row={{row}}>
                    <DSkeleton @variant="circle" @size="1.5rem" />
                    <DSkeleton @variant="text" @width="55%" />
                    <DSkeleton @variant="text" @width="2.5rem" />
                  </div>
                {{/each}}
              </div>
            </div>
          </PanelChrome>
        </:loading>
        <:empty></:empty>
        <:content as |grants|>
          {{#if grants.length}}
            <PanelChrome @title={{@title}} @linkLabel={{@linkLabel}}>
              <div class="featured-badges__scroller">
                <DButton
                  @icon="chevron-left"
                  @action={{this.scrollPrev}}
                  @translatedTitle={{i18n
                    (themePrefix "featured_badges.previous")
                  }}
                  class="featured-badges__arrow --prev"
                />

                <div
                  class="featured-badges__viewport"
                  {{didInsert this.registerViewport}}
                >
                  <ul class="featured-badges__track">
                    {{#each grants key="id" as |grant|}}
                      <FeaturedBadge @grant={{grant}} />
                    {{/each}}
                  </ul>
                </div>

                <DButton
                  @icon="chevron-right"
                  @action={{this.scrollNext}}
                  @translatedTitle={{i18n (themePrefix "featured_badges.next")}}
                  class="featured-badges__arrow --next"
                />
              </div>
            </PanelChrome>
          {{/if}}
        </:content>
      </DAsyncContent>
    {{/if}}
  </template>
}
