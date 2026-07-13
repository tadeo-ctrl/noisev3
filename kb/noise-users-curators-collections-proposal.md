# NOISE Users, Curators, Related Trends, And Collections Proposal

Last updated: 2026-07-09

Status: working product proposal.

## 1. Purpose

This document defines a clear starting model for how users, curators, related trends, and collections should work in NOISE.

The goal is to keep the product simple for users while giving NOISE enough structure to rank collections, weight curator actions, detect strong curator candidates, and reduce manipulation.

## 2. Core Model

NOISE is organized around trends.

Users discover, trade, discuss, and create collections around trends. Curators do the same, but their collections and actions can influence surfaced areas of the product.

The main distinction is:

- users can create and trade collections from their own profile
- curators can create collections that are surfaced by NOISE on trend pages

This keeps creation open while keeping platform distribution quality-controlled.

## 3. Related Trends

The term `Sub-trend` should be replaced with `Related Trend`.

Related trends are not strict children. They are trends connected to another trend to help users explore the trend graph.

Example:

- `AGI` can show related trends such as `ChatGPT`, `OpenAI`, and `Sam Altman`.
- `OpenAI` can also show `ChatGPT`.

A trend can be related to many other trends, and these relationships can form multiple layers. This should be modeled as a graph, not a fixed hierarchy.

## 4. Roles

### User

A user can:

- discover trends
- buy or short trends
- comment or post where supported
- create collections
- make collections public on their profile or keep them private
- optionally make their collections tradable from their profile

User collections are not surfaced by NOISE on trend pages unless the user later becomes a curator or the collection is otherwise promoted through a curator path.

### Curator

A curator is a user with platform influence.

A curator can:

- do everything a user can do
- create collections that are surfaced on trend pages
- create or help define trends
- link related trends
- promote, discard, or review trends
- help identify duplicates or low-quality entries

All curators may perform curator actions, but the weight of those actions should vary based on reputation, topic affinity, action history, integrity, and conflicts.

### NOISE Team

The NOISE team handles:

- direct curator invitations
- curator nominee review
- curator revocation
- severe abuse or manipulation cases
- edge cases where curator consensus is unreliable

This does not need to be exposed as a public role.

## 5. Collections

A collection is a basket of trends.

Collections can contain any trend on NOISE. Collections should not contain other collections in the initial model.

Each collection has:

- creator
- visibility
- tradability setting
- included trends
- collection degree
- performance history
- engagement and trading activity

### Collection Visibility

Recommended visibility states:

- `Private`: visible only to the creator.
- `Public Profile`: visible on the creator's profile and tradable from the profile if trading is enabled.
- `Platform Surfaced`: visible in NOISE surfaces such as trend pages. In the current model, this applies to curator-created collections.

Private collections can still signal the creator's taste through performance. Public profile collections can additionally generate social and trading signals from other users.

## 6. User Collections

Users can create collections freely.

A user collection can be:

- private
- public on the user's profile
- tradable from the user's profile if enabled

No approval is required before a user collection becomes tradable, because users must intentionally visit the creator's profile, inspect the collection, and decide whether to act on it.

User collections are useful for:

- expressing taste
- tracking cultural themes
- creating market signal
- building user reputation
- identifying curator nominees

User collections should not appear automatically on trend pages.

If a user later becomes a curator, their public/profile collections can enter the curator collection pool and become eligible for platform surfacing.

## 7. Curator Collections

A curator collection is a collection created by a curator.

It does not need a separate approval step before surfacing. Curator collections should appear on the relevant trend pages for the trends they contain.

However, surfacing does not mean equal placement. Curator collections should be ranked so that the most valuable collections appear first.

Curators can create collections around any trend. Collections connected to areas where the curator has stronger topic history should receive more ranking support than collections in areas where the curator has no track record.

## 8. Collection Degree And Weights

A collection's degree should be derived from the trends inside it.

Recommended starting formula:

```text
Collection Degree =
sum(Trend Weight x Trend Degree)
```

For the first version, NOISE should strongly consider equal weighting:

```text
Trend Weight = 1 / Number of Trends in Collection
```

Equal weighting is the simplest starting point because it is easy to understand, hard to misrepresent, and avoids one creator quietly making a collection depend almost entirely on one trend.

Later, NOISE can consider curator-defined weights with constraints:

- weights must be visible
- weights must sum to 100%
- no single trend can exceed a maximum weight
- weight changes must be logged
- rebalancing rules must be clear

This follows the general pattern used by index products: common approaches include market-cap weighting, equal weighting, modified/capped weighting, and periodic rebalancing. For NOISE, equal weighting is the cleanest MVP because trend markets are cultural and early, not mature equity markets.

## 9. Ranking Collections On Trend Pages

When a user opens a trend page, NOISE should show curator collections that contain that trend.

Because top positions will get more clicks and trading action, ranking should not be based only on collection degree or raw engagement.

Recommended starting inputs:

- `Trend Relevance`: how central the current trend is to the collection.
- `Collection Performance`: collection degree, momentum, and historical performance.
- `Breadth`: whether performance comes from several trends instead of one.
- `Curator Authority`: curator reputation, topic affinity, and action history.
- `Market Adoption`: unique traders, holders, trading volume, credit inflow, and growth.
- `Discussion Quality`: useful comments or posts, not raw comment spam.
- `Freshness`: recent meaningful updates, with small support for newer promising collections.
- `Integrity`: manipulation, wash trading, self-dealing, or coordinated action risk.

Suggested ranking shape:

