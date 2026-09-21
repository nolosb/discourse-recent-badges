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

const TickerEntry = <template>
  <li class="highlighted-badge {{@grant.badge.badgeTypeClassName}}">
    <DUserLink @user={{@grant.user}} class="highlighted-badge__avatar">
      {{dAvatar @grant.user imageSize="large"}}
    </DUserLink>
    <div class="highlighted-badge__body">
      <DUserLink @user={{@grant.user}} class="highlighted-badge__username">
        {{@grant.user.username}}
      </DUserLink>
      {{! BadgePill doesn't splat attributes — the class must live on a wrapper }}
      <span class="highlighted-badge__badge">
        <BadgePill
          @badge={{@grant.badge}}
          @user={{@grant.user}}
          @showName={{true}}
        />
      </span>
      <span class="highlighted-badge__earned">{{@grant.earnedAgo}}</span>
    </div>
  </li>
</template>;

@block("theme:highlighted-badges:recent", {
  description:
    "Recently earned badges, adapting to the width of their container",
  allowedOutlets: ["main-outlet-blocks", "sidebar-discovery"],
  args: {
    title: { type: "string", default: "badges_ticker.title" },
    buttonLabel: { type: "string", default: "badges_ticker.button_label" },
    badgeIds: { type: "string", default: "" },
    tier: {
      type: "string",
      enum: ["all", "gold", "silver", "bronze"],
      default: "all",
    },
    count: { type: "number", integer: true, min: 1, max: 50, default: 6 },
  },
})
export default class BlockHighlightedBadges extends Component {
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
          <div class="highlighted-badges" aria-busy="true">
            <section class="highlighted-badges__panel">
              <div class="highlighted-badges__header">
                <h3 class="highlighted-badges__title">
                  {{i18n (themePrefix @title)}}
                </h3>
              </div>
              <DSkeleton
                class="highlighted-badges__loading"
                @variant="rect"
                @count={{@count}}
              />
            </section>
          </div>
        </:loading>
        <:empty></:empty>
        <:content as |grants|>
          {{#if grants.length}}
            <div class="highlighted-badges">
              <section class="highlighted-badges__panel">
                <div class="highlighted-badges__header">
                  <h3 class="highlighted-badges__title">
                    {{i18n (themePrefix @title)}}
                  </h3>
                  <a href={{getURL "/badges"}} class="highlighted-badges__link">
                    {{i18n (themePrefix @buttonLabel)}}
                  </a>
                </div>

                <div class="highlighted-badges__scroller">
                  <DButton
                    @icon="chevron-left"
                    @action={{this.scrollPrev}}
                    @translatedTitle={{i18n
                      (themePrefix "badges_ticker.previous")
                    }}
                    class="highlighted-badges__arrow --prev"
                  />

                  <div
                    class="highlighted-badges__viewport"
                    {{didInsert this.registerViewport}}
                  >
                    <ul class="highlighted-badges__track">
                      {{#each grants key="id" as |grant|}}
                        <TickerEntry @grant={{grant}} />
                      {{/each}}
                    </ul>
                  </div>

                  <DButton
                    @icon="chevron-right"
                    @action={{this.scrollNext}}
                    @translatedTitle={{i18n (themePrefix "badges_ticker.next")}}
                    class="highlighted-badges__arrow --next"
                  />
                </div>

                <DButton
                  class="btn-default highlighted-badges__button"
                  @href={{getURL "/badges"}}
                  @translatedLabel={{i18n (themePrefix @buttonLabel)}}
                />
              </section>
            </div>
          {{/if}}
        </:content>
      </DAsyncContent>
    {{/if}}
  </template>
}
