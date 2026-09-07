# Wedding backend application order

The hosted database currently predates this repository's local migration history, so these reviewed SQL files remain manual and idempotent until a clean baseline is adopted.

Apply them to the DreamZ platform project in this order:

1. `20260907_secure_wedding_api.sql`
2. `20260907_seed_cloyd_cyrin_entourage.sql`
3. `20260907_exclude_principal_sponsors_from_proposals.sql`
4. `20260907_reconcile_exact_proposal_recipients.sql`
5. `20260907_reset_deleted_entourage_responses.sql`
6. `20260907_add_wedding_rate_limits.sql`
7. `20260907_wedding_owner_admin.sql`
8. `20260907_reset_wedding_owner_credentials.sql`
9. `20260907_add_entourage_party_size.sql`
10. `20260907_add_entourage_owner_dashboard.sql`

Run each file once in the Supabase SQL Editor and retain its successful execution record. Do not run `db push` against the hosted project until its remote migration history has been reconciled with a reviewed baseline.

The scripts affect only wedding-owned objects. They do not modify the christening project, QR tables, or Storage.