```text
Collection Rank Score =
0.30 Trend Relevance
+ 0.25 Collection Performance
+ 0.15 Curator Authority
+ 0.15 Market Adoption
+ 0.05 Discussion Quality
+ 0.05 Breadth
+ 0.05 Freshness

then apply Integrity and Conflict adjustments
```

These weights are a starting point, not a final calibration. Relevance and market performance should matter most, with curator authority helping distinguish which collections deserve earlier placement.

### Diversity

NOISE should avoid showing only the same large collections at the top.

Recommended constraints:

- avoid near-duplicate collections in the first few slots
- limit repeated dominance by the same curator where possible
- reserve a small amount of space for newer collections with promising early signal

This should be a light re-ranking rule, not a separate product surface.

## 10. Curator Admission

There are three curator paths:

### Direct Invitation

NOISE can directly invite users to become curators.

### Curator Referral

Each curator starts with three referral codes.

A referral code makes the invited person a curator automatically. Because this grants real platform influence, the inviting curator is accountable for referral quality.

Curators can earn additional referral codes over time if:

- their own performance is strong
- referred curators perform well
- referred curators do not abuse the system
- referral activity improves the platform

Curators can lose referral privileges or curator status if they invite harmful, inactive, manipulative, or consistently low-quality curators.

### Curator Nominee Alert

Normal users should not become curators automatically.

Instead, NOISE should detect strong candidates and send them to the NOISE team for review.

Signals should include:

- strong user collection performance
- other users trading the user's public profile collections
- repeated useful posts or comments
- early trend spotting
- broad enough activity history
- clean integrity record

Profile visits alone should not be a major signal because they are too weak and easy to misread.

## 11. Curator Action Weighting

All curators can perform curator actions, but their actions should not all carry the same weight.

Recommended shape:

```text
Curator Action Weight =
Base Curator Weight
x Global Curator Reputation
x Topic Affinity Reputation
x Action-Type Reliability
x Integrity Multiplier
x Referral Quality Multiplier
x Conflict Adjustment
```

### Topic Affinity

NOISE does not need fixed categories to measure topic expertise.

Topic affinity can be inferred from:

- trend graph proximity
- collections the curator created
- trends the curator has successfully acted on
- related trend overlap
- text or embedding similarity between trends
- user trading response to the curator's collections

A curator with a strong track record around AI-related trends should carry more weight on `OpenAI`, `ChatGPT`, or `AGI` than an equally ranked curator with no history in that area.

### Actions That Should Be Weighted

Weighting matters most for actions that affect distribution or platform quality:

- promoting or discarding trends
- linking related trends
- creating curator collections
- ranking influence from curator collections
- duplicate marking
- blocking or severe quality actions

Most actions should not require heavy approval. However, critical negative actions should have stronger checks.

Recommended stronger checks:

- duplicate merges
- blocking trends
- severe discard actions
- actions by new or low-reputation curators
- actions with obvious conflicts of interest

These can require quorum, stronger weighted support, or NOISE team review.

## 12. Trading Conflicts

Curators can trade trends and collections they create, promote, discard, or surface.

This is acceptable because trading is core to NOISE. However, curator action weight should be adjusted when the curator has a financial interest.

Examples:

- a curator holds a large position in a trend they are promoting
- a curator creates a collection where one trend is a major component and they hold that trend
- a curator discards a competing trend while holding a related position

Recommended rule:

- do not block the action by default
- reduce the curator's action weight when financial exposure is material
- track these cases internally
- consider cooldown windows later if manipulation becomes a problem

## 13. Rewards And Penalties

Curators should be rewarded for improving NOISE, not simply for being active.

Positive signals:

- collections that perform well
- collections that users trade
- useful trend creation or related trend linking
- accurate promote/discard actions
- high-quality referred curators
- strong topic-specific performance

Negative signals:

- manipulation
- spam
- inactive referred curators
- low-quality referred curators
- repeated poor promote/discard actions
- duplicate or misleading trend work
- coordinated trading or engagement

Penalties can include:

- lower action weight
- reduced ranking support
- loss of referral codes
- loss of referral privileges
- curator status removal

## 14. Suggested Proposal Structure

The final spec can be organized as:

1. Product principles
2. Object model
3. Related trends
4. User role
5. Curator role
6. Collections model
7. User collections
8. Curator collections
9. Collection degree and weights
10. Trend-page collection ranking
11. Curator admission and referrals
12. Curator action weighting
13. Trading conflicts
14. Rewards, penalties, and abuse controls
15. Open questions and future extensions

## 15. Open Questions

These decisions can be deferred, but should be tracked:

- Should user collections have an `unlisted` option in addition to private and public profile?
- When a user becomes a curator, should all public collections become surfaced automatically or only new/selected ones?
- What maximum weight should a single trend be allowed to hold if creator-defined weights are introduced later?
- How much exploration space should be reserved for newer curator collections?
- Should cooldown windows be added if curator trading conflicts become common?
- Should curator collections ever appear on the homepage, or only on trend pages?

## Source Notes

Index and basket weighting patterns reviewed:

- S&P Dow Jones Index Mathematics Methodology: https://www.spglobal.com/spdji/en/methodology/article/index-mathematics-methodology/
- MSCI Index Calculation Methodology: https://www.msci.com/indexes/documents/methodology/0_MSCI_Index_Calculation_Methodology_20240812.pdf
- FTSE Russell Equal Weight Indices: https://www.lseg.com/en/ftse-russell/indices/russell-equal-weight
- Nasdaq-100 Index Methodology: https://indexes.nasdaq.com/docs/Methodology_NDX.pdf
