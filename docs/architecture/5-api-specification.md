# 5. API Specification

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: TowerOfBabel API
  version: 1.0.0
  description: |
    REST API for TowerOfBabel cross-cultural communication interpretation tool.

    **Authentication:** All endpoints (except /health) require Supabase Auth session.
    Session token passed via HTTP-only cookie (automatic in Next.js).

    **Rate Limiting:**
    - IP-based: 50 requests/hour (Epic 1)
    - User-based: Tier-specific limits (Epic 3)
    - Cost-based: Daily/hourly/per-user LLM cost limits (Epic 1)

    **Privacy:** NO message content stored in database (metadata only).

servers:
  - url: https://towerofbabel.vercel.app/api
    description: Production API
  - url: http://localhost:3000/api
    description: Local development

paths:
  /health:
    get:
      summary: Health check endpoint
      description: Verify API and database connectivity (unauthenticated)
      tags:
        - System
      responses:
        '200':
          description: Service healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "ok"
                  timestamp:
                    type: string
                    format: date-time
                  database:
                    type: string
                    enum: [connected, disconnected]

  /interpret:
    post:
      summary: Request interpretation of message
      description: |
        Analyze message for cultural interpretation (inbound) or optimization (outbound).

        **Cost Protection:** Checked against circuit breaker before LLM call (daily/hourly/user limits).

        **Usage:** Consumes 1 message from user's quota (trial: 10 total, Pro: monthly limit).

        **Authorization:** Database queried for tier/usage (NOT JWT - source of truth).

        **Privacy:** Message content NOT stored in database (only metadata).
      tags:
        - Interpretation
      security:
        - supabaseAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InterpretationRequest'
      responses:
        '200':
          description: Interpretation successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InterpretationResponse'
        '400':
          description: Invalid request (message too long, invalid cultures)
        '401':
          description: Unauthenticated (no session)
        '403':
          description: Usage limit exceeded or cost budget exceeded
        '500':
          description: LLM API error or server error
        '503':
          description: Service overloaded (cost circuit breaker triggered)

  /user:
    get:
      summary: Get current user profile
      description: Fetch authenticated user's profile (tier, usage, preferences) from DATABASE
      tags:
        - User
      security:
        - supabaseAuth: []
      responses:
        '200':
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserProfile'

  /user/preferences:
    patch:
      summary: Update user preferences
      description: Update default culture selections
      tags:
        - User
      security:
        - supabaseAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                default_sender_culture:
                  type: string
                default_receiver_culture:
                  type: string
      responses:
        '200':
          description: Preferences updated

  /user/delete:
    delete:
      summary: Delete user account and all data
      description: GDPR-compliant data deletion
      tags:
        - User
      security:
        - supabaseAuth: []
      responses:
        '200':
          description: Account deleted successfully

  /feedback:
    post:
      summary: Submit interpretation feedback
      description: Thumbs up/down feedback for interpretation quality tracking
      tags:
        - Feedback
      security:
        - supabaseAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - interpretation_id
                - feedback
              properties:
                interpretation_id:
                  type: string
                  format: uuid
                feedback:
                  type: string
                  enum: [up, down]
      responses:
        '200':
          description: Feedback recorded

  /checkout:
    post:
      summary: Create Stripe Checkout session
      description: Create Stripe Checkout session for Pro subscription or PAYG
      tags:
        - Payments
      security:
        - supabaseAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - type
              properties:
                type:
                  type: string
                  enum: [pro_subscription, payg_single]
      responses:
        '200':
          description: Checkout session created
          content:
            application/json:
              schema:
                type: object
                properties:
                  checkout_url:
                    type: string
                    format: uri

  /billing-portal:
    post:
      summary: Create Stripe Customer Portal session
      description: Generate Stripe Customer Portal link for subscription management
      tags:
        - Payments
      security:
        - supabaseAuth: []
      responses:
        '200':
          description: Portal session created

  /webhooks/stripe:
    post:
      summary: Stripe webhook endpoint
      description: |
        Handles Stripe webhook events for subscription lifecycle management.

        **Security:** Verifies webhook signature before processing.
        **Idempotency:** Checks StripeEvent table to prevent duplicate processing.

        **Events Handled:**
        - `checkout.session.completed`: Create subscription, upgrade user to Pro
        - `invoice.payment_succeeded`: Reset usage counter for Pro users
        - `customer.subscription.deleted`: Downgrade user to PAYG
        - `customer.subscription.updated`: Update subscription status
      tags:
        - Webhooks
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Webhook processed successfully
        '400':
          description: Invalid signature or malformed payload

  /admin/cost-metrics:
    get:
      summary: Get LLM cost metrics (admin only)
      description: View daily and hourly LLM cost breakdown for monitoring
      tags:
        - Admin
      security:
        - supabaseAuth: []
      responses:
        '200':
          description: Cost metrics
          content:
            application/json:
              schema:
                type: object
                properties:
                  daily:
                    type: object
                    properties:
                      cost:
                        type: number
                      limit:
                        type: number
                      usage:
                        type: string
                  hourly:
                    type: array
                    items:
                      type: object
                      properties:
                        hour:
                          type: number
                        cost:
                          type: number

components:
  securitySchemes:
    supabaseAuth:
      type: apiKey
      in: cookie
      name: sb-access-token
      description: Supabase Auth session token (HTTP-only cookie, automatic)

  schemas:
    InterpretationRequest:
      type: object
      required:
        - message
        - sender_culture
        - receiver_culture
        - mode
      properties:
        message:
          type: string
          minLength: 1
          maxLength: 2000
        sender_culture:
          type: string
        receiver_culture:
          type: string
        mode:
          type: string
          enum: [inbound, outbound]

    InterpretationResponse:
      type: object
      properties:
        success:
          type: boolean
        interpretation:
          type: object
          properties:
            bottomLine:
              type: string
            culturalContext:
              type: string
            emotions:
              type: array
              items:
                $ref: '#/components/schemas/Emotion'
            confidence:
              type: string
              enum: [high, medium, low]
            optimizedMessage:
              type: string
        messages_remaining:
          type: number

    Emotion:
      type: object
      properties:
        name:
          type: string
        senderScore:
          type: number
        receiverScore:
          type: number
        explanation:
          type: string

    UserProfile:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        tier:
          type: string
          enum: [trial, payg, pro]
        messages_used_count:
          type: number
        messages_limit:
          type: number
        trial_days_remaining:
          type: number
```

---
