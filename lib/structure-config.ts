import config from '../dnd.config';

export type ComponentType = keyof typeof config.components;

export const COMPONENT_TYPES = Object.keys(config.components) as ComponentType[];

export function getComponentLabel(type: ComponentType): string {
  const comp = config.components[type];
  return (comp && comp.label) ? String(comp.label) : type;
}

export function getDefaultProps(type: ComponentType): Record<string, unknown> {
  const comp = config.components[type];
  if (!comp?.defaultProps) return {};
  return { ...comp.defaultProps } as Record<string, unknown>;
}

export type FieldDef = {
  type: string;
  label: string;
  options?: Array<{ label: string; value: string }>;
  arrayFields?: Record<string, { type: string; label: string; options?: Array<{ label: string; value: string }> }>;
};

export function getComponentFields(type: ComponentType): Record<string, FieldDef> {
  const comp = config.components[type];
  if (!comp?.fields) return {};
  return comp.fields as Record<string, FieldDef>;
}

export { config as dndConfig };
