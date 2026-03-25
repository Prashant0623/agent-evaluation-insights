import { useState, useMemo } from "react";

const PLATFORMS = {
  asana: {
    name: "Asana",
    color: "#E24B4A",
    dot: "#E24B4A",
    endpoints: [
      "GET /tasks — assignee, effort_level, due_date, status, project, created_at, completed_at",
      "GET /projects — project name, client name, section/column",
      "POST /tasks — create new tasks with name, assignee, due_date, notes",
      "PUT /tasks/{id} — update priority, due date, status",
      "POST /task_comments — add context notes to tasks",
    ],
  },
  gads: {
    name: "Google Ads API",
    color: "#185FA5",
    dot: "#185FA5",
    endpoints: [
      "GoogleAdsService.SearchStream — campaign.id, campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions",
      "CustomerService.listAccessibleCustomers — customer.id, customer.descriptive_name",
      "Granularity: monthly by account, last 24 months",
    ],
  },
  meta: {
    name: "Meta Ads API",
    color: "#3B6D11",
    dot: "#3B6D11",
    endpoints: [
      "GET /{ad-account-id}/insights — spend, impressions, link_clicks, account_id, account_name",
      "GET /{ad-id}/comments — message, created_time, from.name, like_count, parent.id",
      "Granularity: monthly by account; comments polled in real-time or daily batch",
    ],
  },
  snowflake: {
    name: "Snowflake",
    color: "#0F6E56",
    dot: "#0F6E56",
    endpoints: [
      "SQL — sales schema: YoY sales by YTD/QTD/WTD, channel, category, customer cohort",
      "SQL — model schema: conversions, revenue, orders by model decile, cohort penetration",
      "Granularity: weekly aggregates",
    ],
  },
  bluedot: {
    name: "Bluedot / Google Docs",
    color: "#BA7517",
    dot: "#BA7517",
    endpoints: [
      "Bluedot export webhook or Google Docs API GET /documents/{id}",
      "Fields: full transcript text, speaker labels, timestamps, doc title",
      "Granularity: on-demand per call",
    ],
  },
  gdrive: {
    name: "Google Drive",
    color: "#185FA5",
    dot: "#185FA5",
    endpoints: [
      "GET /files — file metadata, title, last modified, owner, sharing permissions",
      "GET /files/{id}/export — document content as plain text or HTML",
      "Granularity: incremental daily sync",
    ],
  },
  dq: {
    name: "Data Warehouse (DQ signals)",
    color: "#0F6E56",
    dot: "#0F6E56",
    endpoints: [
      "information_schema.tables / columns — schema snapshots, column types",
      "Custom monitoring queries — row counts, null rates, freshness timestamps",
      "Value distribution queries — min, max, avg, stddev per key field",
      "Granularity: daily automated checks",
    ],
  },
  sql: {
    name: "SQL / Approved Query Library",
    color: "#0F6E56",
    dot: "#0F6E56",
    endpoints: [
      "Direct DB connection (Snowflake/BigQuery) — parameterized SQL execution",
      "Query store — versioned approved queries with output schemas",
      "QA baseline table — expected row counts, key field ranges",
      "Granularity: daily scheduled runs",
    ],
  },
  msft: {
    name: "Microsoft Ads API",
    color: "#BA7517",
    dot: "#BA7517",
    endpoints: [
      "ReportingService/SubmitGenerateReport — async report submission",
      "Fields: AccountId, AccountName, TimePeriod, Spend, Clicks, Impressions",
      "Granularity: monthly by account, async poll + CSV download",
    ],
  },
  pinterest: {
    name: "Pinterest Marketing API",
    color: "#A32D2D",
    dot: "#A32D2D",
    endpoints: [
      "GET /ad_accounts/{id}/analytics — SPEND_IN_DOLLAR, PIN_CLICK, OUTBOUND_CLICK, IMPRESSION, DATE",
      "Derived field: Clicks = PIN_CLICK + OUTBOUND_CLICK",
      "Granularity: monthly by advertiser, rate limit 1000 req/day",
    ],
  },
  mntn: {
    name: "MNTN Platform",
    color: "#533AB7",
    dot: "#533AB7",
    endpoints: [
      "MNTN Reporting API (limited docs — verify access with account rep first)",
      "Fallback: Playwright UI automation from ui.mountain.com",
      "Fields: spend, clicks, impressions, campaign_name, month",
    ],
  },
  thoughtspot: {
    name: "ThoughtSpot",
    color: "#533AB7",
    dot: "#533AB7",
    endpoints: [
      "ThoughtSpot REST API v2 /api/rest/2.0/searchdata",
      "Fields: date, channel, daily_spend",
      "Granularity: daily spend by channel",
    ],
  },
  mmm: {
    name: "Google Sheets (MMM templates)",
    color: "#639922",
    dot: "#639922",
    endpoints: [
      "Google Sheets API v4 GET /spreadsheets/{id}/values — read prior sheet, napkin math",
      "PUT /spreadsheets/{id}/values — write adstock ranges, priors, intercepts",
      "Granularity: monthly write-back",
    ],
  },
  ga4: {
    name: "GA4 / GTM",
    color: "#185FA5",
    dot: "#185FA5",
    endpoints: [
      "GA4 DebugView / Cookie inspection — _ga, _gid, session_id, client_id",
      "GTM Data Layer — UTM params (utm_source, utm_medium, utm_campaign), gclid, fbclid",
      "Form DOM inspection — input[type=hidden] fields, form action, form id",
      "Granularity: per page-load during crawler session",
    ],
  },
  internalkpis: {
    name: "Internal KPI Exports",
    color: "#639922",
    dot: "#639922",
    endpoints: [
      "Scheduled SQL exports or BI tool (Looker/Tableau) — weekly/monthly snapshots",
      "Fields: sales, traffic, conversion, demand by channel, category, market, time period",
      "Granularity: weekly or monthly",
    ],
  },
  external: {
    name: "External APIs (Weather / News / Events)",
    color: "#888780",
    dot: "#888780",
    endpoints: [
      "OpenWeatherMap API — weather alerts, temperature, precipitation by location/date",
      "NewsAPI or GDELT — headlines, topics by location/date",
      "Ticketmaster / Eventbrite API — local events by market and date",
      "Granularity: weekly pull, 3 separate integrations",
    ],
  },
};

