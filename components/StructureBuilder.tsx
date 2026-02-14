'use client';

import React, { useCallback, useState } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Button,
  TextField,
  Select,
  ChoiceList,
  Box,
  Text,
  Divider,
  Scrollable,
} from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import { dndConfig } from '@/lib/structure-config';
import {
  COMPONENT_TYPES,
  getComponentLabel,
  getDefaultProps,
  getComponentFields,
  type ComponentType,
  type FieldDef,
} from '@/lib/structure-config';

export interface DndContentItem {
  type: string;
  props: Record<string, unknown>;
  id?: string;
}

export interface DndData {
  content: DndContentItem[];
  root: { props: Record<string, unknown> };
}

const DND_TYPE_NEW = 'application/x-structure-component-type';
const DND_TYPE_INDEX = 'application/x-structure-item-index';

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface StructureBuilderProps {
  data: DndData;
  onChange: (data: DndData) => void;
}

/** Shopify-style section grouping for component properties */
const STYLE_KEYS = new Set([
  'backgroundColor', 'backgroundColorCustom', 'textColor', 'textColorCustom',
  'padding', 'paddingCustom', 'margin', 'marginCustom',
]);
const AI_KEYS = new Set(['aiInstruction']);

function groupFields(entries: [string, FieldDef][]): { section: string; entries: [string, FieldDef][] }[] {
  const content: [string, FieldDef][] = [];
  const style: [string, FieldDef][] = [];
  const ai: [string, FieldDef][] = [];
  for (const [key, field] of entries) {
    if (STYLE_KEYS.has(key)) style.push([key, field]);
    else if (AI_KEYS.has(key)) ai.push([key, field]);
    else content.push([key, field]);
  }
  const result: { section: string; entries: [string, FieldDef][] }[] = [];
  if (content.length) result.push({ section: 'Content', entries: content });
  if (style.length) result.push({ section: 'Style', entries: style });
  if (ai.length) result.push({ section: 'AI instructions', entries: ai });
  return result;
}

/** Renders a single form control by field type (used for top-level and array sub-fields). */
function renderFieldControl(
  key: string,
  field: { type: string; label: string; options?: Array<{ label: string; value: string }> },
  value: unknown,
  update: (v: unknown) => void
) {
  const label = field.label || key;
  if (field.type === 'text') {
    return (
      <TextField
        key={key}
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={update}
        autoComplete="off"
      />
    );
  }
  if (field.type === 'textarea') {
    return (
      <TextField
        key={key}
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={update}
        multiline={3}
        autoComplete="off"
      />
    );
  }
  if (field.type === 'number') {
    return (
      <TextField
        key={key}
        label={label}
        type="number"
        value={value != null ? String(value) : ''}
        onChange={(v) => update(v === '' ? undefined : Number(v))}
        autoComplete="off"
      />
    );
  }
  if (field.type === 'select' && field.options) {
    return (
      <Select
        key={key}
        label={label}
        options={field.options}
        value={typeof value === 'string' ? value : ''}
        onChange={update}
      />
    );
  }
  if (field.type === 'radio' && field.options) {
    const selectedStr =
      typeof value === 'string' ? value : value === true ? 'true' : value === false ? 'false' : '';
    return (
      <ChoiceList
        key={key}
        title={label}
        choices={field.options.map((o) => ({ label: o.label, value: String(o.value) }))}
        selected={selectedStr ? [selectedStr] : []}
        onChange={(sel) => {
          const v = sel[0];
          if (v === 'true') update(true);
          else if (v === 'false') update(false);
          else update(v);
        }}
        allowMultiple={false}
      />
    );
  }
  return (
    <TextField
      key={key}
      label={label}
      value={value != null ? String(value) : ''}
      onChange={update}
      autoComplete="off"
    />
  );
}

