# Curation, Quality, And Rewards

Last updated: 2026-07-09

## Core Problem

A trend can be culturally relevant but still bad to show high in the app if NOISE does not have good enough content for it.

Example:

- A trend is important.
- Curators uploaded only low-resolution, badly cropped, or text-heavy media.
- The main feed would look low quality if that content is surfaced too high.

The algorithm should not solve this only by hiding the trend. It should also create a clear path for curators to improve it.

## Quality Split

Quality should be split into several jobs:

- `Eligibility Routing` handles hard invalid, unsafe, duplicate, or severely manipulated cases.
- `Surface Routing` decides whether the trend can appear on specific surfaces.
- `Quality Multiplier` adjusts ranking strength for valid trends with quality weaknesses.
- `Presentation Multiplier` adjusts ranking strength based on display readiness.
- `Curation Opportunity` prioritizes curator work when culturally important trends need better content.

## Presentation Versus Context

Presentation is about whether the app can show the trend well.

Examples:

- strong image or video
- clean text card
- good aspect ratio
- enough visual or text quality for the main swipe feed

Context is about whether users can understand and trust the trend.

Examples:

- clear title
- useful summary
- sources
- curator explanation

Source quality should support `Context Sufficiency`, not replace visual or text display readiness.

## Curation Opportunity

Use Curation Opportunity to decide what curators should work on.

Plain-language logic:

```text
culturally important trend + weak presentation/context = high curator priority
```

Current formula shape:

```text
Curation Opportunity =
Base Cultural Score x Readiness Gap

Readiness Gap =
max(Presentation Gap, Context Gap)
```

This means a culturally irrelevant weak trend is not automatically a priority. A culturally important weak trend is.

## What Curators Can Improve

Curators can create value by improving:

- media quality
- text presentation
- source context
- summary usefulness
- curator explanation
- definition clarity
- duplicate or ambiguity resolution

The system should make these opportunities visible so curators know where their work matters.

## Why Curators Would Do This

Curators need a reason to spend time improving trends.

Potential incentives:

- monetary rewards or revenue share
- reputation or status
- access to better opportunities
- attribution on published improvements
- priority in future curator programs
- influence on culturally important trend pages

The exact reward mechanics can be decided later. The algorithm should at least measure useful improvement so rewards can be tied to value, not volume.

## Curator Reward Logic

Curator rewards should favor work that improves the platform.

Current formula shape:

```text
Curator Reward Score =
clamp(0, 100,
0.35 Quality Improvement
+ 0.25 Successful Publication
+ 0.20 User Response
+ 0.20 Review Approval
- Flags / Reversals)
```

This avoids rewarding low-effort uploads or spam. The strongest curator work should improve quality, unlock better distribution, get positive user response, and pass review.

## Risks To Watch

Risks:

- curators optimize for quantity instead of quality
- curators upload media that technically exists but looks bad
- curators create biased or misleading framing
- rewards create spam incentives
- super curators become bottlenecks
- important trends remain hidden because they lack content

Mitigations:

- reward improvement, not volume
- penalize flags, reversals, duplicates, and misleading context
- route important weak trends into clear curator queues
- use review approval for high-impact surfaces
- keep hard display issues out of the main feed