const agents = [
  {
    id: 1,
    name: "Google Ads Standard Metrics",
    category: "Data Extraction",
    effort: 2,
    value: 3,
    reliability: 4,
    frequency: "Daily",
    platforms: ["gads"],
    approach:
      "Authenticate via OAuth2. Use SearchStream with GAQL on campaign performance report. Map customer IDs to client names. Format monthly rollup.",
    risks:
      "API quota: 15k ops/day per manager account. Credential rotation needed per client MCC.",
    rec: "Build first — establishes the Google Ads connection that unlocks Campaign Performance Agent.",
  },
  {
    id: 2,
    name: "Meta Ads Standard Metrics",
    category: "Data Extraction",
    effort: 2,
    value: 3,
    reliability: 4,
    frequency: "Daily",
    platforms: ["meta"],
    approach:
      "Meta Marketing API /insights with time_increment=monthly. Paginate across all ad accounts per client via Business Manager.",
    risks:
      "Meta deprecates API versions ~yearly. Long-lived tokens expire in 60 days — needs refresh logic.",
    rec: "Build alongside Google Ads. Same output schema, different connector.",
  },
  {
    id: 3,
    name: "Microsoft Ads Standard Metrics",
    category: "Data Extraction",
    effort: 2,
    value: 2,
    reliability: 4,
    frequency: "Daily",
    platforms: ["msft"],
    approach:
      "Bing Ads Reporting Service. Submit async report, poll status, download CSV. Report type: AccountPerformanceReportRequest, monthly aggregation.",
    risks:
      "Async generation adds latency (up to 15 min). Fewer clients on this platform.",
    rec: "Clone of Google Ads agent template. Low marginal effort.",
  },
  {
    id: 4,
    name: "Pinterest Standard Metrics",
    category: "Data Extraction",
    effort: 2,
    value: 2,
    reliability: 3,
    frequency: "Daily",
    platforms: ["pinterest"],
    approach:
      "Pinterest Marketing API v5 /analytics. Pull spend, clicks, impressions per advertiser. Derive Clicks = PIN_CLICK + OUTBOUND_CLICK.",
    risks:
      "Rate limit: 1000 req/day per app. API maturity lower than Google/Meta.",
    rec: "Include in standard metrics batch. One-time API setup reused across all Pinterest clients.",
  },
  {
    id: 5,
    name: "MNTN Standard Metrics",
    category: "Data Extraction",
    effort: 3,
    value: 2,
    reliability: 3,
    frequency: "Daily",
    platforms: ["mntn"],
    approach:
      "Verify API availability with MNTN rep first. If no API: Playwright-based UI export automation from reports section.",
    risks:
      "No public API docs. UI automation is brittle — breaks when MNTN updates their UI.",
    rec: "Evaluate API access before building. Deprioritize if no data export path confirmed.",
  },
  {
    id: 6,
    name: "Campaign Performance Agent",
    category: "Analytics & Insights",
    effort: 3,
    value: 4,
    reliability: 3,
    frequency: "Daily",
    platforms: ["gads", "meta", "sql"],
    approach:
      "Aggregate Google + Meta agent outputs. Ingest budget data (CSV). Compute ROI, CPA, conversion rate. Compare against thresholds. Flag underperformers. Output daily summary.",
    risks:
      "Budget data format needs standardization upfront. Threshold values require business input per client.",
    rec: "Build immediately after Google + Meta agents are live. 70% of inputs already exist.",
  },
  {
    id: 7,
    name: "Analytics Deliverable Factory",
    category: "Workflow Automation",
    effort: 3,
    value: 5,
    reliability: 4,
    frequency: "Daily",
    platforms: ["sql", "asana"],
    approach:
      "Run approved SQL → QA checks (row count, key tables) → populate report template → LLM drafts narrative → create Asana approval task → distribute on approval.",
    risks: "SQL query governance needed. QA baselines drift as data grows.",
    rec: "High-value quick win. Pilot on 2 deliverables. Human approval gate makes it safe to ship early.",
  },
  {
    id: 8,
    name: "Proactive Client Insights Communicator",
    category: "Analytics & Insights",
    effort: 4,
    value: 5,
    reliability: 3,
    frequency: "Weekly",
    platforms: ["snowflake", "asana"],
    approach:
      "Path 1: Sales SQL → YoY delta → LLM root cause → email draft + Asana task for AM. Path 2: Model scoring → decile grouping → campaign recommendation email.",
    risks:
      "LLM root cause quality depends on data richness. Risk of hallucinated causal explanations.",
    rec: "Build Path 1 first. Validate with AMs over 4 weeks before adding Path 2.",
  },
  {
    id: 9,
    name: "Data Quality Copilot",
    category: "Data & Infrastructure",
    effort: 3,
    value: 5,
    reliability: 4,
    frequency: "Daily",
    platforms: ["dq"],
    approach:
      "Query information_schema + monitoring tables for freshness, row counts, null rates. LLM summarizes anomalies and suggests new DQ checks. Slack alerts for critical issues.",
    risks:
      "Alert fatigue if sensitivity not tuned. Needs 2–4 week baseline period.",
    rec: "Infrastructure investment that improves reliability of every other agent. Build early.",
  },
  {
    id: 10,
    name: "GA4 Auditing Assistant",
    category: "Analytics & Insights",
    effort: 3,
    value: 4,
    reliability: 3,
    frequency: "Daily",
    platforms: ["ga4"],
    approach:
      "Playwright crawler: capture cookies and dataLayer events per page. Detect session/client ID resets. Catalog forms by extracting hidden input fields. Check for UTM params and click IDs.",
    risks:
      "JS-heavy SPAs and auth-walled pages are hard to crawl. Session simulation misses real user edge cases.",
    rec: "Scope to form cataloging only in v1. Add session ID tracking in v2.",
  },
  {
    id: 11,
    name: "Market Context Tracker",
    category: "Analytics & Insights",
    effort: 5,
    value: 4,
    reliability: 2,
    frequency: "Weekly",
    platforms: ["internalkpis", "external"],
    approach:
      "Pull weekly KPI exports → identify threshold-exceeding changes → correlate with weather, holidays, events → LLM generates driver explanations → flag for analyst review.",
    risks:
      "7+ external API dependencies makes reliability fragile. Correlation ≠ causation — LLM explanations may mislead.",
    rec: "Pilot with weather + holidays only (2 sources). Expand only after correlation quality is validated.",
  },
  {
    id: 12,
    name: "MMM Data Prep",
    category: "Analytics & Insights",
    effort: 4,
    value: 4,
    reliability: 3,
    frequency: "Monthly",
    platforms: ["thoughtspot", "mmm"],
    approach:
      "Pull daily spend from ThoughtSpot → QA totals → build media spend sheet → populate napkin math → calculate adstock ranges → z-score spike analysis → write to Recast prior sheet via Sheets API.",
    risks:
      "Adstock and prior logic is domain-specific — needs analyst sign-off at each step.",
    rec: "Map the manual process first. Automate ThoughtSpot pull + QA as a fast win, then tackle Recast sheet.",
  },
  {
    id: 13,
    name: "AdPulse Intelligence Agent",
    category: "Analytics & Insights",
    effort: 4,
    value: 4,
    reliability: 3,
    frequency: "Real-time",
    platforms: ["meta"],
    approach:
      "Poll Meta Graph API /{ad-id}/comments. Clean text (spam, bots). Classify sentiment. Topic modeling via LLM clustering. Generate plain-English summaries per ad. Push digest to Slack.",
    risks:
      "Comment spam filtering is non-trivial. Real-time polling adds infra complexity and API quota pressure.",
    rec: "Start with daily batch (not real-time). Real-time is a Phase 2 upgrade.",
  },
  {
    id: 14,
    name: "Workflow Automation / Decision Log",
    category: "Workflow Automation",
    effort: 2,
    value: 4,
    reliability: 4,
    frequency: "Real-time",
    platforms: ["bluedot", "asana"],
    approach:
      "Watch for new Bluedot exports via Drive API webhook. Send transcript to LLM: extract decisions, action items, owner, urgency. Create Asana tasks via POST /tasks with context in notes.",
    risks:
      "Takeaway extraction varies with call note structure. Deduplication needed for follow-up calls.",
    rec: "Lowest effort, highest operational ROI. Pilot on one team in week 1.",
  },
  {
    id: 15,
    name: "BandwidthIQ",
    category: "Workflow Automation",
    effort: 3,
    value: 4,
    reliability: 4,
    frequency: "Daily",
    platforms: ["asana"],
    approach:
      "Pull open tasks with assignee, due_on, effort_level custom field. Convert effort to points. Sum per person this week + next. Compare to capacity. Flag overloads. Push weekly Slack summary.",
    risks:
      "Requires consistent effort-level tagging in Asana. Score is only as good as task hygiene.",
    rec: "Pre-req: ensure effort_level field is populated. Then fast build on a single clean data source.",
  },
  {
    id: 16,
    name: "InAcadia (AcadiaGPT Slack Bot)",
    category: "Knowledge & Collaboration",
    effort: 5,
    value: 5,
    reliability: 3,
    frequency: "Daily",
    platforms: ["gdrive", "asana", "bluedot"],
    approach:
      "Ingest Google Drive + Bluedot + Asana → chunk → embed → vector DB with permission metadata. On Slack question: embed → similarity search (permission-filtered) → LLM answer with citations → post to Slack.",
    risks:
      "Permission enforcement across sources is the hardest engineering challenge. Answer quality degrades with stale content.",
    rec: "Start with Google Drive + Bluedot only. Add Asana in Phase 2. Use managed vector DB (Pinecone/Weaviate).",
  },
  {
    id: 17,
    name: "Retail Marketplace: Creative Audit",
    category: "Retail & Commerce",
    effort: 4,
    value: 3,
    reliability: 3,
    frequency: "Daily",
    platforms: ["sql"],
    approach:
      "Ingest creative assets. Use vision LLM to check brand guideline compliance. Flag policy violations. Score against historical CTR/CVR. Output audit report per asset.",
    risks:
      "Spec is underdeveloped. Vision AI compliance checking has meaningful false-positive rates.",
    rec: "Needs more spec work. Define scope tightly (image compliance only) before building.",
  },
  {
    id: 18,
    name: "Retail Marketplace: Keyword Classification",
    category: "Retail & Commerce",
    effort: 3,
    value: 3,
    reliability: 3,
    frequency: "Daily",
    platforms: ["sql"],
    approach:
      "Fetch keyword list from catalog or search query log. Define taxonomy. Use LLM few-shot classification with examples per category. Store results with confidence score. Flag low-confidence for human review.",
    risks:
      "Taxonomy definition is upfront manual work. Low-confidence keywords need a review workflow.",
    rec: "Define taxonomy first. LLM classification is fast to prototype once taxonomy exists.",
  },
  {
    id: 19,
    name: "Referbot",
    category: "HR & People",
    effort: 5,
    value: 3,
    reliability: 2,
    frequency: "Weekly",
    platforms: ["asana", "bluedot"],
    approach:
      "Pull open roles from ATS → match against skills DB → identify likely referrers → generate personalized referral request messages → track status and send reminders.",
    risks:
      "LinkedIn data access violates ToS. ATS integrations vary widely. Privacy concerns with network inference.",
    rec: "Major blocker: no LinkedIn access. Scope to ATS-only matching. Reconsider network analysis entirely.",
  },
];

