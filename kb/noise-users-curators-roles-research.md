# NOISE Users And Curators Role Research

Last updated: 2026-07-09

Status: first-pass research memo, not a final product spec.

## Purpose

This note reviews the first `Noise - Posting & Roles` draft against patterns from mature community, discovery, curation, marketplace, and trading systems.

The goal is not to pick the final NOISE role model yet. The goal is to clarify what seems directionally right, where the draft is ambiguous, and which decisions need to be made next.

## Executive Read

The draft's core idea is strong: normal users should be able to earn curator authority by demonstrating taste, judgment, and reliability on NOISE.

The main issue is that the draft currently bundles too many powers into one `Curator` role:

- create trends
- create sub-trends
- create collections
- gate trends through promote/discard swipes
- receive weighted influence through leaderboard rank
- potentially invite or admit future curators

Comparable systems usually do not grant a single broad authority jump. They separate creation, contribution, review, moderation, distribution influence, rewards, and administration into smaller permissions.

The strongest near-term recommendation is:

- expose a simple external model of `User` and `Curator`
- implement a more granular internal permission model
- let users create taste artifacts, especially non-tradable collections
- reserve high-discovery placement, trend creation, duplicate resolution, and gating influence for earned curator permissions
- keep trading performance as one input into taste reputation, not as direct governance authority

## Draft Summary

The attached draft proposes:

- two visible roles: `User` and `Curator`
- a user can become a curator by developing taste on NOISE
- users discover trends, post, trade, and build collections
- curators do everything users can do, plus create trends and sub-trends and gate them through promote/discard swipes
- users cannot create trends or sub-trends
- the table says only curators can post collections
- later text says collections show a user's taste and count toward promotion
- curator rank is driven by trend performance and collection engagement
- higher-ranked curators have more say over what goes live
- open question: should top curators get referral invites for new curators?

## Main Draft Tensions

### 0. Sub-trends Are Really Related Trends

Newer product feedback clarifies that `Sub-trend` is probably not the right concept name.

What was called a sub-trend is a related trend shown on a trend page. The relationship can be many-to-many and multi-layered:

- `AGI` can show `ChatGPT`, `OpenAI`, and `Sam Altman`.
- `OpenAI` can also show `ChatGPT`.

Recommendation:

- treat this as a `Related Trend` graph, not a strict parent-child hierarchy
- avoid designing permissions or ranking as if every sub-trend has one parent
- use relationship strength, relevance, freshness, and curator/user signals to decide which related trends appear first

### 1. Collection Contradiction

The draft says users can build collections, but the permissions table says users cannot post collections.

This matters because collections are also proposed as a core path for users to prove taste and become curators.

Recommendation:

- allow users to create `User Collections`
- reserve promoted, tradable, or official collections for curator/review workflows

### 2. Two Meanings Of Collection

The draft describes collections in two different ways:

- as ETF-like tradable baskets whose performance depends on the trends or sub-trends inside them
- as untradable taste lists that others can like, comment on, share, and save

These are different products with different risk levels.

Recommendation:

- `User Collection`: non-tradable taste list; social and reputational
- `Curated Collection`: reviewed public collection with stronger presentation standards
- `Market Basket` or `Index Collection`: tradable basket; requires stronger integrity, definition, and conflict controls

### 3. Curator Power Is Too Bundled

Creating a trend, improving a trend, reviewing a trend, promoting a trend, and admitting future curators are not the same power.

Recommendation:

- keep `Curator` as a visible role if simplicity matters
- internally split curator permissions by task and risk

### 4. Trading Success Should Not Equal Governance Authority

Trading performance can help identify taste, early spotting, and cultural judgment. But NOISE already treats market signal as manipulable and subject to whale, spam, wash trading, and coordination risks.

Recommendation:

- use trading performance as one reputation input
- do not let trading success alone unlock trend gating or curator admission authority

## External Patterns

### Community Trust And Moderation Systems

Stack Overflow uses reputation as a rough trust proxy. Users earn more site privileges as reputation grows, but privileges unlock progressively, such as voting, flagging, editing, creating tags, and accessing review queues. This is a useful pattern for NOISE because it grants small powers before broad authority.

