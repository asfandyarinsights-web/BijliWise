
function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCsv(rows, filename = "bijliwise-monthly-analytics.csv") {
  const header = [
    "Month",
    "Consumption (kWh)",
    "Electricity bill (PKR)",
  ];

  const body = rows.map((row) =>
    [
      row.label,
      row.kwh,
      row.bill,
    ].map(escapeCsv).join(",")
  );

  const csv = [header.map(escapeCsv).join(","), ...body].join("\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// --- Analytics report export (used by the Analytics page) ---

// Builds the CSV text for the Analytics page. Rows are the filtered month records.
export function buildAnalyticsCsv(rows, periodLabel) {
  const header = [
    "Reporting period",
    "Month",
    "Total consumption (kWh)",
    "Total electricity expense (PKR)",
    "Number of bills",
  ];

  const body = rows.map((row) =>
    [periodLabel, row.label, row.kwh, row.expense, row.bills].map(escapeCsv).join(",")
  );

  return [header.map(escapeCsv).join(","), ...body].join("\n");
}

export function exportAnalyticsCsv(rows, periodLabel, filename = "bijliwise-analytics-report.csv") {
  const csv = buildAnalyticsCsv(rows, periodLabel);

  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}