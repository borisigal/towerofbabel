# 12. Unified Project Structure

```
towerofbabel/
├── app/                               # Next.js App Router
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                            # shadcn/ui
│   ├── features/
│   └── layout/
├── lib/
│   ├── auth/                          # Supabase Auth + README
│   ├── llm/                           # LLM provider + cost circuit breaker
│   ├── stripe/                        # Stripe + idempotency
│   ├── services/                      # Business logic
│   ├── db/                            # Prisma + connection pooling
│   ├── middleware/
│   ├── stores/
│   ├── types/
│   └── observability/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── tests/
│   ├── unit/
│   └── integration/
├── .env.local.example
├── .eslintrc.json                     # Includes JWT metadata check rule
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---
