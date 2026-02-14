'use client';

import React from 'react';
import { dndConfig } from '@/lib/structure-config';

export interface DndData {
  content: Array<{ type: string; props: Record<string, unknown>; id?: string }>;
  root: { props: Record<string, unknown> };
}

interface StructurePreviewProps {
  data: DndData | null;
  className?: string;
}

/** Renders content structure using dnd.config render functions (no Dnd dependency). */
export function StructurePreview({ data, className }: StructurePreviewProps) {
  if (!data?.content?.length) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500 ${className ?? ''}`}>
        No content to preview. Add components in the structure editor.
      </div>
    );
  }

  const contentNodes = data.content.map((item, index) => {
    const comp = dndConfig.components[item.type];
    if (!comp?.render) return null;
    return (
      <React.Fragment key={item.id ?? index}>
        {comp.render(item.props)}
      </React.Fragment>
    );
  });

  const children = <>{contentNodes}</>;
  return (
    <div className={className ?? ''}>
      {dndConfig.root.render({ children })}
    </div>
  );
}
