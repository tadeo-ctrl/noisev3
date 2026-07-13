# Research And Algorithm Principles

Last updated: 2026-07-09

These are the main recommendation-system patterns and product principles that informed the NOISE relevance proposal.

## Standard Pattern

Large recommendation systems are usually not one formula. They are pipelines.

Common shape:

```text
candidate filtering -> scoring -> re-ranking / mixing -> serving
```

NOISE adapts that pattern as:

```text
Eligibility Routing -> Surface Routing -> Candidate Pool Assignment -> Relevance Scoring -> Feed Re-ranking & Mixing -> Feed Serving
```

## Why This Matters

A single score is too weak for NOISE because the product needs to handle several different decisions:

- whether something is safe or valid enough to show
- whether it can be presented well in the UI
- whether it is culturally relevant
- whether it is rising, falling, niche, or personally relevant
- whether it is being manipulated
- whether it needs curator work
- how to compose a balanced one-at-a-time feed

Trying to force all of this into one score would make the system harder to understand and easier to misuse.

## Correct Terms To Use

Use terms based on the job each component performs:

- `Eligibility Routing` for the first hard status decision.
- `Surface Routing` for deciding where a trend can appear.
- `Candidate Pool Assignment` for assigning internal distribution reasons.
- `Relevance Scoring` for calculating the public ranking score.
- `Feed Re-ranking & Mixing` for balancing the feed after scoring.
- `Feed Serving` for final pass/skip checks before showing an item.
- `Multiplier` for bounded score adjustments.
- `Constraint` for caps, repetition limits, or hard placement limits.
- `Signal` for raw or computed evidence used by scoring.
- `Metric` for measured values with defined ranges.

Avoid vague or invented wording when a standard term exists.

## Hard Rules Versus Scores

Some decisions should happen outside the ranking score.

Examples:

- unsafe or invalid trends should be blocked, not merely scored lower
- hard display issues should affect surface eligibility
- cap limits should be enforced during feed construction
- duplicate checks should happen at serving time

Scores are useful for comparing valid candidates. They are not the right tool for every product rule.

## Confidence

Confidence should reduce the strength of a score when evidence is thin.

The proposal uses a bounded confidence multiplier because the system should still allow early signals to appear, but not over-trust them.

Log-based confidence is useful because early evidence should matter, but the effect should flatten as evidence becomes mature.

## Quality And Presentation

Quality is not one thing.

NOISE separates:

- eligibility quality: can this trend enter the system?
- editorial quality: is the trend clear and useful?
- presentation readiness: can the app display it well?
- context sufficiency: does the user have enough explanation and source context?

This avoids promoting culturally relevant trends that would make the app look low quality.

## Market Signals

Market activity is useful, but not sufficient by itself.

Buy and short behavior can help identify conviction and movement, but it can also be distorted by whales, spam, or coordinated behavior. Market signals should be combined with cultural, curator, attention, quality, and integrity signals.

## Re-ranking And Mixing

After scoring, the feed still needs composition rules.

Reasons:

- avoid showing only one type of trend
- avoid repetition
- reserve space for exploration
- enforce caps
- deduplicate trends that qualify for multiple pools
- reduce manipulation or low-quality dominance

This is especially important for a one-at-a-time feed because each slot has high attention value.

## Human-In-The-Loop

Curators are not just data-labelers. They improve the product surface by adding context, sources, media, and judgment.

The system should route important but weakly presented trends to curators and reward curator work based on improvement and successful publication, not raw volume.
