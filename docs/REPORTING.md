# CHAINTRACE AI — Reporting

## 1. PDF Report Generation

**Endpoint:** `GET /api/investigations/:id/report`

**Authentication:** Required when `AUTH_REQUIRED=true` (via `authenticate` + `authorizeInvestigation`)

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="chaintrace-investigation-{investigation_id}.pdf"`
- Streamed PDF document generated with `pdfkit`

## 2. Report Structure

The PDF report contains the following sections:

### Section 1: Executive Summary
- High-level description of the automated analysis
- Investigation ID, Case ID, Status, Analysis Mode, Synthetic/Demo flag

### Section 2: Target Wallet
- Wallet address
- Blockchain network
- Analysis timestamp

### Section 3: Risk Assessment
- Risk score (e.g., `35/100`)
- Risk level (LOW/MEDIUM/HIGH/CRITICAL)
- Confidence percentage
- Risk factors list (if any)

### Section 4: Transaction & Fund-Flow Analysis
- Transactions analyzed count
- Funds traced amount
- Maximum trace hops
- Clustering analysis tag
- Peeling-chain analysis status

### Section 5: Destination Attribution
- Likely destination entity
- Destination type
- Entity name
- Attribution confidence

### Section 6: Detected Fraud Patterns
- Enumerated patterns with evidence
- If no patterns: "No high-confidence fraud patterns were detected."

### Section 7: Blockchain Trace Summary
- Full `trace_summary` object rendered as key-value pairs

### Section 8: Compliance Screening
- OFAC match status (MATCH DETECTED / NO MATCH DETECTED)

### Section 9: Investigation Timeline
- Created at timestamp
- Completed at timestamp
- Final progress percentage

### Section 10: Automated Investigation Conclusion
- Risk-based narrative conclusion
- Example: "The wallet received a HIGH-RISK assessment and should be prioritized for further investigation."

### Section 11: Evidence & Limitations
- Disclaimer that findings are analytical indicators, not legal conclusions
- Explicit statement about synthetic vs. live data
- Recommendation to independently verify findings

## 3. Frontend Report Preview

**File:** `frontend/src/components/InvestigationReportPreview.tsx`

The frontend renders a formatted report preview with:
- Report header with case ID and investigation ID
- Target wallet details
- Risk overview (score, level, metrics)
- Destination attribution
- Fraud patterns
- Risk factors
- Trace summary
- Compliance screening
- Evidence & methodology

### PDF Export Flow
1. User clicks "Export as PDF" in the report preview
2. Frontend calls `GET /api/investigations/{investigation_id}/report`
3. Response is received as a `Blob`
4. A temporary `<a>` element is created with `download` attribute
5. Browser triggers file download
6. Object URL is revoked after download

## 4. Report Limitations

- PDF is generated server-side with `pdfkit` (no client-side PDF libraries)
- Large investigations may produce large PDFs (no pagination or chunking)
- Report content is only as good as the underlying investigation data
- Synthetic/demo investigations are clearly marked in the report
