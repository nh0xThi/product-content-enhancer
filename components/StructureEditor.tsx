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
} from '@shopify/polaris';
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import {
  COMPONENT_TYPES,
  getComponentLabel,
  getDefaultProps,
  getComponentFields,
  type ComponentType,
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

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface StructureEditorProps {
  data: DndData;
  onChange: (data: DndData) => void;
}

export function StructureEditor({ data, onChange }: StructureEditorProps) {
  const content = data?.content ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addType, setAddType] = useState<ComponentType | ''>('');

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

  const addComponent = useCallback(() => {
    if (!addType) return;
    const type = addType as ComponentType;
    const defaultProps = getDefaultProps(type);
    const newItem: DndContentItem = {
      type,
      props: { ...defaultProps },
      id: generateId(),
    };
    updateContent([...content, newItem]);
    setAddType('');
    setExpandedId(newItem.id ?? null);
  }, [addType, content, updateContent]);

  const removeComponent = useCallback(
    (index: number) => {
      const next = content.filter((_, i) => i !== index);
      updateContent(next);
      if (expandedId && content[index]?.id === expandedId) setExpandedId(null);
    },
    [content, expandedId, updateContent]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...content];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      updateContent(next);
    },
    [content, updateContent]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= content.length - 1) return;
      const next = [...content];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      updateContent(next);
    },
    [content, updateContent]
  );

  const updateProps = useCallback(
    (index: number, newProps: Record<string, unknown>) => {
      const next = content.map((item, i) =>
        i === index ? { ...item, props: newProps } : item
      );
      updateContent(next);
    },
    [content, updateContent]
  );

  const selectOptions = COMPONENT_TYPES.map((type) => ({
    label: getComponentLabel(type),
    value: type,
  }));

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Content structure
          </Text>
          <InlineStack gap="300" blockAlign="center">
            <Box minWidth="240px">
              <Select
                label="Add component"
                labelInline
                options={[{ label: 'Select a component', value: '' }, ...selectOptions]}
                value={addType}
                onChange={setAddType}
              />
            </Box>
            <Button variant="primary" onClick={addComponent} disabled={!addType}>
              Add
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {content.length === 0 ? (
        <Card>
          <Box padding="400">
            <Text as="p" tone="subdued">
              No components yet. Add a component above to build your content structure.
            </Text>
          </Box>
        </Card>
      ) : (
        <BlockStack gap="300">
          {content.map((item, index) => {
            const id = item.id ?? `item-${index}`;
            const isExpanded = expandedId === id;
            const fields = getComponentFields(item.type as ComponentType);
            const fieldEntries = Object.entries(fields);

            return (
              <Card key={id}>
                <BlockStack gap="300">
                  <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <Button
                      variant="plain"
                      accessibilityLabel="Expand"
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                    />
                    <Box minWidth="120px">
                      <Text as="span" fontWeight="semibold">
                        {getComponentLabel(item.type as ComponentType)}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        {' '}
                        ({index + 1})
                      </Text>
                    </Box>
                    <InlineStack gap="100">
                      <Button
                        variant="plain"
                        accessibilityLabel="Move up"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="plain"
                        accessibilityLabel="Move down"
                        onClick={() => moveDown(index)}
                        disabled={index === content.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="plain"
                        tone="critical"
                        accessibilityLabel="Remove"
                        icon={DeleteIcon}
                        onClick={() => removeComponent(index)}
                      />
                    </InlineStack>
                  </InlineStack>

                  {isExpanded && fieldEntries.length > 0 && (
                    <>
                      <Divider />
                      <BlockStack gap="300">
                        {fieldEntries.map(([key, field]) => {
                          const value = item.props[key];
                          const update = (v: unknown) =>
                            updateProps(index, { ...item.props, [key]: v });

                          if (field.type === 'text') {
                            return (
                              <TextField
                                key={key}
                                label={field.label}
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
                                label={field.label}
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
                                label={field.label}
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
                                label={field.label}
                                options={field.options}
                                value={typeof value === 'string' ? value : ''}
                                onChange={update}
                              />
                            );
                          }
                          if (field.type === 'radio' && field.options) {
                            const options = field.options as Array<{ label: string; value: string | boolean }>;
                            const selectedStr = typeof value === 'string' ? value : value === true ? 'true' : value === false ? 'false' : '';
                            return (
                              <ChoiceList
                                key={key}
                                title={field.label}
                                choices={options.map((o) => ({
                                  label: o.label,
                                  value: String(o.value),
                                }))}
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
                          if (field.type === 'array') {
                            const arr = Array.isArray(value) ? value : [];
                            const addRow = () =>
                              update([
                                ...arr,
                                field.arrayFields
                                  ? Object.fromEntries(Object.keys(field.arrayFields).map((k) => [k, '']))
                                  : {},
                              ]);
                            const removeRow = (i: number) =>
                              update(arr.filter((_, idx) => idx !== i));
                            const updateRow = (i: number, subKey: string, subVal: unknown) => {
                              const row = arr[i];
                              const next = [...arr];
                              next[i] =
                                typeof row === 'object' && row !== null
                                  ? { ...row, [subKey]: subVal }
                                  : { [subKey]: subVal };
                              update(next);
                            };
                            return (
                              <Box key={key} paddingBlockStart="200">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {field.label}
                                </Text>
                                <BlockStack gap="200">
                                  {arr.map((row: unknown, i: number) => (
                                    <Box
                                      key={i}
                                      padding="200"
                                      background="bg-surface-secondary"
                                      borderRadius="200"
                                    >
                                      <InlineStack gap="200" blockAlign="center">
                                        {field.arrayFields &&
                                          Object.entries(field.arrayFields).map(([subKey, subField]) => (
                                            <TextField
                                              key={subKey}
                                              label={subField?.label ?? subKey}
                                              value={
                                                typeof row === 'object' && row !== null && subKey in row
                                                  ? String((row as Record<string, unknown>)[subKey])
                                                  : ''
                                              }
                                              onChange={(v) => updateRow(i, subKey, v)}
                                              autoComplete="off"
                                            />
                                          ))}
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
                                    + Add item
                                  </Button>
                                </BlockStack>
                              </Box>
                            );
                          }
                          return null;
                        })}
                      </BlockStack>
                    </>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </BlockStack>
      )}
    </BlockStack>
  );
}