/** Renders a single component's properties panel (Shopify Admin style with sections). */
function ComponentFieldsForm({
  item,
  onUpdate,
  onRemove,
}: {
  item: DndContentItem;
  onUpdate: (props: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const type = item.type as ComponentType;
  const fields = getComponentFields(type);
  const fieldEntries = Object.entries(fields);
  const sections = groupFields(fieldEntries);

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center" align="space-between">
        <Text as="h3" variant="headingSm">
          {getComponentLabel(type)}
        </Text>
        <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={onRemove} accessibilityLabel="Remove component" />
      </InlineStack>
      <Divider />
      {fieldEntries.length === 0 ? (
        <Text as="p" tone="subdued">
          No editable fields.
        </Text>
      ) : (
        <BlockStack gap="400">
          {sections.map(({ section, entries }) => (
            <BlockStack key={section} gap="300">
              <Text as="h4" variant="headingXs">
                {section}
              </Text>
              <Divider />
              <BlockStack gap="300">
                {entries.map(([key, field]) => {
                  const value = item.props[key];
                  const update = (v: unknown) => onUpdate({ ...item.props, [key]: v });

                  if (field.type === 'array') {
                    const arr = Array.isArray(value) ? value : [];
                    const defaultRow = field.arrayFields
                      ? Object.fromEntries(
                          Object.entries(field.arrayFields).map(([k, sub]) => [
                            k,
                            sub.type === 'radio' ? false : sub.type === 'number' ? undefined : '',
                          ])
                        )
                      : {};
                    const addRow = () =>
                      onUpdate({ ...item.props, [key]: [...arr, { ...defaultRow }] });
                    const removeRow = (i: number) =>
                      onUpdate({ ...item.props, [key]: arr.filter((_: unknown, idx: number) => idx !== i) });
                    const updateRow = (i: number, subKey: string, subVal: unknown) => {
                      const row = arr[i];
                      const next = [...arr];
                      next[i] =
                        typeof row === 'object' && row !== null
                          ? { ...row, [subKey]: subVal }
                          : { [subKey]: subVal };
                      onUpdate({ ...item.props, [key]: next });
                    };
                    return (
                      <Box key={key} paddingBlockStart="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {field.label}
                        </Text>
                        <BlockStack gap="200">
                          {arr.map((row: unknown, i: number) => (
                            <Box key={i} padding="300" background="bg-surface-secondary" borderRadius="200">
                              <InlineStack gap="300" align="space-between" wrap={false}>
                                <div className="min-w-0 flex-1">
                                  <BlockStack gap="200">
                                    {field.arrayFields &&
                                      Object.entries(field.arrayFields).map(([subKey, subField]) => (
                                        <Box key={subKey} minHeight="0" as="div">
                                          {renderFieldControl(
                                            subKey,
                                            { type: subField.type, label: subField.label ?? subKey, options: subField.options },
                                            typeof row === 'object' && row !== null && subKey in row
                                              ? (row as Record<string, unknown>)[subKey]
                                              : '',
                                            (v) => updateRow(i, subKey, v)
                                          )}
                                        </Box>
                                      ))}
                                  </BlockStack>
                                </div>
                                <Button
                                  variant="plain"
                                  tone="critical"
                                  icon={DeleteIcon}
                                  onClick={() => removeRow(i)}
                                  accessibilityLabel="Remove row"
                                />
                              </InlineStack>
                            </Box>
                          ))}
                          <Button variant="plain" onClick={addRow}>
                            Add item
                          </Button>
                        </BlockStack>
                      </Box>
                    );
                  }
                  return <React.Fragment key={key}>{renderFieldControl(key, field, value, update)}</React.Fragment>;
                })}
              </BlockStack>
            </BlockStack>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}

export function StructureBuilder({ data, onChange }: StructureBuilderProps) {
  const content = data?.content ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const selectedIndex = content.findIndex((item) => (item.id ?? '') === selectedId);
  const selectedItem = selectedIndex >= 0 ? content[selectedIndex] : null;

  const updateContent = useCallback(
    (next: DndContentItem[]) => {
      onChange({
        ...data,
        content: next,
        root: data?.root ?? { props: {} },
      });
    },
    [data, onChange]
  );

  const insertAt = useCallback(
    (index: number, item: DndContentItem) => {
      const next = [...content];
      next.splice(index, 0, { ...item, id: item.id ?? generateId() });
      updateContent(next);
      setSelectedId(next[index].id ?? null);
    },
    [content, updateContent]
  );

  const moveTo = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const next = content.filter((_, i) => i !== fromIndex);
      const item = content[fromIndex];
      next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, item);
      updateContent(next);
      setSelectedId(item.id ?? null);
    },
    [content, updateContent]
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = content.filter((_, i) => i !== index);
      updateContent(next);
      if (content[index]?.id === selectedId) setSelectedId(null);
    },
    [content, selectedId, updateContent]
  );

  const updatePropsAt = useCallback(
    (index: number, newProps: Record<string, unknown>) => {
      const next = content.map((item, i) => (i === index ? { ...item, props: newProps } : item));
      updateContent(next);
    },
    [content, updateContent]
  );

  const handleDragStartComponent = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData(DND_TYPE_NEW, type);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', getComponentLabel(type));
  };

  const handleDragStartItem = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData(DND_TYPE_INDEX, String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDropIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.types.includes(DND_TYPE_NEW) ? 'copy' : 'move';
    setDropIndex(index);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, atIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDropIndex(null);
      setDraggingIndex(null);
      const newType = e.dataTransfer.getData(DND_TYPE_NEW);
      const fromIndexStr = e.dataTransfer.getData(DND_TYPE_INDEX);
      if (newType && COMPONENT_TYPES.includes(newType as ComponentType)) {
        const defaultProps = getDefaultProps(newType as ComponentType);
        insertAt(atIndex, { type: newType, props: defaultProps, id: generateId() });
      } else if (fromIndexStr !== '') {
        const fromIndex = parseInt(fromIndexStr, 10);
        if (!Number.isNaN(fromIndex) && fromIndex >= 0 && fromIndex < content.length) {
          const resolvedTo = fromIndex < atIndex ? atIndex - 1 : atIndex;
          if (resolvedTo !== fromIndex) moveTo(fromIndex, resolvedTo);
        }
      }
    },
    [content.length, insertAt, moveTo]
  );

  return (
    <div className="flex gap-4 h-full min-h-[420px] w-full">
      {/* Left: Components panel - narrow, flex-aligned */}
      <div className="w-[180px] flex-shrink-0 flex flex-col justify-start items-center">
        <Card>
          <div className="flex flex-col justify-start items-center w-full">
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Components
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Drag onto the canvas to add.
              </Text>
              <BlockStack gap="200">
                {COMPONENT_TYPES.map((type) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStartComponent(e, type)}
                  style={{ cursor: 'grab' }}
                >
                  <Box
                    paddingBlock="200"
                    paddingInline="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                  >
                    <Text as="span" variant="bodySm" fontWeight="medium">
                      {getComponentLabel(type)}
                    </Text>
                  </Box>
                </div>
                ))}
              </BlockStack>
            </BlockStack>
          </div>
        </Card>
      </div>

      {/* Center: Canvas - full width, flex column for seamless editing */}
      <div className="flex-1 min-w-0 flex flex-col justify-start items-stretch w-full">
        <Card>
          <div
            className="min-h-[380px] p-4 w-full min-w-0 flex flex-col justify-start items-center app-scroll-area"
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
          >
          {content.length === 0 ? (
            <div
              className="flex flex-col justify-start items-center min-h-[340px] w-full min-w-0 rounded border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500"
              style={{ width: '100%' }}
              onDragOver={(e) => handleDragOver(e, 0)}
              onDrop={(e) => handleDrop(e, 0)}
            >
              {dropIndex === 0 ? (
                <span className="text-blue-600 font-medium">Drop here to add</span>
              ) : (
                <span>Drop a component here</span>
              )}
            </div>
          ) : (
            <>
              {content.map((item, index) => {
                const id = item.id ?? `item-${index}`;
                const isSelected = selectedId === id;
                const comp = dndConfig.components[item.type];
                const isDragging = draggingIndex === index;
                const showDropBefore = dropIndex === index;

                return (
                  <React.Fragment key={id}>
                    {/* Drop zone before this item - taller and clickable for easier multi-add */}
                    <div
                      className={`min-h-[28px] w-full min-w-0 flex items-center justify-center rounded border-2 border-dashed transition-colors ${showDropBefore ? 'bg-blue-100 border-blue-400' : 'border-transparent hover:border-gray-300 hover:bg-gray-50/50'}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(e, index);
                      }}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {showDropBefore && (
                        <span className="text-xs font-medium text-blue-600">
                          {draggingIndex !== null ? 'Drop to reorder' : 'Drop to add here'}
                        </span>
                      )}
                    </div>
                    {/* Rendered block (selectable, draggable); drop new = add after, drop existing = reorder before */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStartItem(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes(DND_TYPE_NEW)) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDragOver(e, index + 1);
                        } else if (e.dataTransfer.types.includes(DND_TYPE_INDEX)) {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDragOver(e, index);
                        }
                      }}
                      onDrop={(e) => {
                        if (e.dataTransfer.types.includes(DND_TYPE_NEW)) {
                          handleDrop(e, index + 1);
                        } else if (e.dataTransfer.types.includes(DND_TYPE_INDEX)) {
                          handleDrop(e, index);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(id);
                      }}
                      className={`relative rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing w-full min-w-0 ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'} ${isDragging ? 'opacity-50' : ''} ${dropIndex === index && draggingIndex !== null ? 'ring-2 ring-amber-300 border-amber-400' : ''}`}
                    >
                      <div className="p-2 flex items-center justify-between gap-2 bg-gray-50/80 rounded-t-lg border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-600 truncate">
                          {getComponentLabel(item.type as ComponentType)}
                        </span>
                        <Button
                          variant="plain"
                          tone="critical"
                          icon={DeleteIcon}
                          onClick={() => removeAt(index)}
                          accessibilityLabel="Remove"
                        />
                      </div>
                      <div className="px-4 rounded-b-lg">
                        {comp?.render ? comp.render(item.props) : <span className="text-gray-400 text-sm">No preview</span>}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              {/* Drop zone after last item - tall so multiple components are easy to add */}
              <div
                className={`min-h-[28px] w-full min-w-0 flex items-center justify-center rounded border-2 border-dashed transition-colors ${dropIndex === content.length ? 'bg-blue-100 border-blue-400' : 'border-transparent hover:border-gray-300 hover:bg-gray-50/50'}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(e, content.length);
                }}
                onDrop={(e) => handleDrop(e, content.length)}
              >
                {(dropIndex === content.length) && (
                  <span className="text-xs font-medium text-blue-600">
                    {draggingIndex !== null ? 'Drop to reorder' : 'Drop to add here'}
                  </span>
                )}
              </div>
            </>
          )}
          </div>
        </Card>
      </div>

      {/* Right: Properties panel - flex-aligned */}
      <div className="w-72 flex-shrink-0 flex flex-col justify-start items-center">
        <Card>
          <div className="flex flex-col justify-start items-center w-full">
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Properties
              </Text>
              {selectedItem && selectedIndex >= 0 ? (
                <ComponentFieldsForm
                  item={selectedItem}
                  onUpdate={(props) => updatePropsAt(selectedIndex, props)}
                  onRemove={() => removeAt(selectedIndex)}
                />
              ) : (
                <Text as="p" tone="subdued">
                  Select a component on the canvas to edit its properties.
                </Text>
              )}
            </BlockStack>
          </div>
        </Card>
      </div>
    </div>
  );
}
