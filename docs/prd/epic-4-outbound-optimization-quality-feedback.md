# Epic 4: Outbound Optimization & Quality Feedback

**Expanded Goal:** Deliver outbound message optimization feature enabling users to paste draft messages and receive AI-suggested improvements with side-by-side comparison UI, implement thumbs up/down feedback mechanism for both inbound and outbound interpretations to track quality and improve prompts, and complete the bidirectional workflow that differentiates TowerOfBabel from generic AI tools.

---

## Story 4.1: Add Outbound Mode Toggle to Interpretation Form

**As a** user,
**I want** to switch between inbound interpretation and outbound optimization modes,
**so that** I can analyze both received messages and draft messages I plan to send.

### Acceptance Criteria

1. Mode toggle UI element added above interpretation form (tabs or radio buttons: "Inbound" | "Outbound")
2. Default mode is "Inbound" (primary use case)
3. Switching to "Outbound" mode updates form labels:
   - Textarea placeholder changes to: "Paste the message you want to send..."
   - Culture selectors relabeled: "Your Culture" and "Receiver's Culture"
4. Interpretation button label changes to "Optimize" in outbound mode
5. Mode selection persists during session (doesn't reset between interpretations)
6. Mode toggle is keyboard accessible and screen-reader friendly
7. Visual indicator clearly shows which mode is active
8. Mobile-friendly toggle (large enough touch targets)
9. No functional changes to character counter or validation (same 2,000 char limit)
10. Form submission includes mode parameter (inbound|outbound) in API request

---

## Story 4.2: Create Outbound Optimization LLM Prompt and API Logic

**As a** developer,
**I want** a specialized LLM prompt for outbound optimization,
**so that** the AI provides culturally-appropriate message improvements.

### Acceptance Criteria

1. Outbound prompt template created in LLM service layer
2. Prompt instructs LLM to:
   - Analyze how the message will be perceived in receiver's culture
   - Identify potential misinterpretations or unintended tones
   - Suggest optimized version that's clearer and more culturally appropriate
   - Return structured JSON: `{originalAnalysis: string, suggestions: string[], optimizedMessage: string, emotions: [...same as inbound]}`
3. Prompt maintains "explain like 14-year-old" tone for analysis
4. API route /api/interpret handles both inbound and outbound modes based on request parameter
5. Outbound interpretations saved with interpretation_type="outbound" in database
6. Usage tracking counts outbound interpretations same as inbound (1 message used)
7. Cost tracking records LLM cost for outbound calls (may differ from inbound)
8. Error handling for malformed outbound responses
9. Unit tests for outbound prompt generation
10. Outbound optimization respects same tier limits as inbound (trial: 10 total messages)

---

## Story 4.3: Build Side-by-Side Comparison UI for Outbound Results

**As a** user,
**I want** to see my original message and the optimized version side-by-side,
**so that** I can compare differences and decide what to use.

### Acceptance Criteria

1. Outbound results display in side-by-side layout (desktop) or stacked layout (mobile)
2. **Left panel (Original):** Displays user's original message with heading "Your Original Message"
3. **Right panel (Optimized):** Displays AI-suggested optimized message with heading "Culturally Optimized Version"
4. Differences between original and optimized highlighted (optional: use diff highlighting or bold changed phrases)
5. Analysis section below panels displays:
   - "🔍 How It Will Be Perceived" (LLM's originalAnalysis)
   - "💡 Suggestions" (bullet list of improvement suggestions)
   - "😊 Top 3 Emotions Detected" (same adaptive emotion gauges as inbound)
6. "Copy Optimized Message" button copies optimized text to clipboard
7. Side-by-side panels scrollable if content exceeds viewport height
8. Responsive layout: side-by-side on desktop (>1024px), stacked on mobile/tablet
9. Clear visual separation between panels (border or background color difference)
10. Results remain visible until user submits new interpretation request

---

## Story 4.4: Implement Thumbs Up/Down Feedback for Interpretations

**As a** user,
**I want** to provide feedback on interpretation quality,
**so that** the system can improve over time.

### Acceptance Criteria

1. Thumbs up/down buttons displayed below all interpretation results (inbound and outbound)
2. Buttons positioned non-intrusively (bottom-right or after emotion gauges)
3. Clicking thumbs up/down sends feedback to API endpoint: POST /api/feedback
4. Feedback API stores: interpretation_id, feedback (up|down), feedback_timestamp
5. Visual confirmation when feedback submitted (button changes color or shows checkmark)
6. Feedback buttons disabled after user selects one (can't change vote for simplicity)
7. Feedback optional—users can ignore buttons without blocking workflow
8. Feedback data NOT linked to message content (only interpretation_id metadata)
9. Feedback tooltip on hover: "Was this interpretation helpful?"
10. Accessible via keyboard (tab navigation, enter to submit)
11. Feedback counter displayed in admin view (future): "Inbound: 145 up / 23 down (86% positive)"

---

## Story 4.5: Create Feedback Analytics Dashboard (Admin View)

**As a** product manager,
**I want** to view feedback analytics across all interpretations,
**so that** I can identify prompt improvements needed and track quality over time.

### Acceptance Criteria

1. Admin dashboard accessible at /app/admin (protected route, admin users only)
2. Dashboard displays overall feedback statistics:
   - Total interpretations: count
   - Inbound positive feedback rate: X% (thumbs up / total with feedback)
   - Outbound positive feedback rate: X% (thumbs up / total with feedback)
3. Feedback breakdown by culture pair: Top 5 pairs with lowest positive feedback rate
4. Time-series chart showing daily feedback trends (optional for MVP, can defer)
5. Filter by date range (last 7 days, 30 days, all time)
6. Export feedback data as CSV for deeper analysis
7. No message content displayed (privacy maintained)
8. Admin role flag added to User model (is_admin boolean)
9. Only users with is_admin=true can access dashboard
10. Basic analytics queries use Prisma aggregation (no external analytics tool needed for MVP)

---