Wikipedia separates user rights into many groups: pending changes reviewer, rollbacker, autopatrolled, new page reviewer, page mover, administrator, bureaucrat, and others. A user can hold multiple specialized rights. This is a strong pattern for NOISE because cultural trend curation also has separable jobs: source review, media improvement, duplicate detection, trend creation, and final escalation.

Discourse uses trust levels to let experienced members help maintain a community. Its higher trust levels include stronger moderation powers, but trust can also be lost when activity or behavior falls below thresholds.

Reddit separates moderator permissions such as users, settings, flair, mail, posts/comments, wiki, and full permissions. Reddit also uses Contributor Quality Score as a quality/risk classification to help communities filter low-trust activity.

NOISE implication:

- use progressive, revocable permissions
- split powers by action type
- include logs, reversal rates, review queues, and escalation paths
- avoid one irreversible jump from user to high-authority curator

### Curation And Discovery Systems

Product Hunt allows broad submission, but distribution is shaped by engagement and anti-gaming rules. It explicitly discourages fake, paid, or solicited upvotes. The lesson for NOISE is that submission can be open while high-discovery placement remains controlled.

Pinterest treats boards and sections as user-native taste artifacts. Users organize content, and those saves become signals. Pinterest also removes, limits, or blocks content and accounts that spread harmful or spammy content. The lesson is that collections should likely be a core user behavior, not only a curator privilege.

Spotify separates listener playlists, editorial playlists, algorithmic playlists, and personalized editorial playlists. Its "algotorial" model is especially relevant: human editors build candidate pools and brand the experience, then algorithms personalize and order the final result. This maps closely to NOISE's existing Candidate Pool Assignment and Feed Re-ranking & Mixing ideas.

Apple Music external curator guidance shows that promoted curator surfaces often need strict content and presentation standards: clear theme, playlist length, title style, description style, artwork ownership, and update consistency. The lesson is that NOISE promoted collections need editorial standards beyond raw engagement.

TikTok and YouTube both distinguish between content existing on platform and content being eligible for recommendation, monetization, or broad distribution. TikTok may review rising content for safety and limits repeated recommendation of some borderline content. YouTube requires policy compliance and review before monetization, then continues checking partners over time.

Steam Curators are relevant because they are audience-fit intermediaries. Steam says curator value depends on relevance to the audience, not only follower count. It also lets developers filter curators by tags and audience fit. NOISE should use category-specific curator authority, not only one global rank.

NOISE implication:

- "can exist" and "can be highly distributed" should remain separate
- user collections should generate taste signals
- curator work should create candidate pools, presentation improvements, and context
- final feed ranking should remain algorithmic and integrity-aware
- curator reputation should be category-specific

### Trading, Forecasting, And Marketplace Reputation Systems

Prediction markets such as Polymarket and Kalshi expose performance, volume, and leaderboard-like status, but public docs do not suggest top traders gain broad marketplace governance powers. Market integrity systems focus on insider trading, manipulation, wash trading, spoofing, self-dealing, and users who can influence outcomes.

eToro is the closest social-trading model. Strong users can become copyable investors and can earn AUC-based payments, but they must satisfy constraints such as account history, equity, risk score, drawdown, position size, diversification, copiers, and compliance. The reward is visibility/economics, not marketplace governance.

Airbnb Superhost and similar marketplace programs convert reliable performance into status, badges, visibility, and benefits. Superhost is reassessed quarterly and can be lost. This supports a rolling, revocable curator status model.

Forecasting platforms such as Metaculus use proper scoring rules, peer-relative scoring, time-weighted forecasts, and coverage incentives. This is relevant to early trend spotting because NOISE should reward calibrated, early, repeated judgment instead of lucky one-off calls.

NOISE implication:

- split `Trader Reputation` from `Curator Authority`
- evaluate early spotting over many observations, not a single win
- use rolling windows, minimum activity thresholds, and risk-adjusted performance
- penalize extreme, lucky, or manipulative behavior
- include conflict rules when curators can affect markets they trade

## Recommended NOISE Role Framing

### Public Role Model

Keep the public model simple:

