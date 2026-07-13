# NOISE Relevance Algorithm Base

This is the current internal base for the NOISE relevance system.

Related context lives in `kb/`, especially:

- `kb/noise-platform-context.md`
- `kb/noise-relevance-algorithm-summary.md`
- `kb/noise-research-principles.md`
- `kb/noise-curation-quality-rewards.md`

## Core Principle

NOISE relevance is a multi-stage recommendation system, not a single scoring formula.

The system first decides whether a trend is eligible for a surface. Only then does it score eligible trends and compose the final feed.

## Explainer Writing Rules

Use these rules when updating the internal explainer:

- Keep each section scoped to its own job. Do not explain later stages unless that context is necessary for the current decision.
- Prefer removing confusing helper text over adding caveats.
- Reserve `score` language for actual scoring sections: Relevance Scoring, Curation Opportunity, and Curator Reward Score.
- Use direct output labels such as `Status`, `Route`, `Readiness`, `Surface`, `Pool`, `Multiplier`, or `Feed role`.
- Avoid defensive phrasing such as `not a score`, `handled later`, or `outside the score` in the website UI unless the distinction prevents a real implementation mistake.
- If copy exists mainly to answer a previous chat confusion, remove it from the UI and keep the concept in internal notes instead.
- Detail cards should explain the selected item only: what it is, what inputs it uses, and what it changes.
- Tables should add new information. Remove rows that repeat the title, formula, or section heading.
- Explorer card type labels must use a controlled vocabulary: `Stage`, `Status`, `Rule`, `Formula`, `Metric`, `Pool`, `Signal`, `Multiplier`, or `Reward Factor`.
- Do not create one-off type labels such as `Decision Output`, `Route Input`, `Mapped Input`, `Distribution Rule`, or `Feed Rule`.
- Explorer expressions must use standard algorithm-spec notation:
  - use `Output:` for categorical outputs or route/status results
  - use `Eligible when:`, `Routed when:`, `Assigned when:`, or `Yes when:` for boolean rules
  - use `Range:` plus `Inputs:` for normalized metrics or signals
  - use `Constraint:` for caps, ceilings, repetition limits, or other post-ranking restrictions
  - use `=` only for actual formulas, assignments, or named computed values
  - use `|` for discrete alternatives, never `/`
  - use `AND` / `OR` on separate lines for rule conditions
  - use comparison operators such as `>=`, `<`, and `=` for thresholds and boolean checks
  - include scale conversions such as `/ 100` whenever a 0-100 value is used as a 0-1 multiplier

## Final Shape

```text
Eligibility Routing
-> Surface Routing
-> Candidate Pool Assignment
-> Relevance Scoring
-> Feed Re-ranking & Mixing
-> Feed Serving
```

## 1. Eligibility Routing

Eligibility Routing is a hard routing or filtering decision.

- `Block`: unsafe, duplicate, spam, invalid, severe manipulation, or policy issue. Not ranked.
- `Hold`: potentially valid, but not ready. Routed to curator or review queue.
- `Cap`: valid enough to show, but distribution-limited.
- `Pass`: eligible for normal ranking.

A true block is not a low number. It is a hard exclusion from public ranking.

For `Cap`, limited distribution means controlled exposure or placement in feed construction. It can coexist with a lower Quality Multiplier, but it is not only a score reduction.

## 2. Surface Routing

Surface Routing returns a route set after Eligibility Routing.

Public surface rules should not repeat the first eligibility check. At this stage, public surfaces receive `Pass` and `Cap` trends. `Hold` trends can still enter internal curator work.

A trend can be valid and culturally important but still not ready for the main swipe feed if NOISE cannot display it well yet.

Surface Routing is a multi-label routing decision. More than one route can be active at the same time.

Recommended route outputs:

- `Main Swipe Feed`: eligible | not eligible
- `Search / Detail`: eligible | not eligible
- `Curator Queue`: routed | not routed

