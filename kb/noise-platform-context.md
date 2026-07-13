# NOISE Platform Context

Last updated: 2026-07-13

## Product Idea

NOISE is a cultural trends app. It helps users discover what is culturally relevant now and what may become more or less relevant soon.

The app is already live in production. Users use real money to express belief in whether a trend will rise or fall. They can buy into trends or short them.

The future discovery experience is expected to be more like a one-at-a-time mobile feed than the current production web layout. The production website is useful context, but it should not over-bias the future relevance algorithm.

## Core Goal

The product should surface culturally meaningful trends while keeping the experience high quality.

Important optimization goals:

- cultural accuracy
- user engagement and return usage
- enough freshness to feel current
- enough quality control to avoid slop
- enough integrity control to reduce manipulation

The app should not become a purely personalized TikTok-style feed. Some personalization can help, but the default should feel like a shared cultural awareness product.

## What Counts As Interesting

A trend can be interesting because it is:

- important right now
- rising quickly
- falling quickly in a meaningful way
- early but culturally promising
- personally relevant to the user
- important but missing better content or context

Slow natural decline is usually not interesting. A sudden meaningful drop can be interesting because it signals cultural or market movement.

## Trend Relationships

What earlier drafts called `Sub-trends` are better understood as related trends.

Example:

- `AGI` can show related trends such as `ChatGPT`, `OpenAI`, and `Sam Altman`.
- `OpenAI` can also show `ChatGPT` and other related trends.

These relationships can be many-to-many and can have multiple layers. They are mainly used to help users navigate from one trend page to other related trend pages. They should not imply that a trend has only one parent or that the hierarchy is strict.

## Roles

### Normal Users

Normal users provide behavioral and market signals:

- buy
- short
- view
- open
- return
- engage
- react through future app behavior

Their actions help identify attention, market conviction, momentum, and user response.

### Curators

Curators help improve the cultural and editorial quality of trends.

They can:

- add sources, news, articles, or media
- explain why a trend matters
- judge whether a trend is culturally meaningful
- help clarify weak or incomplete trends
- improve presentation and context

Curators may be biased, but the system can reduce individual bias by combining many curator signals, review approval, quality checks, and user response.

### Super Curators

Super curators are manually selected by staff. They may include internal team members.

Possible responsibilities:

- create trends
- review or approve important curator work
- resolve ambiguous trends
- help calibrate quality standards
- intervene when algorithmic signals are weak or risky

The exact super curator power model is still open. It should be chosen based on output quality, not hierarchy for its own sake.

## Main Risks

The system should guard against:

- low-quality media or text making the app look bad
- duplicate or unclear trend definitions
- spam users
- whales or concentrated market behavior
- wash trading or artificial market movement
- coordinated manipulation
- rewarding curator volume instead of useful improvement
- overfitting to the current production UI

## Product Principle

NOISE should make all trends accessible somewhere, but not all trends deserve high-discovery placement.

High-discovery areas, especially the main swipe feed, should require both relevance and enough presentation quality to avoid making the product feel low quality.

## Prototype Interaction And Terminology

- User-authored discussion items are `Posts`. Do not name app surfaces or actions `Conversations`.
- Profile tabs are ordered `Collections`, `Signals`, `Posts`, `Trends`; `Trends` is the user-facing name for trends created by a curator.
- Horizontal media and card rails should feel like native app gestures: direct swipe or pointer drag, no visible browser scrollbar, and uninterrupted vertical page scrolling.