- `User`
- `Curator`
- possibly `Super Curator` as an internal or lightly exposed status

This avoids overwhelming users.

### Internal Permission Model

Under the hood, use granular permissions:

| Permission | What it allows | Suggested gate |
| --- | --- | --- |
| User Collection Creator | Create non-tradable collections | normal user |
| Post Creator | Post under trends/sub-trends | normal user |
| Trend Drafter | Submit trend drafts to review | trusted user or curator candidate |
| Source Curator | Add sources, links, evidence, explanations | curation quality threshold |
| Media Curator | Add or improve media/presentation | presentation quality threshold |
| Trend Creator | Create live trend candidates | curator permission |
| Sub-trend Creator | Create sub-trends under approved trends | curator permission plus category fit |
| Review Curator | Swipe promote/discard or review trend readiness | curator permission plus review reliability |
| Duplicate Resolver | Merge or mark duplicate/ambiguous trends | higher trust threshold |
| Market Basket Creator | Create tradable baskets/indexes | high trust plus review approval |
| Curator Nominator | Nominate new curators | top curator with referral quality tracking |
| Super Curator | Approve high-impact, risky, or disputed work | staff-selected or exceptional trust |

## Collections Recommendation

Collections should not be one object at first.

## Second Collections Draft Read

The later `Collections - NOISE` draft defines a collection as a weighted basket of trends with its own `Degree`, derived from the degree of the trends it holds. It also proposes ranking collections by performance, momentum, breadth, normalized engagement, adoption, credit inflow, curator track record, and freshness.

This draft changes the interpretation in one important way: it makes `Collection` much more clearly a market-like product, not just a social taste list.

That strengthens the earlier recommendation to split collection types:

- a lightweight user-created taste object
- a reviewed curated/editorial object
- a market basket or index object with its own degree and trading/inflow implications

It does not remove the need for user collections. If anything, it makes that distinction more important. A collection with weighted exposure, holder/follower growth, credit inflow, and creator track record is too consequential to be the only form of collection users can create freely.

Useful additions from the second draft:

- `Momentum` prevents static high-degree collections from dominating forever.
- `Breadth` reduces over-reliance on one trend carrying the basket.
- Engagement is correctly framed as normalized rates, not raw totals.
- `Adoption` captures whether users are actually backing or following the collection.
- `Freshness` prevents stale baskets from sitting too high.
- `Curator track record` ties collection quality back to creator reputation.

Open issues introduced by the second draft:

- `Impact weight` needs a definition. Is it curator-assigned, algorithmic, fixed at creation, market-cap-like, equal weight, or rebalanced over time?
- `Credits forecasted into the collection` needs a product definition. Does it mean user deposits, predicted inflow, committed capital, watchlist intent, or something else?
- `Holders` and `followers` should not be merged without care. Holding is economic conviction; following may only be interest.
- If a collection has its own degree, the system needs rules for rebalancing, adding/removing trends, and whether historical degree is restated.
- Creator and curator conflicts become sharper. A curator who creates or rebalances a market basket may also hold positions in the basket or its underlying trends.
- Ranking collections on trend pages should include relevance to the parent trend, not only global collection performance.
- Engagement and adoption should be unique-user and integrity-adjusted to avoid self-promotion and coordinated boosting.

Recommended feedback on the second draft:

- Treat this as the spec direction for `Market Basket` or `Index Collection`, not for all collections.
- Keep a separate `User Collection` concept for taste-building and curator candidacy.
- Define weight/rebalance rules before allowing market-like collections to affect trading or rewards.
- Split ranking into at least two jobs: `collection performance` and `collection relevance to the current trend page`.
- Add integrity controls for creator holdings, curator track record, unique-user engagement, wash trading, and coordinated inflow.
- Make freshness a decay plus an update-quality signal, not just a boost for any newly added trend.

## Call Feedback On Current Direction

Recent team feedback clarifies several intended product rules.

### Related Trends

The old `Sub-trend` language should likely be replaced or softened. These are related trends shown inside a trend page, not strict children.

Implication:

- trend relationships should be modeled as a graph
- a trend can belong under many other trends
- related trend ranking should be separate from collection ranking

