export function exportCsv(rows, filename = "bijliwise-demo-data.csv") {
  const header = ["Month", "Consumption (kWh)", "Estimated bill (PKR)"];
  const body = rows.map((r) => [r.label, r.kwh, r.bill].join(","));
  const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
