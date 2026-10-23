// Client-side document generators for the wallet demo screens (no backend).

import { CUSTOMER, SAC_CODE, priceBreakup, sumBreakup, formatINR, formatDate, formatDateTime } from "@/lib/walletMock";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const validity = (p) => (p.validFrom === p.validTo ? formatDate(p.validFrom) : `${formatDate(p.validFrom)} – ${formatDate(p.validTo)}`);

const DOC_STYLE = `body{font-family:Arial,sans-serif;max-width:760px;margin:32px auto;color:#1f1f1f;font-size:14px}
h1{margin:0;font-size:22px}h2{font-size:15px;margin:24px 0 8px}.muted{color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}
th{background:#f6f3ee;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.r{text-align:right}.tot td{font-weight:bold;border-top:2px solid #1f1f1f}
.grid{display:flex;justify-content:space-between;gap:24px;margin-top:16px}.box{flex:1;border:1px solid #ddd;border-radius:8px;padding:12px}
.demo{display:inline-block;background:#fff3cd;color:#7a5a00;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold}`;

/**
 * GST tax invoice for a pass payment.
 * payment: { txnId, invoiceNo, at, methodLabel, passes, walletPaid?, gatewayPaid?, gatewayMethod? }
 */
export function downloadTaxInvoice(payment) {
  const totals = sumBreakup(payment.passes);
  const rows = payment.passes
    .map((p, i) => {
      const b = priceBreakup(p.baseAmount);
      return `<tr><td>${i + 1}</td><td>${esc(p.passType)}<div class="muted">${esc(p.id)} · ${esc(p.subject)} · ${esc(validity(p))}</div></td><td>${SAC_CODE}</td><td class="r">${formatINR(b.base)}</td><td class="r">${formatINR(b.cgst)}</td><td class="r">${formatINR(b.sgst)}</td><td class="r">${formatINR(b.total)}</td></tr>`;
    })
    .join("");
  const split =
    payment.walletPaid > 0 && payment.gatewayPaid > 0
      ? `<br><b>Paid from wallet:</b> ${formatINR(payment.walletPaid)} · <b>Paid via ${esc(payment.gatewayMethod)}:</b> ${formatINR(payment.gatewayPaid)}`
      : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tax Invoice ${esc(payment.invoiceNo)}</title><style>${DOC_STYLE}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>TAX INVOICE</h1><p class="muted">Chennai Port Authority · APACS</p></div><span class="demo">DEMO DOCUMENT</span></div>
<div class="grid">
<div class="box"><b>Billed to</b><br>${esc(CUSTOMER.company)}<br>${esc(CUSTOMER.address)}<br>GSTIN: <b>${esc(CUSTOMER.gstin)}</b><br>SAP Customer ID: ${esc(CUSTOMER.sapCustomerId)}</div>
<div class="box"><b>Invoice No:</b> ${esc(payment.invoiceNo)}<br><b>Invoice Date:</b> ${formatDateTime(payment.at)}<br><b>Transaction ID:</b> ${esc(payment.txnId)}<br><b>Place of supply:</b> Tamil Nadu (33)<br><b>Payment:</b> ${esc(payment.methodLabel)}${split}</div>
</div>
<table><thead><tr><th>#</th><th>Description</th><th>SAC</th><th class="r">Taxable</th><th class="r">CGST 9%</th><th class="r">SGST 9%</th><th class="r">Total</th></tr></thead><tbody>${rows}
<tr class="tot"><td></td><td>Total</td><td></td><td class="r">${formatINR(totals.base)}</td><td class="r">${formatINR(totals.cgst)}</td><td class="r">${formatINR(totals.sgst)}</td><td class="r">${formatINR(totals.total)}</td></tr></tbody></table>
<p class="muted" style="margin-top:24px">This is a computer-generated invoice and does not require a signature.</p></body></html>`;
  download(`APACS-Invoice-${payment.invoiceNo.replace(/\//g, "-")}.html`, html, "text/html");
}

/** CSV statement of wallet activity (rows already carry balanceAfter). */
export function downloadStatementCsv(rows, label) {
  const header = ["Date & Time", "Reference No.", "Description", "Method", "Credit (INR)", "Debit (INR)", "Paid via gateway (INR)", "Status", "Balance after (INR)", "Invoice No."];
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((a) =>
    [
      formatDateTime(a.at),
      a.id,
      a.description,
      a.method,
      a.amount > 0 ? a.amount.toFixed(2) : "",
      a.amount < 0 ? (-a.amount).toFixed(2) : "",
      a.gatewayPaid ? a.gatewayPaid.toFixed(2) : "",
      a.status,
      a.balanceAfter != null ? a.balanceAfter.toFixed(2) : "",
      a.invoiceNo || "",
    ]
      .map(cell)
      .join(","),
  );
  const meta = [`${cell("APACS Wallet Statement")}`, `${cell(`${CUSTOMER.company} · GSTIN ${CUSTOMER.gstin}`)}`, cell(label), ""];
  download(`APACS-Wallet-Statement-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + [...meta, header.map(cell).join(","), ...lines].join("\n"), "text/csv");
}

/**
 * Printable pass sheet with one QR per pass.
 * qrSvgs: { [passId]: "<svg …>" } captured from the rendered QR codes.
 */
export function downloadQrSheet(passes, qrSvgs, txnId) {
  const cards = passes
    .map(
      (p) => `<div class="card"><div>${qrSvgs[p.id] || ""}</div><div><h2 style="margin:0">${esc(p.passType)}</h2><p><b>${esc(p.subject)}</b></p><p class="muted">${esc(p.id)}<br>Valid: ${esc(validity(p))}<br>Show this QR at the gate.</p></div></div>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>APACS Passes ${esc(txnId)}</title><style>${DOC_STYLE}
.card{display:flex;gap:20px;align-items:center;border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0;page-break-inside:avoid}.card svg{width:150px;height:150px}</style></head>
<body><h1>APACS Gate Passes</h1><p class="muted">Transaction ${esc(txnId)} · <span class="demo">DEMO</span></p>${cards}</body></html>`;
  download(`APACS-Passes-${txnId}.html`, html, "text/html");
}
