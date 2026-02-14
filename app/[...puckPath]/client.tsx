"use client";

import type { PageData } from "../../lib/get-page";
import { StructurePreview } from "@/components/StructurePreview";

export function Client({ data }: { data: PageData }) {
  return <StructurePreview data={data} />;
}
