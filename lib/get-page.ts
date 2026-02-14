import fs from "fs";

/** Same shape as structure content (no Dnd dependency) */
export interface PageData {
  content: Array<{ type: string; props: Record<string, unknown>; id?: string }>;
  root: { props: Record<string, unknown> };
}

// Replace with call to your database
export const getPage = (path: string): PageData | null => {
  const allData: Record<string, PageData> | null = fs.existsSync("database.json")
    ? JSON.parse(fs.readFileSync("database.json", "utf-8"))
    : null;

  return allData ? allData[path] : null;
};
