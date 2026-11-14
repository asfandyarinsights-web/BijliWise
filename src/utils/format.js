export const fmtPKR = (n) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
export const fmtKwh = (n) => `${Math.round(n).toLocaleString("en-PK")} kWh`;
export const pctChange = (now, prev) => (prev ? ((now - prev) / prev) * 100 : 0);
