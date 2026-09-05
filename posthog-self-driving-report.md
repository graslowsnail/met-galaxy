# PostHog Self-driving Setup Report

## Summary

PostHog Self-driving has been configured for **met-galaxy**, a Next.js art exploration app for the Metropolitan Museum of Art. Session Replay, Error Tracking, and Support were enabled; six native signal sources were wired up; and a five-scout troop was tuned to cover this product's key surfaces. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/213064/inbox) within ~30 minutes.

---

## AI data processing

**Approved.** Organization-level AI data processing consent was confirmed before this run.

---

## GitHub

**Connected during this run.** Integration id: 260195 (graslowsnail). Self-driving can now read the `graslowsnail/met-galaxy` repository to investigate findings and open fix PRs.

---

## Products enabled

| Product | Status | Notes |
|---|---|---|
| Session Replay | **Already enabled** | Recordings confirmed present. `posthog.init` has no override — server flip is effective. |
| Error Tracking | **Enabled** | `capture_exceptions: true` already set in `posthog.init`; no code change needed. |
| Support (Conversations) | **Enabled** | Tickets only arrive once an inbound channel is connected — see Follow-ups. |

---

## Signal sources

| source_product | source_type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | Skipped — on by default; no config row needed |
| `health_checks` | `health_issue` | **Enabled** |
| `error_tracking` | `issue_created` | **Enabled** |
| `error_tracking` | `issue_reopened` | **Enabled** |
| `error_tracking` | `issue_spiking` | **Enabled** |
| `session_replay` | `session_analysis_cluster` | **Enabled** (server default sample rate: 10%) |
| `conversations` | `ticket` | **Enabled** (dormant until inbound channel connected) |
| `replay_vision` | — | Skipped — self-authorizing via scanner `emits_signals` flag (step 6c) |
| `llm_analytics` | — | Skipped — not in use |
| `logs` | — | Skipped — not in use |

---

## Connected tools

| Tool | Status |
|---|---|
| GitHub Issues | **Selected but no warehouse source connected (dormant).** Responder row enabled. The connection step was cancelled — see Follow-ups. |

All other tools were not selected.

---

## Scout troop

**Budget:** 100 runs/day (early-access default, confirmed via `scout-metadata-get`). 0 runs used today. Banner: *"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."*

### Enabled (5 scouts)

| Scout | What it watches |
|---|---|
| `signals-scout-general` | Cross-product correlations; surfaces no specialist covers |
| `signals-scout-product-analytics` | Funnels, retention, lifecycle, stickiness — detects conversion or retention regressions in saved insights |
| `signals-scout-web-analytics` | Per-channel session volume, attribution, and landing-page health |
| `signals-scout-web-vitals` | LCP, INP, CLS, FCP per page — important for this image-heavy art explorer |
| `signals-scout-observability-gaps` | Custom events with no insight, dashboard, or alert coverage |

### Disabled (22 scouts)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by the native error tracking source (step 4) |
| `signals-scout-session-replay` | Covered by the native session replay source (step 4) |
| `signals-scout-surveys` | Not in use |
| `signals-scout-ai-observability` | Not in use — no LLM/AI events |
| `signals-scout-revenue-analytics` | Not in use — no payment SDK |
| `signals-scout-feature-flags` | Not in use — no feature flags in code |
| `signals-scout-experiments` | Not in use — no active experiments |
| `signals-scout-customer-analytics` | Not applicable — consumer app, no B2B accounts |
| `signals-scout-logs` | Not in use — PostHog logs product not used |
| `signals-scout-csp-violations` | Not in use — no CSP reporting configured |
| `signals-scout-data-pipelines` | Not in use — no CDP destinations or hog flows |
| `signals-scout-apm` | Not in use — no distributed tracing |
| `signals-scout-data-warehouse` | Not in use — no warehouse imports yet |
| `signals-scout-conversations` | Not applicable — no support channel connected yet |
| `signals-scout-mcp-tool-calls` | Not applicable |
| `signals-scout-skills-store` | Not applicable |
| `signals-scout-replay-vision` | No existing scanner history to trend over — enable once observations accumulate |
| `signals-scout-anomaly-detection` | Re-enable via PostHog if anomaly detection across dashboards is needed |
| `signals-scout-health-checks` | Re-enable via PostHog if health-issue triage is needed |
| `signals-scout-inbox-validation` | Not useful on a fresh setup — no resolved reports to validate yet |
| `signals-scout-insight-alerts` | No alerts configured yet |
| `signals-scout-tasks` | Not applicable |

---

## Custom scouts

**None created.** The proposal was declined — the built-in troop covers this project.

**Surfaces considered and ruled out:**

| Surface | Why ruled out |
|---|---|
| Artwork exploration funnel (`artwork_opened` by source / depth) | Proposed, declined by user |
| Search effectiveness (`search_performed` → `artwork_opened` conversion) | Proposed, declined by user |
| Sharing viral loop (`path_shared` → `shared_path_opened`) | Proposed, declined by user |

These three scouts are genuine gaps not covered by the built-in troop — they can be added later. To reduce noise, set `emit: false` on any scout's config in PostHog to switch it to dry-run mode before deleting.

---

## Replay Vision scanners

Replay Vision scanners are LLMs that watch individual session recordings on a schedule and push what they find directly to the Self-driving inbox. Findings arrive at half weight and need corroboration before they're promoted into a full inbox report.

| Scanner | Type | Query scope | Sampling | Est. monthly credits | Status |
|---|---|---|---|---|---|
| **Art page breakage** | Monitor | Sessions touching `/art/` URLs | 50% | ~75 credits (~15 obs) | **Created** |
| **Explorer frustration** | Monitor | Sessions with a `$rageclick` event | 100% | ~0 credits (0 rage-click sessions yet) | **Created** |

Both scanners have `emits_signals: true` and are enabled.

**Art page breakage** is scoped to `/art/[id]` — the individual artwork detail page — because that is where loading failures (images, similarity explorer, like/share buttons) would most directly hurt a user who came to view a specific artwork.

**Explorer frustration** is gated on `$rageclick`, which is high-precision for stuck users in this app: hammering thumbnails, the similarity controls, or the search without result.

---

## Follow-ups

- [ ] **Connect a Support channel**: Conversations is enabled but needs an inbound channel (email / inbox / Slack) before tickets appear in the inbox. Configure in PostHog → Settings → Support.
- [ ] **Connect GitHub Issues warehouse source**: You selected GitHub Issues but the connection step was cancelled. To complete it, go to [New data warehouse source](https://us.posthog.com/project/213064/pipeline/new/source) and add GitHub Issues for `graslowsnail/met-galaxy`. The responder row is already enabled and will start emitting once the source syncs.
- [ ] **Optional — custom scouts**: Three domain-specific gaps were proposed and declined: artwork exploration funnel, search effectiveness, and sharing viral loop. These can be added later via PostHog → Skills.

---

## What happens next

The scout coordinator picks up fresh configs within ~30 minutes. Each enabled scout runs once a day (1440-minute interval) and draws from the 100-run daily budget. Replay Vision scanners sweep new recordings every 5 minutes. As findings accumulate they cluster into inbox reports; immediately actionable ones can auto-start coding tasks. Check the inbox at https://us.posthog.com/project/213064/inbox.
