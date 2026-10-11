# En Linea website — build notes and backend handoff

This package implements the **En Linea Website — System Requirements Study** (25 Sep 2026) on top of the existing static agency site. The New Clients pages use the design of the approved packages landing page (`docs/reference-packages-landing.html`).

Everything a visitor or client sees is built. The parts that need a server (lead storage, the live audit engine, client sign-in, invoice data, payments) are wired to clearly marked endpoints in `assets/config.js` and run on **demo data** until those endpoints exist. Demo mode is always labelled on screen.

---

## 1. What's in the package

| Page | SRS section | Status |
|---|---|---|
| `index.html` | — | Existing agency site. Added a Packages section and links to the new pages and client login. |
| `packages.html` | 1.1, 1.3, 2.4 | Built on the approved landing page. Adds "What a month looks like" per package, audit, results chart, working signup. |
| `geo-ai-ads.html` | 1.2, 1.3 | New standalone page with its own headline, proof, pricing framing ($799), deep GEO audit, and its own signup and thank-you page. |
| `thank-you.html`, `geo-ai-ads-thank-you.html` | 1.1, 1.2 | Separate confirmation pages so each campaign can track its own conversion. |
| `client/login.html` | Cross-cutting: Authentication | Password or magic-link sign-in. Demo accounts while no backend is connected. |
| `client/index.html` | 2.1, 2.2, 2.3 | Dashboard: Overview (the three client questions), Contracts, Billing, This month. |
| `admin/review.html` | 2.2 Approval gate | Internal screen to check and publish the monthly invoice and report. Sample data only. |

Scripts: `assets/config.js` (settings), `leads.js` (forms), `audit.js` (audit tool), `growth-chart.js` (2.4 chart), `portal-api.js` (dashboard data layer), `portal.js` (dashboard UI), `landing.js` (ticker clocks).

---

## 2. Before going live: checklist

1. **Lead destination** — set `leadsEndpoint` in `assets/config.js` (see section 3). Until then, the signup forms open the visitor's email app with the lead pre-written, so nothing is lost, but it's clunky.
2. **Tracking** — paste the Meta Pixel and Google tag into the `<head>` of `packages.html` and `geo-ai-ads.html` (a comment marks the spot). Use separate conversions per page.
3. **Audit engine** — until `auditEndpoint` is set, the audit shows sample figures with a "Sample results" notice. **Don't point paid ads at the audit in demo mode.**
4. **Growth chart** — uses the placeholder figures from SRS 2.4, labelled "Illustrative figures". Replace the data in `assets/growth-chart.js` and set `GROWTH_DATA_IS_PLACEHOLDER = false` once Meta Ads and all client accounts are connected.
5. **Client dashboard** — do not tell clients about it until the backend in section 5 exists. In demo mode, sign-in is switched off and only sample accounts open.
6. **Confirm copy** — the approved page says "Since 2016" and "10 years"; the agency homepage says "2015 Founded". Pick one. Also confirm the currency of the $1,000 and $799 prices, and that "No long-term contract" matches your agreements.

---

## 3. Lead capture (SRS 1.1, 1.2, 1.3)

Both signup forms and every audit run `POST` a JSON body (sent as `text/plain` to avoid a CORS preflight).

**Signup payload**
```json
{
  "type": "signup",
  "form_source": "packages-page | geo-ai-ads-page",
  "package": "Growth | Reach | Rank | GEO and AI Ads",
  "full_name": "", "business_name": "", "email": "", "phone": "",
  "audit_plan": "Start with Rank, then Reach",
  "page_url": "", "submitted_at": "ISO date",
  "utm_source": "", "utm_medium": "", "utm_campaign": "", "utm_content": "", "utm_term": "", "fbclid": "", "gclid": ""
}
```

**Audit-run payload** (sent for every completed audit, whether or not the visitor signs up)
```json
{
  "type": "audit_run",
  "form_source": "packages-page-audit | geo-page-audit",
  "package": "growth | reach | rank | geo",
  "website": "", "industry": "", "city": "", "instagram": "", "facebook": "", "tiktok": "", "budget": "",
  "scores": { "ads": 0, "video": 0, "ai": 0, "gbp": 0 },
  "market": { "ads": 0, "video": 0, "ai": 0, "gbp": 0 },
  "suggested_packages": "Rank > Reach > Growth",
  "demo_results": true
}
```
Set `auditLeadsEndpoint` to send audit runs somewhere different from signups (for example, a separate "non-converters" list). Blank means both go to `leadsEndpoint`.

**Quickest option: Google Sheet.** Create a sheet, then Extensions → Apps Script, paste this, and Deploy → New deployment → Web app → Execute as *Me*, Access *Anyone*. Put the web-app URL in `leadsEndpoint`.

