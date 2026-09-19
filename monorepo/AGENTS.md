# Agent Instructions

Before any task, read ARCHITECTURE.md, SCHEMA.md, and DESIGN.md in the repo
root.

Hard constraints (do not violate even if it seems more convenient):
- Never introduce a BSP/middleman for WhatsApp (no Twilio). Talk to Meta's
  Cloud API directly.
- Never let the bot/AI confirm a booking directly in chat. Only the backend,
  inside a DB transaction, may confirm one.
- Never send a business-initiated WhatsApp message assuming the 24-hour
  free-form window is open. Check it / use a template.
- Never process a webhook payload without verifying X-Hub-Signature-256.
- Never skip the whatsappMessageId dedup check on inbound webhook events.
- Admin endpoints require the session-based auth from Stage 2. Do not
  invent a different auth scheme.
- Never set `synchronize: true`. Never run migrations against the pooled
  `DATABASE_URL` — migrations use `DIRECT_URL` only. Never let an
  auto-generated migration replace the hand-written overlap-constraint /
  RLS migration from Stage 1.