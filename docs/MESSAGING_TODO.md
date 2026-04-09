# Messaging Module TODO Roadmap

This roadmap captures deferred future features for secure message delivery and provider integrations.

## Secure Server-Side Dispatch

- [ ] Build a secure server-side dispatch worker (Supabase Edge Function or backend worker) for Email and SMS channels
- [ ] Keep provider credentials server-only (Resend API key and Africa's Talking API key) and never expose them to client code
- [ ] Update messaging flow so client only enqueues messages and server handles outbound dispatch
- [ ] Add signed/internal dispatch endpoint to prevent unauthorized trigger calls

## Provider Integrations

- [ ] Integrate Resend for Email delivery with per-recipient success/failure capture
- [ ] Integrate Africa's Talking for SMS delivery with per-recipient success/failure capture
- [ ] Add webhook handlers for delivery receipts/bounces and map them back to message delivery_report
- [ ] Normalize provider error reasons into consistent status categories (Delivered, Queued, Failed)

## Scheduling and Queue Reliability

- [ ] Move scheduled delivery execution to server-side cron/job runner
- [ ] Add retry policy with exponential backoff for transient provider errors
- [ ] Add dead-letter handling for messages that exceed retry limits
- [ ] Add idempotency keys for safe re-dispatch after worker restarts

## Observability and Operations

- [ ] Add dispatch logs and metrics (queued, sent, delivered, failed) per channel
- [ ] Add alerting for high failure rate or queue backlog growth
- [ ] Add admin-facing delivery diagnostics panel for provider outage visibility
- [ ] Add rate-limiting/throttling policy by school to protect provider quotas

## Security and Governance

- [ ] Add role-based permission checks for who can trigger bulk external dispatch
- [ ] Add audit trail entries for dispatch attempts and manual re-send actions
- [ ] Add template/content safety guardrails before external channel delivery
- [ ] Add data retention policy for delivery payloads and provider responses
