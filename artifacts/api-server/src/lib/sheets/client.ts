import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

export interface SheetValues {
  range: string;
  values: string[][];
}

export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // If it looks like a raw ID (no slashes, no spaces)
  if (/^[a-zA-Z0-9-_]+$/.test(urlOrId.trim())) return urlOrId.trim();
  throw new Error("Could not extract spreadsheet ID from the provided URL or ID.");
}

export async function getSpreadsheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
    { method: "GET" }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets API error: ${res.status} – ${err}`);
  }
  const data = await res.json() as {
    spreadsheetId: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    sheets: data.sheets.map((s) => ({ sheetId: s.properties.sheetId, title: s.properties.title })),
  };
}

export async function getSheetValues(
  spreadsheetId: string,
  tabName: string,
  maxRows = 500
): Promise<SheetValues> {
  const range = encodeURIComponent(`${tabName}!A1:Z${maxRows}`);
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { method: "GET" }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets API error: ${res.status} – ${err}`);
  }
  const data = await res.json() as { range: string; values?: string[][] };
  return { range: data.range, values: data.values ?? [] };
}

export async function getSheetHeaders(
  spreadsheetId: string,
  tabName: string
): Promise<string[]> {
  const range = encodeURIComponent(`${tabName}!1:1`);
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { method: "GET" }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch headers: ${res.status} – ${err}`);
  }
  const data = await res.json() as { values?: string[][] };
  return data.values?.[0] ?? [];
}
