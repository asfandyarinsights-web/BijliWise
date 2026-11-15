
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
