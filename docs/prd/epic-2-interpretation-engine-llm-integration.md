# Epic 2: Interpretation Engine & LLM Integration

**Expanded Goal:** Implement the core interpretation functionality enabling users to paste messages, select sender/receiver cultures, and receive AI-powered interpretations with "The Bottom Line" explanation, cultural context insights, and top 3 dynamically-detected emotions displayed with single scores (same culture) or dual scores (different cultures), delivering the primary product value.

---

## Story 2.1: Build Interpretation Form UI with Culture Selectors

**As a** user,
**I want** to paste a message and select sender/receiver cultures,
**so that** I can request an interpretation of what the message really means.

### Acceptance Criteria

1. Interpretation form displayed on dashboard with large textarea (placeholder: "Paste the message you want to interpret...")
2. Real-time character counter displays "X / 2,000 characters" below textarea
3. Character counter turns red/warning color when >2,000 characters
4. Submit button disabled when character count exceeds 2,000 with tooltip message: "Message too long. Please shorten to 2,000 characters or less."
5. Two culture dropdown selectors: "Sender's Culture" and "Receiver's Culture"
6. Each dropdown populated with 15 cultures: American, British, German, French, Japanese, Chinese, Indian, Spanish, Italian, Dutch, Korean, Brazilian, Mexican, Australian, Canadian
7. Same-culture selection allowed (e.g., American → American)
8. "Interpret" button enabled when form is valid (message length ≤2,000, both cultures selected)
9. Loading state displays when interpretation request submitted (button shows spinner, form disabled)
10. Form is fully responsive (works on mobile, tablet, desktop)

---

## Story 2.2: Create LLM Integration Service Layer

**As a** developer,
**I want** a service layer that calls the LLM provider API with structured prompts,
**so that** I can generate interpretations and parse responses reliably.

### Acceptance Criteria

1. LLM service module created in /lib/llm with TypeScript interfaces for requests/responses
2. Service supports calling selected LLM provider (Grok, GPT-4, Claude, or Gemini based on Week 1 benchmarking decision)
3. Three prompt templates implemented:
   - Same-culture template: Emphasizes "explain like 14-year-old", returns single emotion scores
   - Different-culture template: Emphasizes cultural context, returns dual emotion scores
   - Both templates request structured JSON response: `{bottomLine: string, culturalContext: string, emotions: [{name: string, senderScore: number, receiverScore: number}]}`
4. Prompt templates include "detect top 3 emotions dynamically" instruction (not preset list)
5. API call timeout configured (10 seconds max)
6. Error handling for API failures (timeout, rate limit, invalid API key, malformed response)
7. Response parsing validates JSON structure and handles malformed responses gracefully
8. LLM API key stored securely in environment variables
9. Basic logging for LLM calls (timestamp, culture pair, success/failure, cost if available)
10. Unit tests for prompt template generation and response parsing

---

## Story 2.3: Implement Interpretation API Route

**As a** user,
**I want** my interpretation request processed by the backend,
**so that** I receive an AI-generated interpretation of my message.

### Acceptance Criteria

1. API route created at /api/interpret (POST method)
2. Request validation: authenticated user, message length ≤2,000 chars, valid cultures
3. User's current tier and usage count fetched from database
4. For trial users: verify messages_used_count < 10 (enforce limit, return error if exceeded)
5. For Pro users: verify messages_used_count < configured limit (TBD based on pricing)
6. For pay-as-you-go users: no limit check (will charge per use)
7. Call LLM service with appropriate prompt template (same-culture vs. different-culture)
8. Parse LLM response and structure interpretation result
9. Save interpretation metadata to database: user_id, timestamp, culture_sender, culture_receiver, character_count, interpretation_type=inbound, cost_usd (if available)
10. Increment user's messages_used_count by 1
11. Return structured response to client: `{bottomLine, culturalContext, emotions, success: true}`
12. Error handling returns appropriate HTTP status codes (401 unauthorized, 403 limit exceeded, 500 LLM error)
13. Rate limiting middleware applied (prevent abuse, TBD specific limits)

---

## Story 2.4: Display Interpretation Results with Adaptive Emotion Gauges

**As a** user,
**I want** to see the interpretation results with clear bottom-line explanation and emotion visualizations,
**so that** I understand what the message really means and the emotional context.

### Acceptance Criteria

1. Results section displays after successful interpretation with three subsections:
   - "🎯 The Bottom Line" (direct explanation in simple language)
   - "🔍 Cultural Context" (insights about communication style, subtext, implications)
   - "😊 Top 3 Emotions Detected" (dynamic emotion gauges)
2. Bottom Line section displays LLM-generated explanation in readable paragraph format
3. Cultural Context section displays insights as bullet list or short paragraphs
4. Emotion gauges adapt based on culture selection:
   - **Same culture:** Display single score format: "Enthusiasm: 7/10" with visual indicator
   - **Different cultures:** Display dual score format: "Enthusiasm: In their culture 3/10 → In yours 7/10" with visual comparison
5. Emotion gauges use WCAG 2.1 AA compliant visual indicators:
   - Text label (emotion name)
   - Numerical score (X/10)
   - Visual pattern (progress bar, icon, or non-color-dependent indicator)
   - NOT solely color-dependent (accessible to colorblind users)
6. Top 3 emotions displayed in order of relevance (as returned by LLM)
7. Results section is fully responsive (readable on mobile, tablet, desktop)
8. Loading state cleared when results displayed
9. Error message displayed if interpretation fails (with retry option)
10. Results remain visible until user submits new interpretation request

---