Recommended route rules:

- `Main Swipe Feed`: eligible when `Presentation Readiness >= main-feed threshold`, `Context Sufficiency >= lightweight context threshold`, and `Hard Display Issue = no`.
- `Search / Detail`: eligible when `Context Sufficiency >= detail threshold` and `Hard Display Issue = no`.
- `Curator Queue`: routed when `Eligibility Status = Hold`, `Presentation Readiness < target`, `Context Sufficiency < target`, `Hard Display Issue = yes`, or `Content Gaps = yes`.

Recommended presentation formula:

```text
Display Readiness =
max(Visual Readiness, Text Readiness)

Coverage Multiplier =
0.70 + 0.30 x Coverage Sufficiency / 100

Presentation Readiness =
Display Readiness x Coverage Multiplier
```

`Source Context` is not part of `Presentation Readiness`. It belongs inside `Context Sufficiency`, because sources help users understand and trust the trend, but they do not create a display format by themselves.

Recommended context formula:

```text
Context Sufficiency =
0.20 Title Clarity
+ 0.30 Summary Usefulness
+ 0.30 Source Context
+ 0.20 Curator Explanation
```

Presentation Readiness is split into:

- hard display checks outside the score
- `Presentation Multiplier` inside the score

Caps and exposure limits belong in Feed Re-ranking & Mixing, not in Main Swipe Feed surface eligibility.

## 3. Candidate Pool Assignment

Candidate Pools explain why a trend is competing for distribution.

Candidate Pool Assignment is multi-label. A trend can have more than one active internal distribution reason.

Pools are labels, not duplicate feed placements. Feed Re-ranking & Mixing chooses one placement role per feed window and deduplicates the final sequence.

Recommended pools:

- `Top Now`
- `Rising Fast`
- `Falling Fast`
- `Early / Niche`
- `Personal`
- `Needs Better Content`

Pools are internal feed construction groups. They do not need to appear as separate app tabs.

`Momentum Intensity` is the magnitude of movement. `Momentum Direction` stores whether that movement is rising, falling, or flat.

Pool rules should reuse existing signals where possible, especially `Base Cultural Score`, `Confidence Multiplier`, `Presentation Readiness`, `Context Sufficiency`, and `Readiness Gap`.

## 4. Relevance Scoring

The public ranking score applies only after eligibility and surface checks.

```text
NOISE Relevance Score =
Base Cultural Score
x Quality Multiplier
x Presentation Multiplier
x Integrity Multiplier
x Confidence Multiplier
```

Recommended starting point:

```text
Base Cultural Score =
0.25 Attention
+ 0.20 Momentum Intensity
+ 0.15 Market Conviction
+ 0.15 Curation Authority
+ 0.15 Breadth
+ 0.10 Discussion Quality
```

Supporting formulas:

```text
Quality Multiplier =
0.70 + 0.30 x Quality Score / 100

Quality Score =
0.40 Definition Quality
+ 0.35 Evidence Quality
+ 0.25 Editorial Usefulness

Presentation Multiplier =
0.60 + 0.40 x Presentation Readiness / 100

Integrity Multiplier =
1 - Manipulation Risk

Manipulation Risk =
min(1,
  0.35 Whale Concentration
+ 0.25 Spam Risk
+ 0.25 Coordination Risk
+ 0.15 Wash-Trading Risk)

Confidence Multiplier =
0.45 + 0.55 x Raw Confidence

Raw Confidence =
min(1, log(1 + Adjusted Evidence) / log(1 + Evidence Target))
```

The base weights and multiplier bounds are starting proposals and should be calibrated with production outcomes. `Quality Multiplier`, `Presentation Multiplier`, and `Confidence Multiplier` are bounded soft dampeners. `Integrity Multiplier` remains harsher because manipulation risk should be able to strongly reduce rank.

## 5. Feed Re-ranking & Mixing

The final feed should not be a pure sort by score.