```js
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = data.type === 'audit_run' ? 'Audit runs' : 'Signups';
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  ['scores', 'market'].forEach(function (k) { if (data[k]) data[k] = JSON.stringify(data[k]); });
  var headers = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  Object.keys(data).forEach(function (k) {
    if (headers.indexOf(k) === -1) { headers.push(k); sheet.getRange(1, headers.length).setValue(k); }
  });
  sheet.appendRow(headers.map(function (h) { return data[h] !== undefined ? data[h] : ''; }));
  if (data.type === 'signup') {
    MailApp.sendEmail('info@enlineacreative.com', 'New ' + data.package + ' signup: ' + data.business_name,
      JSON.stringify(data, null, 2));
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 4. Audit engine (SRS 1.3)

`POST {auditEndpoint}` with the visitor's inputs (same fields as the audit-run payload). Return JSON in this shape and the front end renders it; anything missing falls back to the demo engine with a notice.

```json
{
  "area": {
    "ads":   { "you": 34, "market": 61 },
    "video": { "you": 22, "market": 58 },
    "ai":    { "you": 18, "market": 49 },
    "gbp":   { "you": 41, "market": 66 }
  },
  "detail": {
    "ads":   { "metrics": [{ "label": "Ad activity on Meta and Google", "you": 30, "market": 65 }], "findings": ["plain-text sentence"] },
    "video": { "metrics": [{ "label": "Videos posted per week", "you": 1, "market": 4, "unit": "count" }], "findings": [] },
    "ai":    { "platforms": [{ "name": "ChatGPT", "status": "Recommended | Mentioned | Not found" }], "findings": [] },
    "gbp":   { "metrics": [/* 4 rows: completeness %, total reviews, reviews last 90 days, rating */],
               "competitors": [{ "name": "Real competitor name", "reviews": 180, "rating": "4.6" }], "findings": [] }
  }
}
```
`unit` is one of `%`, `count`, `rating`, or omitted for a 0–100 score. Findings are rendered as plain text.

Likely data sources (SRS open question): a local-rank / Business Profile API for reviews and competitors, the Meta Ad Library and Google Ads Transparency Center for competitor ad activity, and a scheduled job that asks ChatGPT, Gemini and Google a fixed set of category questions and records who is cited. If real-time is too slow, return a partial result and email the full report; the page already says the full report follows by email when the engine is busy.

---

## 5. Client dashboard API (SRS Part 2)

Host the dashboard on its own subdomain (for example `portal.enlineacreative.com`) with a real backend. The static files in `client/` can be served from there; set `apiBase` in `config.js`.

### Data isolation (hard requirement)
- **No endpoint takes a client ID.** Every route is `/me/...` and the server resolves the client from the session.
- Every database query is filtered by that client ID in the data layer (row-level security or an enforced repository filter), not in the UI.
- No client-facing route can list more than one client's records.
- Test: sign in as client A, request client B's invoice PDF or pay link directly by URL — it must return 404.

### Endpoints
All JSON, cookie session (`HttpOnly`, `Secure`, `SameSite=Lax`), CORS limited to the site origin with credentials.

| Method | Path | Returns |
|---|---|---|
| POST | `/session` | `{email, password}` → sets cookie. 401 on bad credentials. Rate-limit. |
| POST | `/session/magic-link` | `{email}` → always 204 (don't reveal which emails exist). Link valid 15 minutes. |
| DELETE | `/session` | Signs out. |
| GET | `/me` | `{ user: {email, name}, client: {name, currency: "LKR"|"USD", packages: [], platforms: ["google","meta","tiktok"]} }` |
| GET | `/me/contracts` | `[{ id, title, packages: [], start_date, end_date, document_url }]` |
| GET | `/me/invoices` | Published invoices only: `[{ id, number, period: "2026-08", issue_date, due_date, paid_at, currency, lines: [{kind: "ad_spend"|"fee"|"other", label, source, amount}], pay_url, pdf_url }]` |
| GET | `/me/performance?month=YYYY-MM` | `{ updated_at, month_to_date, platforms: [{ platform, spend, results, result_label, actions: [] }] }` or `null` |

`pay_url` and `pdf_url` must be signed or session-checked links, never guessable.

### Monthly generation (SRS 2.2)
1. On the **5th of each month**, a scheduled job pulls the prior month's actual spend per client from Windsor.ai (Google, Meta, and TikTok once connected), adds each package fee and any other fees from the client's record, and creates invoice + report records with status `draft`.
2. Drafts appear in the internal review screen (`admin/review.html` shows the intended flow). Publishing is blocked if any spend line failed to sync.
3. A staff member confirms the checks and presses **Publish**. Only then: status → `published`, `published_at` set, invoice appears in `/me/invoices`, and the client is emailed.
4. **Flag** keeps it hidden and records a note. After the data is fixed, regenerate and review again.

### Payments
The study names Stripe as the front-runner. Stripe's hosted invoice page matches "pay directly through a link on the invoice" — store its URL as `pay_url` and mark the invoice paid from Stripe's `invoice.paid` webhook. Note that Stripe onboards businesses by country of registration and, as far as we know, doesn't support Sri Lanka-registered businesses, so it would run under the Canadian entity. For LKR clients, confirm Stripe can charge in LKR for that account, or use a Sri Lankan gateway such as PayHere for LKR invoices. Either way, the dashboard only needs a `pay_url` per invoice.

---

## 6. SRS open questions: what this build assumes

| Question | Assumption in this build | Change it in |
|---|---|---|
| Payment processor | Any provider that gives a per-invoice payment link | Backend only |
| Signup lead destination | One endpoint; Google Sheet script provided | `config.js` |
| Who manages contracts, expiry alerts | Agency side; in-dashboard flag at 60 days | `contractWarningDays` in `config.js` |
| Single sign-on | Email + password or magic link | Backend |
| Audit data sources, real-time vs queued | Real-time with a queued/email fallback message | Section 4 |
| Audit gated or free | Free, before signup (lead magnet) | `audit.js` |
| Growth chart data | Placeholder, labelled | `growth-chart.js` |
| Audit lead destination | Same as signups unless `auditLeadsEndpoint` is set | `config.js` |
| Who can publish invoices | Any signed-in staff member; the screen records who | Backend |
| Reviewer flags an issue | Stays hidden; regenerate and re-review | Backend |
| TikTok data | Dashboard and invoices already support it; shows once connected | Windsor.ai |

---

## 7. Hosting

The public pages are plain HTML, CSS and JavaScript with no build step: upload to `public_html` as before. `robots.txt` keeps `/client/` and `/admin/` out of search engines, but **that is not security**: the admin page must not be deployed publicly until it sits behind staff sign-in.