### User Collections

Users should be able to create their own collections.

Current direction:

- user collections can be public or private
- public collections are visible from the user's profile
- user collections may be tradable if the creator enables trading
- other users can trade a public tradable user collection from that user's profile
- user collections are not surfaced by NOISE on homepage or trend-page collection modules unless they come from, or are promoted by, curators

Implication:

- earlier `User Collection` guidance should allow both non-tradable and profile-tradable variants
- the key distinction is not only tradable versus non-tradable, but `platform-surfaced` versus `profile-accessible`
- profile-accessible tradable collections still need integrity controls, but may have lower review requirements than platform-surfaced collections

### Platform-Surfaced Collections

NOISE currently surfaces trends on the homepage. Collections are surfaced mainly from trend pages: when a user opens a trend, they see collections that contain that trend. Clicking a collection shows the trends inside it and allows trading actions.

Current direction:

- platform-surfaced collections on trend pages should come from curators
- ordering matters because top positions will get more clicks and trading actions
- the ranking should prioritize valuable collections first, not raw engagement only

Implication:

- collection ranking needs its own algorithm
- ranking should include performance, relevance to the current trend, breadth, normalized engagement, adoption, curator reputation, freshness, and integrity
- collection ranking should not be a pure sort by collection degree

### Curator Admission

Curators can enter through:

- direct invitation from NOISE
- referral codes from existing curators

Current direction:

- each curator may have three referral codes
- referred users become curators if accepted through the referral flow
- bad curator referrals should penalize the referring curator
- penalties can include removing referral ability, reducing action weight, or revoking curator status in severe cases

Implication:

- curator referrals are stronger than the earlier "nomination only" recommendation
- the system needs referral quality tracking and abuse controls
- a referral code should carry accountability for the inviter

### Curator Action Weighting

Current direction:

- every curator can perform curator actions
- actions have different weights based on the curator's performance
- very poor or harmful behavior can lead to curator revocation
- topic-specific history should affect action weight

Implication:

- the permission model can stay broad at the product level
- the trust model should be weighted and contextual underneath
- a curator with strong history around a related trend/topic should have more influence than an equally ranked curator with no relevant history

Possible weighting shape:

```text
Curator Action Weight =
Base Curator Weight
x Global Curator Reputation
x Topic Affinity Reputation
x Action-Type Reliability
x Integrity Multiplier
x Referral Quality Multiplier
x Conflict Adjustment

with caps and escalation for high-impact actions
```

### User To Curator Signals

User-to-curator movement should not be automatic.

Current direction:

- strong user collection signals can create a `Curator Nominee` alert for the NOISE team
- relevant signals include profile visits, collection usage, likes, saves, and especially trading actions from other users
- private collections may still create internal signals if others are using or trading them through allowed access paths

Implication:

- promotion is staff-mediated or review-mediated
- the system should detect nominee spikes
- financial action by other users is a stronger signal than passive engagement, but should be integrity-adjusted

### User Collection

Purpose:

- express taste
- organize cultural themes
- create social engagement
- generate promotion signals
- help users become curators

Properties:

- non-tradable by default, but may become profile-tradable if enabled
- created by users and curators
- can be public, private, or unlisted
- public profile collections can be viewed and potentially traded from the creator's profile
- user collections are not platform-surfaced unless promoted or curated
- engagement should count only from unique, quality-weighted users
- spam, self-engagement, or coordinated engagement should be discounted

### Curated Collection

Purpose:

- higher-quality public collection with editorial value
- may appear on trend pages or discovery surfaces

Properties:

- can be created by curators
- may also be promoted from strong user collections
- requires clear theme, useful description, coherent contents, and no misleading framing
- can earn curator reputation if it improves user understanding or discovery

### Market Basket Or Index Collection

Purpose:

- tradable basket of trends/sub-trends
- closer to the ETF analogy in the draft

Properties:

- should not be created freely by normal users at first
- requires definition, contents, weighting, rebalancing rules, and risk disclosure
- requires conflict controls if the creator trades constituents
- should be reviewed before trading is enabled

## User To Curator Promotion

Promotion should be based on multiple dimensions, not one score.

