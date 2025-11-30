# Epic 6: LLM Integration Performance Optimization

**Type:** Brownfield Enhancement
**Parent:** [Epic 2: Interpretation Engine & LLM Integration](./epic-2-interpretation-engine-llm-integration.md)
**Trade-offs:** None (zero-compromise optimization)

---

## Epic Goal

Significantly improve the perceived and actual performance of the interpretation engine by implementing response streaming and prompt caching, reducing user wait time and improving overall experience without any trade-offs to reliability or data consistency.

---

## Background & Problem Statement

After user testing of the interpretation feature, feedback indicates that the response time feels slow, causing user discomfort and potential frustration. The current implementation:

- Buffers the entire LLM response before returning to the user
- Sends the full system prompt with every request (no caching)
- Results in perceived wait times of 5-10+ seconds before any content appears

---

## Existing System Context

| Aspect | Current State |
|--------|---------------|
| **Technology Stack** | Next.js 14.1, TypeScript, Anthropic SDK 0.67.0, Vercel KV (Redis), Prisma/Supabase |
| **LLM Provider** | Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) |
| **Current Timeout** | 30 seconds |
| **Average Cost** | ~$0.012 per interpretation |
| **Key Files** | `app/api/interpret/route.ts`, `lib/llm/anthropicAdapter.ts`, `lib/llm/prompts.ts` |

### Current Request Flow

```
Request → Auth → Rate Limit → Validation → DB Auth Check →
Cost Circuit Breaker → LLM Call (buffered) → Cost Tracking → DB Save → Response
```

**Pain Point:** User waits for entire LLM response to complete before seeing anything.

---

## Enhancement Details

| Aspect | Details |
|--------|---------|
| **What's Being Changed** | Response delivery mechanism (streaming) and prompt structure (caching) |
| **How It Integrates** | Extends existing `AnthropicAdapter` with streaming capability, adds cache headers to prompts |
| **Trade-offs** | None - pure optimizations with no compromises |

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Time-to-first-token | 5-10 seconds | < 2 seconds |
| Input token cost | Baseline | 15-20% reduction |
| Total response time | No change | Same or faster |
| Data consistency | 100% | 100% (unchanged) |
| Error rate | Baseline | Same or lower |

---

## Stories

### Story 6.1: Implement Response Streaming for Interpretation API

**As a** user,
**I want** to see interpretation results as they are generated,
**So that** I experience faster perceived performance and reduced frustration while waiting.

#### Description

Modify the interpretation flow to stream LLM responses directly to the client, allowing users to see "The Bottom Line" and other sections as they are generated rather than waiting for the complete response.

#### Scope

- Modify `AnthropicAdapter` to use Anthropic's streaming API (`stream: true`)
- Update `/api/interpret` route to return `ReadableStream` response
- Update frontend interpretation display to consume streamed response
- Implement progressive rendering of Bottom Line, Cultural Context, and Emotions sections
- Maintain backward compatibility with existing error handling

#### Technical Changes

| File | Change |
|------|--------|
| `lib/llm/anthropicAdapter.ts` | Add `interpretStream()` method using Anthropic streaming |
| `lib/llm/types.ts` | Add streaming-related type definitions |
| `app/api/interpret/route.ts` | Return `new Response(stream)` with appropriate headers |
| Frontend components | Handle streaming response with progressive rendering |

#### Acceptance Criteria

1. Time-to-first-token is less than 2 seconds
2. User sees "The Bottom Line" text appearing within 2-3 seconds of submission
3. Full response completes in same or less time than current implementation
4. Streaming gracefully falls back to buffered response on error
5. All existing error handling continues to work (auth, rate limit, usage limit)
6. Cost tracking and database persistence work correctly with streaming
7. Loading states and UI feedback are appropriate for streaming experience
8. Mobile, tablet, and desktop viewports all handle streaming correctly

#### Technical Notes

- Use Anthropic SDK's `stream: true` option with `for await` iteration
- Implement `TransformStream` for server-side chunk processing
- Parse JSON structure progressively (Bottom Line first, then Cultural Context, then Emotions)
- Maintain existing timeout behavior (30 seconds max)

---