// Build platform → agents map
const platformAgents = {};
Object.keys(PLATFORMS).forEach((pid) => {
  platformAgents[pid] = agents.filter((a) => a.platforms.includes(pid));
});

const categories = [
  "All",
  ...Array.from(new Set(agents.map((a) => a.category))),
];

function Dots({ value, max = 5, color }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < value ? color : "var(--color-border-tertiary)",
          }}
        />
      ))}
    </div>
  );
}

function QuadBadge({ agent }) {
  const q =
    agent.effort <= 3 && agent.value >= 4
      ? "Quick Win"
      : agent.effort <= 3 && agent.value < 4
        ? "Easy Task"
        : agent.value >= 4
          ? "Strategic Bet"
          : "Consider Later";
  const styles = {
    "Quick Win": { bg: "#EAF3DE", c: "#3B6D11" },
    "Easy Task": { bg: "#E1F5EE", c: "#0F6E56" },
    "Strategic Bet": { bg: "#E6F1FB", c: "#185FA5" },
    "Consider Later": { bg: "#F1EFE8", c: "#5F5E5A" },
  };
  const s = styles[q];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 6,
        background: s.bg,
        color: s.c,
        whiteSpace: "nowrap",
      }}
    >
      {q}
    </span>
  );
}

function AgentCard({ agent, onClick }) {
  return (
    <div
      onClick={() => onClick(agent)}
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-border-primary)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--color-border-tertiary)")
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 5,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.3,
            color: "var(--color-text-primary)",
          }}
        >
          {agent.name}
        </p>
        <QuadBadge agent={agent} />
      </div>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 12,
          color: "var(--color-text-secondary)",
        }}
      >
        {agent.category} · {agent.frequency}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          marginBottom: 10,
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 3px",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
            }}
          >
            Effort
          </p>
          <Dots
            value={agent.effort}
            color={
              ["", "#639922", "#639922", "#BA7517", "#E24B4A", "#A32D2D"][
                agent.effort
              ]
            }
          />
        </div>
        <div>
          <p
            style={{
              margin: "0 0 3px",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
            }}
          >
            Value
          </p>
          <Dots
            value={agent.value}
            color={
              ["", "#888780", "#185FA5", "#0F6E56", "#0F6E56", "#0F6E56"][
                agent.value
              ]
            }
          />
        </div>
        <div>
          <p
            style={{
              margin: "0 0 3px",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
            }}
          >
            Data sources
          </p>
          <Dots value={agent.platforms.length} max={5} color="#BA7517" />
        </div>
        <div>
          <p
            style={{
              margin: "0 0 3px",
              fontSize: 11,
              color: "var(--color-text-tertiary)",
            }}
          >
            Reliability
          </p>
          <Dots value={agent.reliability} color="#185FA5" />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {agent.platforms.map((pid) => (
          <span
            key={pid}
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 10,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            {PLATFORMS[pid].name}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ agent, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: 28,
          maxWidth: 580,
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          border: "1px solid #e0e0e0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 17,
                fontWeight: 600,
                color: "#111",
              }}
            >
              {agent.name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
              {agent.category} · {agent.frequency}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f0f0f0",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "#333",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 500,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {[
            {
              label: "Effort",
              v: agent.effort,
              sub: ["", "Low", "Low-Med", "Medium", "Med-High", "High"][
                agent.effort
              ],
              c: ["", "#639922", "#639922", "#BA7517", "#E24B4A", "#A32D2D"][
                agent.effort
              ],
            },
            {
              label: "Business value",
              v: agent.value,
              sub: ["", "Low", "Low-Med", "Medium", "Med-High", "High"][
                agent.value
              ],
              c: ["", "#888780", "#185FA5", "#0F6E56", "#0F6E56", "#0F6E56"][
                agent.value
              ],
            },
            {
              label: "Data sources",
              v: agent.platforms.length,
              sub: `${agent.platforms.length} source${agent.platforms.length !== 1 ? "s" : ""}`,
              c: "#BA7517",
            },
            {
              label: "Reliability",
              v: agent.reliability,
              sub: ["", "Poor", "Fair", "Moderate", "Good", "High"][
                agent.reliability
              ],
              c: "#185FA5",
            },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: "#f7f7f7",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <p style={{ margin: "0 0 5px", fontSize: 11, color: "#888" }}>
                {m.label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: i < m.v ? m.c : "#ddd",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "#555" }}>{m.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Data sources & endpoints
          </p>
          {agent.platforms.map((pid) => {
            const p = PLATFORMS[pid];
            return (
              <div
                key={pid}
                style={{
                  background: "#f9f9f9",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: p.color,
                  }}
                >
                  {p.name}
                </p>
                {p.endpoints.map((ep, i) => (
                  <p
                    key={i}
                    style={{
                      margin: "0 0 3px",
                      fontSize: 12,
                      color: "#444",
                      paddingLeft: 8,
                      borderLeft: `2px solid ${p.color}33`,
                    }}
                  >
                    — {ep}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Recommended approach
          </p>
          <p
            style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#333" }}
          >
            {agent.approach}
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Risks & watch-outs
          </p>
          <p
            style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#333" }}
          >
            {agent.risks}
          </p>
        </div>

        <div
          style={{
            background: "#EBF4FF",
            borderRadius: 8,
            padding: "12px 16px",
            borderLeft: "3px solid #185FA5",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 12,
              fontWeight: 600,
              color: "#185FA5",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Recommendation
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: "#1a1a1a",
            }}
          >
            {agent.rec}
          </p>
        </div>
      </div>
    </div>
  );
}

function SourcesView() {
  const [expanded, setExpanded] = useState({});
  const sorted = Object.entries(PLATFORMS).sort(
    (a, b) =>
      (platformAgents[b[0]]?.length || 0) - (platformAgents[a[0]]?.length || 0),
  );
  const toggle = (pid) => setExpanded((e) => ({ ...e, [pid]: !e[pid] }));

  return (
    <div>
      <p
        style={{
          fontSize: 13,
          color: "var(--color-text-secondary)",
          margin: "0 0 14px",
        }}
      >
        Click any source to see agents and exact data needed. Sources used by 3+
        agents = highest leverage to connect first.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(([pid, plat]) => {
          const count = platformAgents[pid]?.length || 0;
          const isOpen = expanded[pid];
          const buildFirst = count >= 3;
          return (
            <div
              key={pid}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                onClick={() => toggle(pid)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "var(--color-background-secondary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: plat.dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    flex: 1,
                  }}
                >
                  {plat.name}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    marginRight: 8,
                  }}
                >
                  {count} agent{count !== 1 ? "s" : ""}
                </span>
                {buildFirst && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: "2px 10px",
                      borderRadius: 6,
                      background: "#FEF2F2",
                      color: "#A32D2D",
                    }}
                  >
                    Build first
                  </span>
                )}
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    marginLeft: 4,
                  }}
                >
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {isOpen && (
                <div
                  style={{
                    padding: "0 18px 16px",
                    borderTop: "0.5px solid var(--color-border-tertiary)",
                  }}
                >
                  {count > 0 && (
                    <div style={{ marginTop: 14, marginBottom: 12 }}>
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Agents using this source
                      </p>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                      >
                        {platformAgents[pid].map((a) => (
                          <span
                            key={a.id}
                            style={{
                              fontSize: 12,
                              padding: "3px 10px",
                              borderRadius: 6,
                              background: "var(--color-background-secondary)",
                              color: "var(--color-text-primary)",
                              border:
                                "0.5px solid var(--color-border-tertiary)",
                            }}
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {plat.name} endpoints needed
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    {plat.endpoints.map((ep, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            color: plat.dot,
                            fontSize: 14,
                            lineHeight: "20px",
                            flexShrink: 0,
                          }}
                        >
                          —
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            lineHeight: 1.6,
                          }}
                        >
                          {ep}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatrixView({ agents, onSelect }) {
  const quads = [
    {
      label: "Strategic Bets",
      desc: "High value · High effort",
      bg: "#E6F1FB",
      tc: "#185FA5",
      f: (a) => a.effort > 3 && a.value >= 4,
    },
    {
      label: "Quick Wins",
      desc: "High value · Low effort",
      bg: "#EAF3DE",
      tc: "#3B6D11",
      f: (a) => a.effort <= 3 && a.value >= 4,
    },
    {
      label: "Consider Later",
      desc: "Low value · High effort",
      bg: "#F1EFE8",
      tc: "#5F5E5A",
      f: (a) => a.effort > 3 && a.value < 4,
    },
    {
      label: "Easy Tasks",
      desc: "Low value · Low effort",
      bg: "#E1F5EE",
      tc: "#0F6E56",
      f: (a) => a.effort <= 3 && a.value < 4,
    },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {quads.map((q) => (
          <div
            key={q.label}
            style={{
              background: q.bg,
              borderRadius: 10,
              padding: 12,
              minHeight: 140,
            }}
          >
            <p
              style={{
                margin: "0 0 2px",
                fontSize: 12,
                fontWeight: 600,
                color: q.tc,
              }}
            >
              {q.label}
            </p>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                color: q.tc,
                opacity: 0.7,
              }}
            >
              {q.desc}
            </p>
            {agents.filter(q.f).map((a) => (
              <div
                key={a.id}
                onClick={() => onSelect(a)}
                style={{
                  background: "#fff",
                  borderRadius: 6,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                  marginBottom: 5,
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  color: "#222",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(0,0,0,0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)")
                }
              >
                {a.name}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          ← High effort
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
          Low effort →
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("cards");
  const [filterCat, setFilterCat] = useState("All");
  const [sortBy, setSortBy] = useState("priority");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list =
      filterCat === "All"
        ? agents
        : agents.filter((a) => a.category === filterCat);
    if (sortBy === "priority")
      list = [...list].sort(
        (a, b) =>
          b.value -
          b.effort * 0.5 +
          b.reliability * 0.3 -
          (a.value - a.effort * 0.5 + a.reliability * 0.3),
      );
    if (sortBy === "effort-asc")
      list = [...list].sort((a, b) => a.effort - b.effort);
    if (sortBy === "value-desc")
      list = [...list].sort((a, b) => b.value - a.value);
    if (sortBy === "deps-asc")
      list = [...list].sort((a, b) => a.platforms.length - b.platforms.length);
    return list;
  }, [filterCat, sortBy]);

  return (
    <div style={{ padding: "1rem 0", maxWidth: 900, margin: "0 auto" }}>
      {selected && (
        <DetailPanel agent={selected} onClose={() => setSelected(null)} />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total ideas", value: 19, color: "#5F5E5A" },
          {
            label: "Quick wins",
            value: agents.filter((a) => a.effort <= 3 && a.value >= 4).length,
            color: "#3B6D11",
          },
          {
            label: "Strategic bets",
            value: agents.filter((a) => a.effort > 3 && a.value >= 4).length,
            color: "#185FA5",
          },
          {
            label: "Shared sources (2+ agents)",
            value: Object.keys(PLATFORMS).filter(
              (pid) => (platformAgents[pid]?.length || 0) >= 2,
            ).length,
            color: "#BA7517",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--color-background-secondary)",
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 11,
                color: "var(--color-text-tertiary)",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                color: s.color,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            borderRadius: 8,
            overflow: "hidden",
            border: "0.5px solid var(--color-border-secondary)",
          }}
        >
          {[
            ["cards", "Cards"],
            ["matrix", "Priority matrix"],
            ["sources", "Data sources"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                cursor: "pointer",
                border: "none",
                background:
                  view === v
                    ? "var(--color-background-secondary)"
                    : "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                fontWeight: view === v ? 500 : 400,
              }}
            >
              {l}
            </button>
          ))}
        </div>
        {view !== "sources" && (
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8 }}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        {view === "cards" && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8 }}
          >
            <option value="priority">Sort: overall priority</option>
            <option value="effort-asc">Sort: lowest effort first</option>
            <option value="value-desc">Sort: highest value first</option>
            <option value="deps-asc">Sort: fewest data sources</option>
          </select>
        )}
      </div>

      {view === "sources" && <SourcesView />}
      {view === "matrix" && (
        <MatrixView agents={filtered} onSelect={setSelected} />
      )}
      {view === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: 12,
          }}
        >
          {filtered.map((a) => (
            <AgentCard key={a.id} agent={a} onClick={setSelected} />
          ))}
        </div>
      )}

      <p
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "var(--color-text-tertiary)",
          textAlign: "center",
        }}
      >
        Click any card for full analysis · Data sources tab shows endpoints
        sorted by reuse
      </p>
    </div>
  );
}
