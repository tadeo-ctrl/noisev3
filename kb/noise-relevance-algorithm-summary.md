# NOISE Relevance Algorithm Summary

Last updated: 2026-07-09

The current algorithm proposal is a multi-stage recommendation pipeline, not one giant formula.

Detailed formulas and writing rules are in `../noise-relevance-algorithm-base.md`.

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

First check: can this trend enter the system?

Outputs:

- `Block` - unsafe, duplicate, invalid, severe manipulation, or policy issue.
- `Hold` - potentially valid, but needs review or preparation.
- `Cap` - valid enough to show, but distribution-limited.
- `Pass` - eligible for normal ranking.

Important distinction: `Block` is not a low score. It is a hard exclusion from public discovery.

## 2. Surface Routing

Second check: where can this trend appear right now?

Possible routes:

- `Main Swipe Feed`
- `Search / Detail`
- `Curator Queue`

More than one route can be active. For example, a trend can appear in Search / Detail while also being routed to curators for better media or context.

## 3. Candidate Pool Assignment

Third check: why is this trend competing for distribution?

Candidate pools:

- `Top Now`
- `Rising Fast`
- `Falling Fast`
- `Early / Niche`
- `Personal`
- `Needs Better Content`

Pools are internal reasons for feed construction. They should not create duplicate appearances. Feed Re-ranking & Mixing chooses one placement role per feed window and deduplicates final output.

## 4. Relevance Scoring

Fourth step: compare eligible trends.

Current formula shape:

```text
NOISE Relevance Score =
Base Cultural Score
x Quality Multiplier
x Presentation Multiplier
x Integrity Multiplier
x Confidence Multiplier
```

Base Cultural Score combines signals such as:

- attention
- momentum intensity
- market conviction
- curation authority
- breadth
- discussion quality

The multipliers adjust the score for quality, presentation readiness, manipulation risk, and confidence in the available evidence.

## 5. Feed Re-ranking & Mixing

Fifth step: turn scored candidates into a balanced feed.

This is where the system:

- allocates feed slots by pool
- chooses one placement role for multi-pool trends
- ranks inside each pool
- applies caps
- reserves small exploration space
- reduces repetition
- deduplicates trends

This prevents the app from becoming a pure score sort where one signal type dominates the feed.

## 6. Feed Serving

Final step: return the next valid item to the app.

Feed Serving checks that the item is still eligible, available, not duplicated, within cap limits, and suitable for the current user/feed request.

Serving should skip invalid candidates and try the next item. It should not create a new relevance score.

## Curation Opportunity

Curation Opportunity is separate from the public relevance score. It identifies important trends that need better content, media, sources, or explanation.

Plain-language meaning:

```text
culturally important + missing quality/context = curator priority
```

This lets NOISE avoid showing weak content too high while still creating a path to improve important trends.
