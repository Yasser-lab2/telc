# Online payment provider evaluation — Morocco

No provider is activated until the operator completes commercial, legal and technical due diligence. Manual CIH payment remains the production fallback.

## Mandatory gate

Score each shortlisted provider against: Moroccan entity eligibility and settlement in MAD; published fees and payout delays; supported cards/wallets; refund and dispute operations; PCI scope; 3-D Secure; signed, replay-safe webhooks; idempotency keys; sandbox quality; reconciliation export; data residency/transfers; support SLA; recurring-payment support; and contractual continuity.

## Integration acceptance criteria

- Checkout is created server-side and never trusts a frontend price.
- Webhook signatures and timestamps are verified before parsing business data.
- Provider event IDs and payment references are unique in D1.
- Replayed events cannot create a second subscription.
- Payment, subscription event and audit metadata reconcile to one immutable reference.
- Refunds/cancellations are explicit state transitions and tested in sandbox.
- Manual payment stays available during provider outage.
- Legal, privacy and refund documents name the chosen processor before launch.

## Decision record

Record provider, contract owner, review date, pricing, settlement account, supported methods, sandbox evidence, webhook verification method, retention/transfers, incident contact and final approval. Until this record is signed off, `ONLINE_PAYMENT_PROVIDER` must remain unset.