Candidate dimensions:

- `Taste Signal`: early spotting, collection engagement, saves, shares, repeat interest, breadth of cultural areas
- `Market Judgment`: risk-adjusted early positions, breadth across trends, drawdown, persistence, low manipulation risk
- `Curation Quality`: approved sources, useful explanations, presentation improvements, accepted edits
- `Review Reliability`: agreement with later outcomes, low reversal rate, useful flags, duplicate accuracy
- `Integrity Record`: no serious flags, no suspicious coordination, account age, identity or account security where appropriate
- `Category Fit`: demonstrated strength in specific domains such as music, fashion, internet culture, sports, gaming, finance, or politics

Do not require every curator to be good at every dimension. A strong source curator and a strong early spotter may be different people.

## Curator Leaderboard

The draft's curator leaderboard should be split into multiple views or at least multiple underlying factors.

Avoid one global rank that does everything.

Recommended dimensions:

- `Taste Rank`: early discovery and high-quality collections
- `Curation Quality Rank`: trend improvements that pass review and improve readiness/context
- `Review Reliability Rank`: promote/discard decisions that later prove accurate
- `Category Rank`: authority within a cultural area
- `Integrity Standing`: multiplier or gate, not a vanity rank

Possible authority shape:

```text
Curator Vote Weight =
Base Curator Weight
x Category Fit Multiplier
x Review Reliability Multiplier
x Integrity Multiplier
x Conflict Adjustment

with a hard maximum per curator
and quorum requirements for high-impact actions
```

This lets top curators matter without letting one person push a high-impact trend live alone.

## Trend Gating

Curator swipes should not be a simple majority popularity contest.

Recommended route:

- curator actions help determine whether a trend stays in `Hold`, moves to `Pass`, gets `Cap`, or is routed to `Curator Queue`
- trend creation and promotion should use review thresholds that vary by risk
- high-risk or high-market-impact trends require stronger quorum or super-curator approval
- curator actions should be logged and reversible
- repeated bad approvals, duplicate creation, misleading framing, or policy reversals should lower curator authority

This matches the existing NOISE algorithm split:

```text
Eligibility Routing
-> Surface Routing
-> Candidate Pool Assignment
-> Relevance Scoring
-> Feed Re-ranking & Mixing
-> Feed Serving
```

Curators should influence eligibility, readiness, context, candidate pools, and curation opportunity. They should not replace the feed ranking system.

## Conflict And Integrity Rules

NOISE has a special risk because users can trade the same trends they help define or promote.

Curator influence should be reduced or excluded when a curator:

- created the trend
- holds a large position in the trend
- recently traded the trend before or after a gating decision
- is affiliated with the trend subject
- can influence the real-world outcome
- was paid or incentivized by a related party
- referred the creator or candidate curator being reviewed
- has suspicious coordinated engagement around the object

Open design choice:

- allow trading and curation with disclosure and weight reduction
- or require some actions to be trade-restricted for a cooldown window

The stricter model is safer for high-impact trend gating and tradable baskets.

## Curator Referrals

Top-curator referrals make sense as nominations, not automatic admission.

Recommended model:

- top curators can nominate candidates
- nomination creates a review queue item
- candidates still need objective eligibility checks
- the nominating curator's future referral quality is tracked
- poor referrals reduce nomination privileges
- coordinated nomination rings are discounted or blocked

This preserves community growth without creating an authority loop.

## Draft Feedback Summary

Concrete feedback to give on the draft:

1. Keep the broad idea that users can earn curator status by developing taste.
2. Fix the collection contradiction: users should be able to create non-tradable collections.
3. Split collections into taste lists and tradable baskets.
4. Do not make curators a single all-powerful role internally.
5. Separate trader reputation from curator authority.
6. Make curator rank category-specific and revocable.
7. Use curator swipes as weighted review signals with quorum and caps, not unilateral gates.
8. Make top-curator referrals nominations, not admissions.
9. Add conflict rules for curators who trade, create, or promote the same trend.
10. Align role mechanics with the existing algorithm: curators improve eligibility, readiness, context, and candidate pools; the feed system still ranks and mixes.

## Open Questions For The Team