After scoring, the system should:

- apply distribution caps
- choose one placement role for multi-label candidates
- rank inside candidate pools
- reserve small exploration slots
- avoid repetition
- deduplicate candidates so one trend appears at most once per feed window
- prevent weak or risky items from dominating top positions

Implementation note: when a trend has multiple pool labels, the feed builder should select one placement role for the current feed window, then deduplicate the final sequence.

Recommended feed-building formulas:

```text
Slot Budget[pool] =
round(Feed Window Size x Target Slot Weight[pool] / sum(Target Slot Weights))

Placement Role =
argmax(Pool Fit[pool])
among active pool labels with Open Slot Budget

Open Slot Budget[pool] =
Slot Budget[pool] - filled slots[pool]

Pool Rank Score =
NOISE Relevance Score x Pool Fit

Cap Ceiling =
min(Status Limit, Quality Limit, Integrity Limit)

Adjusted Pool Rank Score =
Pool Rank Score x Repeat Multiplier

Deduplication =
one Trend ID <= one placement per feed window
keep placement with highest Pool Rank Score
```

`Needs Better Content` is not a public slot budget. It routes to curator work until presentation or context improves.

## 6. Feed Serving

Feed Serving returns the ordered sequence shown to the user.

It should respect eligibility, surface readiness, pool allocation, caps, user context, and integrity controls.

Recommended serving rules:

```text
Served Feed Item =
first item in Final Candidate Queue
where Serving Checks = pass

Final Candidate Queue =
sort candidates by Adjusted Pool Rank Score
after caps, exploration, repeat control, and deduplication

Serving Checks = pass when:
Main Swipe Feed = eligible
AND Open Slot Budget > 0
AND Cap Availability = yes
AND Duplicate Check = no
AND Content Availability = yes

After serving:
write Serving Feedback Log
```

Serving should skip invalid candidates and try the next item in the queue. It should not create a new ranking score.

## Curation Opportunity

Curation Opportunity is not the main public ranking score. It prioritizes curator work.

```text
Curation Opportunity =
Base Cultural Score x Readiness Gap

Readiness Gap =
max(Presentation Gap, Context Gap)

Presentation Gap =
1 - Presentation Readiness / 100

Context Gap =
1 - Context Sufficiency / 100
```

Meaning: culturally important trends with weak presentation or content quality become curator priorities.

Suggested priority tiers:

```text
High priority: Curation Opportunity >= 45
Medium priority: Curation Opportunity >= 25 and < 45
Low priority: Curation Opportunity < 25
```

## Curator Rewards

Curators should be rewarded for making important trends better and safer to distribute, not for raw upload volume or short-term market movement.

```text
Curator Reward Score =
clamp(0, 100,
0.35 Quality Improvement
+ 0.25 Successful Publication
+ 0.20 User Response
+ 0.20 Review Approval
- Flags / Reversals)
```

Supporting formulas:

```text
Quality Improvement =
max(0, New Quality Value - Previous Quality Value)

Flags / Reversals =
min(100,
  0.35 Moderation Flags
+ 0.25 Duplicate Reversals
+ 0.20 Low-Effort Uploads
+ 0.20 Misleading Context)
```

## Important Splits

Quality is split into:

- hard eligibility or quality decision
- `Quality Multiplier` inside the score

Presentation is split into:

- hard display checks
- `Presentation Multiplier` inside the score

Integrity is split into:

- hard safety, manipulation, or policy blocks
- `Integrity Multiplier` inside the score

Confidence stays inside the score because it controls how much the system should trust the available evidence.

## Reference Pattern

This architecture follows the common recommendation-system pattern:

```text
candidate filtering -> scoring -> re-ranking / mixing -> final feed
```

Examples of this pattern appear in large-scale recommendation systems such as YouTube, Google recommendation-system documentation, X/Twitter Home Mixer, TikTok recommendation eligibility guidance, and Meta recommendation guidelines.
