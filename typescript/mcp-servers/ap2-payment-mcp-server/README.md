## AP2 Payment MCP Server

This MCP server exposes a single high-trust tool that calculates loan EMIs and produces Google Agent Payments Protocol (AP2) mandates so downstream agents can register automated repayments.

### Features
- Deterministic EMI calculation and amortization schedules.
- Generates AP2-compliant `IntentMandate`, `CartMandate`, and `PaymentMandate` payloads aligned with the [v0.1 specification](https://github.com/google-agentic-commerce/AP2).
- Optional HTTP submission to an AP2 transport endpoint (set `AP2_TRANSPORT_ENDPOINT` and `GOOGLE_API_KEY`/`AP2_API_KEY`).
- Built on the shared `@daaif/mcp-common` server wrapper for stdio/HTTP transports.

### Available Tools

| Tool ID | Description |
| --- | --- |
| `create_ap2_loan_emi_plan` | Validates user-provided loan terms, creates the EMI repayment plan, and prepares the AP2 mandates plus optional submission receipt. |
| `pay_ap2_loan_emi_due` | Looks up the next EMI due for a loan account, generates a one-time AP2 payment mandate, and optionally submits it to AP2 for processing. |

### Inputs
- Planning tool: `principal_amount`, `annual_interest_rate`, `tenure_months`, `disbursement_date`, `currency`, and AP2 context like `customer_id`, `merchant_agent_id`, `credential_provider_id`, `payment_network`, `autopay_anchor_date`
- Payment tool: `loan_account_number` plus the same AP2 routing context; optionally override `autopay_anchor_date` (defaults to the due date)

### Outputs
- EMI plan tool: EMI amount, totals, and the full amortization schedule
- Payment tool: Live EMI due, repayment schedule (single installment), and the AP2 mandate bundle
- Both tools emit `ap2_bundle` containing the three mandates and any submission receipt data

### Getting Started
```bash
cd typescript/mcp-servers/ap2-payment-mcp-server
npm install
npm run dev
```

Set the following variables when you want live AP2 submission behaviour:

```bash
$env:AP2_TRANSPORT_ENDPOINT="https://agentpaymentsprotocol.example/mandates"
$env:GOOGLE_API_KEY="your-key"
```

When the endpoint is unset, the tool still returns the mandates so they can be relayed over MCP/A2A manually.