### Role Surface

- Should NOISE publicly show only `User` and `Curator`, while keeping granular permissions hidden?
- Should `Super Curator` be public, internal, or only visible through actions/attribution?
- Should curators be category-specific from day one?

### Collections

- Are user collections primarily social/taste artifacts, market products, or both?
- If tradable collections exist, should they be called something else, such as `Baskets`, `Indexes`, or `Market Collections`?
- Can strong user collections be promoted into curated collections?
- What standards should promoted collections meet?

### Promotion

- What minimum activity should a user need before curator eligibility?
- Should curator status be applied globally or per category?
- Should promotion be automatic, application-based, nomination-based, or hybrid?
- How often should curator status be reassessed?

### Trading And Conflicts

- Can curators trade trends they create or approve?
- Should curator votes be excluded, reduced, or simply disclosed when they hold positions?
- Should there be cooldown windows before or after high-impact curator actions?
- Should trend creators be allowed to profit from market activity in that trend?

### Leaderboards And Rewards

- Should NOISE show one curator leaderboard or multiple leaderboards?
- Which signals should affect money/rewards versus status versus actual gating weight?
- Should trading performance appear in curator rank, or only in a separate trader/spotter rank?
- How should the system avoid rewarding volume instead of useful improvements?

### Review And Appeals

- What actions require super-curator approval?
- Can users appeal trend rejection, duplicate merges, or collection demotion?
- What should happen when a curator's past decisions are reversed?
- How visible should curator decision logs be?

## Source Notes

Community trust and modular permissions:

- Stack Overflow reputation: https://stackoverflow.com/help/whats-reputation
- Stack Overflow privileges: https://stackoverflow.com/help/privileges
- Wikipedia user groups: https://en.wikipedia.org/wiki/Wikipedia:User_groups
- Discourse trust levels: https://blog.discourse.org/2018/06/understanding-discourse-trust-levels/
- Reddit moderator permissions: https://support.reddithelp.com/hc/en-us/articles/15484498369428-User-Management-moderators-and-permissions
- Reddit Contributor Quality Score: https://support.reddithelp.com/hc/en-us/articles/19023371170196-What-is-the-Contributor-Quality-Score

Curation and discovery:

- Product Hunt preparing for launch: https://www.producthunt.com/launch/preparing-for-launch
- Product Hunt community guidelines: https://help.producthunt.com/en/articles/3615694-community-guidelines
- Product Hunt award points: https://www.producthunt.com/p/producthunt/how-product-of-the-day-week-month-are-chosen
- Pinterest board sections: https://help.pinterest.com/en/article/create-a-board-section
- Pinterest community guidelines: https://policy.pinterest.com/en/community-guidelines
- Pinterest Creator Code announcement: https://newsroom-archive.pinterest.com/creatorcode
- Spotify playlist types: https://support.spotify.com/us/artists/article/types-of-spotify-playlists/
- Spotify artificial streaming: https://support.spotify.com/us/artists/article/third-party-services-that-guarantee-streams/
- Spotify algotorial playlists: https://engineering.atspotify.com/2023/04/humans-machines-a-look-behind-spotifys-algotorial-playlists
- Apple Music curator best practices: https://help.apple.com/itc/musiccuratorbestpractices/en.lproj/static.html
- TikTok recommendation overview: https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content
- YouTube Partner Program eligibility: https://support.google.com/youtube/answer/72851
- YouTube monetization policies: https://support.google.com/youtube/answer/1311392
- Steam Curators and Curator Connect: https://partner.steamgames.com/doc/marketing/curators

Trading, forecasting, and marketplace trust:

- eToro Pro Investor Program: https://www.etoro.com/copytrader/popular-investor/
- Polymarket US market integrity: https://integrity.polymarket.us/
- Kalshi market rules: https://help.kalshi.com/en/articles/13823822-market-rules
- Kalshi market maker program: https://help.kalshi.com/en/articles/13823819-how-to-become-a-market-maker-on-kalshi
- Airbnb Superhost requirements: https://www.airbnb.com/help/article/829
- Metaculus scores FAQ: https://www.metaculus.com/help/scores-faq/