### Story 6.2: Enable Anthropic Prompt Caching for System Messages

**As a** product owner,
**I want** to reduce LLM token costs through prompt caching,
**So that** operating costs are lower and response latency is improved.

#### Description

Implement Anthropic's prompt caching feature to cache the system message portion of interpretation prompts. Since the system message is identical across requests (only user message varies), this can significantly reduce input token costs and improve latency.

#### Scope

- Add `cache_control` headers to system message in Anthropic API calls
- Update prompt templates to structure cacheable vs. dynamic content optimally
- Track and log cache hit rates via existing `tokens_cached` database field
- Monitor cost reduction in Redis cost tracking

#### Technical Changes

| File | Change |
|------|--------|
| `lib/llm/anthropicAdapter.ts` | Add `cache_control: { type: "ephemeral" }` to system message block |
| `lib/llm/prompts.ts` | Restructure prompts to maximize cacheable content in system message |
| Logging | Track `cache_creation_input_tokens` vs `cache_read_input_tokens` |

#### Acceptance Criteria

1. System message includes `cache_control: { type: "ephemeral" }` header
2. Prompt structure places all static content in cacheable system message
3. `tokens_cached` field in database is populated with actual cache data
4. Cache hit rate is logged and can be monitored
5. 15-20% reduction in input token costs observed after warm-up period
6. No regression in response quality or accuracy
7. Both same-culture and cross-culture prompts benefit from caching
8. Existing unit tests for prompt generation continue to pass

#### Technical Notes

- Anthropic caches prompts for 5 minutes by default
- Cache is per-model, so all requests to Claude Sonnet 4.5 share the cache
- Minimum cacheable prefix is 1024 tokens (system message exceeds this)
- Cache read tokens are billed at 10% of regular input token price

---

## Compatibility Requirements

- [x] Existing API request format remains unchanged
- [x] Existing API response format remains unchanged (just delivered progressively)
- [x] Database schema requires no changes
- [x] All existing error codes and handling preserved
- [x] Rate limiting and cost circuit breaker continue to function
- [x] Usage tracking and tier limits enforced identically

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Streaming breaks JSON parsing | Low | Medium | Accumulate chunks, parse on complete; fallback to buffered |
| Prompt cache doesn't activate | Low | Low | Monitor cache metrics; structure verified against Anthropic docs |
| Frontend streaming issues | Low | Medium | Progressive enhancement with buffered fallback |
| Increased complexity | Low | Low | Well-documented patterns; comprehensive tests |

---

## Rollback Plan

Both stories can be independently rolled back with minimal risk:

| Story | Rollback Method | Time to Rollback |
|-------|-----------------|------------------|
| Story 6.1 (Streaming) | Feature flag or revert to `interpret()` instead of `interpretStream()` | < 5 minutes |
| Story 6.2 (Prompt Caching) | Remove `cache_control` header from API calls | < 5 minutes |

---

## Definition of Done

- [ ] All acceptance criteria met for both stories
- [ ] Time-to-first-token measured and documented (< 2 seconds)
- [ ] Cache hit rate measured and documented (target: >80% after warm-up)
- [ ] Cost reduction measured and documented (target: 15-20%)
- [ ] Existing test suite passes
- [ ] New tests added for streaming and caching functionality
- [ ] No regression in existing interpretation functionality
- [ ] Performance metrics dashboard updated (if applicable)

---

## Story Manager Handoff

Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **Next.js 14.1 + Anthropic SDK 0.67.0 + Vercel KV + Prisma**
- **Integration points:** Anthropic streaming API, Anthropic prompt caching
- **Existing patterns to follow:** `LLMAdapter` interface, repository pattern, existing error handling
- **Critical compatibility requirements:** Same API contract, same database schema, same error codes
- Each story must include verification that existing functionality remains intact
- **Zero trade-offs:** No compromises on reliability, data consistency, or error handling

The epic should maintain system integrity while delivering **significantly improved perceived and actual performance for the interpretation engine**.

---

## References

- [Anthropic Streaming Documentation](https://docs.anthropic.com/en/api/streaming)
- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Epic 2: Interpretation Engine & LLM Integration](./epic-2-interpretation-engine-llm-integration.md)
