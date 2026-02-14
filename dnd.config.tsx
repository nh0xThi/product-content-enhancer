import React from "react";
import { Play } from "lucide-react";

export interface StructureConfig {
  root: { render: (props: { children: React.ReactNode }) => React.ReactNode };
  components: Record<string, {
    label: string;
    fields?: Record<string, unknown>;
    defaultProps?: Record<string, unknown>;
    render: (props: Record<string, any>) => React.ReactNode;
  }>;
}

// Preset color options
const colorPresets = [
  { label: "Default (transparent)", value: "transparent" },
  { label: "White", value: "#ffffff" },
  { label: "Light Gray", value: "#f3f4f6" },
  { label: "Gray", value: "#6b7280" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Black", value: "#000000" },
  { label: "Blue", value: "#2563eb" },
  { label: "Light Blue", value: "#dbeafe" },
  { label: "Green", value: "#10b981" },
  { label: "Red", value: "#ef4444" },
  { label: "Yellow", value: "#fbbf24" },
  { label: "Purple", value: "#9333ea" },
  { label: "Custom...", value: "custom" },
];

// Preset spacing options
const spacingPresets = [
  { label: "None", value: "0" },
  { label: "Small (8px)", value: "8px" },
  { label: "Medium (16px)", value: "16px" },
  { label: "Large (24px)", value: "24px" },
  { label: "Extra Large (32px)", value: "32px" },
  { label: "Custom...", value: "custom" },
];

// Helper function to resolve color value
const resolveColor = (preset?: string, custom?: string): string | undefined => {
  if (preset === "custom" && custom) {
    return custom;
  } else if (preset && preset !== "custom" && preset !== "transparent") {
    return preset;
  } else if (preset === "transparent") {
    return "transparent";
  }
  return undefined;
};

// Helper function to resolve spacing value
const resolveSpacing = (preset?: string, custom?: string): string | undefined => {
  if (preset === "custom" && custom) {
    return custom;
  } else if (preset && preset !== "custom") {
    return preset;
  }
  return undefined;
};

// Helper function to get tone styles
const getToneStyles = (tone?: string): React.CSSProperties => {
  const toneStyles: Record<string, React.CSSProperties> = {
    bold: {
      fontWeight: "700",
      fontSize: "inherit",
      letterSpacing: "-0.02em",
    },
    technical: {
      fontWeight: "600",
      fontSize: "inherit",
      fontFamily: "monospace",
    },
    friendly: {
      fontWeight: "600",
      fontSize: "inherit",
      lineHeight: "1.3",
    },
    premium: {
      fontWeight: "500",
      fontSize: "inherit",
      letterSpacing: "0.01em",
      textTransform: "uppercase",
    },
  };
  return toneStyles[tone || ""] || {};
};

// Helper function to get styling props
const getStyleProps = (
  textColor?: string,
  textColorCustom?: string,
  padding?: string,
  paddingCustom?: string,
  margin?: string,
  marginCustom?: string
): React.CSSProperties => {
  const styles: React.CSSProperties = {};

  const txtColor = resolveColor(textColor, textColorCustom);
  if (txtColor) styles.color = txtColor;

  const pad = resolveSpacing(padding, paddingCustom);
  if (pad) styles.padding = pad;

  const mar = resolveSpacing(margin, marginCustom);
  if (mar) styles.margin = mar;

  return styles;
};

type Props = {
  HeroText: {
    content: string;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    aiInstruction?: string;
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  ShortDescription: {
    content: string;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    characterLimit?: number;
    channelTargeting?: Array<{ value: string }>;
    bannedTerms?: string;
    aiInstruction?: string;
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  Features: {
    content: Array<{
      name: string;
      description: string;
      priority?: number;
      showIcon?: boolean;
    }>;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    emphasizeBenefits?: boolean;
    aiInstruction?: string;
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  LongDescription: {
    content: string;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    useSectionHeadings?: boolean;
    expandableSections?: boolean;
    seoKeywords?: string;
    readingLevel?: "simple" | "standard" | "advanced";
    bannedPhrases?: string;
    aiInstruction?: string;
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  TechnicalSpecifications: {
    content: Array<{
      name: string;
      value: string;
      unit?: string;
      locked?: boolean;
    }>;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    collapsible?: boolean;
    aiInstruction?: string;
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  BrandLink: {
    brandName: string;
    url: string;
    openInNewTab?: boolean;
    description?: string;
    autoPopulate?: boolean;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
  YouTubeEmbed: {
    content: string;
    embedStyle?: "inline" | "thumbnail" | "modal";
    aspectRatio?: "16:9" | "4:3" | "1:1";
    caption?: string;
    autoGenerateCaption?: boolean;
    tone?: "neutral" | "bold" | "technical" | "friendly" | "premium";
    // textColor?: string;
    // textColorCustom?: string;
    // padding?: string;
    // paddingCustom?: string;
    // margin?: string;
    // marginCustom?: string;
  };
};

export const config: StructureConfig = {
  root: {
    render: ({ children }) => <div className="p-6">{children}</div>,
  },
  components: {
    HeroText: {
      label: "Hero Text",
      fields: {
        content: {
          type: "text",
          label: "Headline",
        },
        tone: {
          type: "select",
          label: "Tone",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
        aiInstruction: {
          type: "textarea",
          label: "AI Instruction Override (optional)",
        },
      },
      defaultProps: {
        content: "Example Product Headline",
        tone: "neutral",
      },
      render: ({ content, tone, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {

        return (
            <h2 style={{
                marginBottom: "0.5rem",
                fontSize: "1.7rem",
                fontWeight: "600",
              }}>{content}</h2>
        );
      },
    },
    ShortDescription: {
      label: "Short Description",
      fields: {
        content: {
          type: "textarea",
          label: "Description",
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        characterLimit: {
          type: "number",
          label: "Character Limit",
        },
        channelTargeting: {
          type: "array",
          label: "Channel Targeting",
          getItemSummary: (item: { value: string }) => item?.value || "New channel",
          arrayFields: {
            value: {
              type: "select",
              options: [
                { label: "Web", value: "web" },
                { label: "Email", value: "email" },
                { label: "Social", value: "social" },
              ],
            },
          },
        },
        bannedTerms: {
          type: "textarea",
          label: "Banned Terms (comma-separated)",
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
        aiInstruction: {
          type: "textarea",
          label: "AI Instruction Override (optional)",
        },
      },
      defaultProps: {
        content: "This is a brief summary describing the product in one or two sentences. It highlights the main product value without going into too much detail.",
        characterLimit: 200,
        channelTargeting: [],
        bannedTerms: "",
        tone: "neutral",
      },
      render: ({ content, tone, characterLimit, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "0.5rem 0", paddingCustom, margin, marginCustom),
        };

        // Enforce character limit when rendering: trim and add ellipsis if trimmed
        const limit = typeof characterLimit === 'number' && characterLimit > 0 ? characterLimit : undefined;
        const displayText = limit ? (content?.length && content.length > limit ? content.slice(0, limit).trimEnd() + '…' : content) : content;

        return (
          <div style={containerStyle}>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: "1.6",
                color: resolvedTextColor || "#374151",
                marginBottom: "8px",
              }}
            >
              {displayText}
            </p>
          </div>
        );
      },
    },
    Features: {
      label: "Features",
      fields: {
        content: {
          type: "array",
          label: "Features",
          getItemSummary: (item: {
            name: string;
            description: string;
            priority?: number;
            showIcon?: boolean;
          }) => item?.name || "New feature",
          arrayFields: {
            name: { type: "text", label: "Feature Name" },
            description: { type: "textarea", label: "Description" },
            priority: {
              type: "number",
              label: "Priority (1-10, higher = more important)",
            },
            showIcon: {
              type: "radio",
              label: "Show Icon",
              options: [
                { label: "Yes", value: true },
                { label: "No", value: false },
              ],
            },
          },
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        emphasizeBenefits: {
          type: "radio",
          label: "Emphasize Benefits vs Specs",
          options: [
            { label: "Benefits", value: true },
            { label: "Specs", value: false },
          ],
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
        aiInstruction: {
          type: "textarea",
          label: "AI Instruction Override (optional)",
        },
      },
      defaultProps: {
        content: [
          {
            name: "Feature 1",
            description: "Description of feature 1",
            priority: 5,
            showIcon: false,
          },
          {
            name: "Feature 2",
            description: "Description of feature 2",
            priority: 5,
            showIcon: false,
          },
          {
            name: "Feature 3",
            description: "Description of feature 3",
            priority: 5,
            showIcon: false,
          },
        ],
        emphasizeBenefits: true,
        tone: "neutral",
      },
      render: ({ content, tone, emphasizeBenefits, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        // Sort by priority if available
        const sortedFeatures = [...(content || [])].sort((a, b) => {
          const aPriority = a.priority || 0;
          const bPriority = b.priority || 0;
          return bPriority - aPriority;
        });
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "0.5rem 0", paddingCustom, margin, marginCustom),
        };

        return (
          <div style={containerStyle}>
            <h3
              style={{
                marginBottom: "0.5rem",
                fontSize: "1.5rem",
                fontWeight: "600",
                color: resolvedTextColor || undefined,
              }}
            >
              {emphasizeBenefits ? "Key Benefits" : "Features"}
            </h3>
            <ul style={{ listStyle: "inside", padding: "0 0 0 1rem" }}>
              {sortedFeatures.map((feature, index) => (
                <li
                  key={`feature-${feature.name}-${index}`}
                  style={{
                    marginBottom: "0.7rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  {feature.showIcon && (
                    <span
                      style={{
                        fontSize: "1.5rem",
                        lineHeight: "1",
                        marginTop: "2px",
                      }}
                    >
                      ✓
                    </span>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "1.125rem",
                        color: resolvedTextColor || undefined,
                      }}
                    >
                      {feature.name}
                    </h4>
                    <p
                      style={{
                        color: resolvedTextColor || "#6b7280",
                        fontSize: "0.9375rem",
                        lineHeight: "1.5",
                        margin: 0,
                      }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      },
    },
    LongDescription: {
      label: "Long Description",
      fields: {
        content: {
          type: "textarea",
          label: "Content",
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        useSectionHeadings: {
          type: "radio",
          label: "Use Section Headings",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        expandableSections: {
          type: "radio",
          label: "Expandable Sections",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        seoKeywords: {
          type: "text",
          label: "SEO Keywords (comma-separated)",
        },
        readingLevel: {
          type: "select",
          label: "Reading Level",
          options: [
            { label: "Simple", value: "simple" },
            { label: "Standard", value: "standard" },
            { label: "Advanced", value: "advanced" },
          ],
        },
        bannedPhrases: {
          type: "textarea",
          label: "Banned Phrases (comma-separated)",
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
        aiInstruction: {
          type: "textarea",
          label: "AI Instruction Override (optional)",
        },
      },
      defaultProps: {
        content: "This is a longer description block intended to demonstrate how extended product content will appear within the layout. It can include multiple sentences and paragraphs to show spacing, line height, and text flow. This block is often used for detailed explanations, background information, or expanded descriptions that go beyond a short summary. Additional paragraphs help illustrate how longer content is handled in the editor and storefront preview.",
        tone: "neutral",
        useSectionHeadings: true,
        expandableSections: false,
        seoKeywords: "",
        readingLevel: "standard",
        bannedPhrases: "",
      },
      render: ({ content, tone, useSectionHeadings, expandableSections, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        // Simple parsing for section headings (lines starting with ##)
        const parseContent = (text: string) => {
          const resolvedTextColor = resolveColor(textColor, textColorCustom);
          const defaultTextColor = resolvedTextColor || "#374151";
          if (!useSectionHeadings) {
            return <p style={{ lineHeight: "1.8", color: defaultTextColor }}>{text}</p>;
          }

          const lines = text.split("\n");
          const elements: React.ReactElement[] = [];
          let currentParagraph: string[] = [];

          lines.forEach((line, index) => {
            if (line.trim().startsWith("##")) {
              // Flush current paragraph
              if (currentParagraph.length > 0) {
                elements.push(
                  <p
                    key={`p-${index}`}
                    style={{ lineHeight: "1.8", color: defaultTextColor, marginBottom: "16px" }}
                  >
                    {currentParagraph.join("\n")}
                  </p>
                );
                currentParagraph = [];
              }
              // Add heading
              const headingText = line.replace(/^##\s*/, "");
              elements.push(
                <h3
                  key={`h-${index}`}
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    marginTop: "24px",
                    marginBottom: "12px",
                    color: defaultTextColor,
                  }}
                >
                  {headingText}
                </h3>
              );
            } else {
              currentParagraph.push(line);
            }
          });

          // Flush remaining paragraph
          if (currentParagraph.length > 0) {
            elements.push(
              <p
                key="p-final"
                style={{ lineHeight: "1.8", color: defaultTextColor, marginBottom: "16px" }}
              >
                {currentParagraph.join("\n")}
              </p>
            );
          }

          return elements.length > 0 ? <>{elements}</> : <p style={{ color: defaultTextColor }}>{text}</p>;
        };
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "24px 0", paddingCustom, margin, marginCustom),
        };

        return (
          <div style={containerStyle}>
            {expandableSections ? (
              <details style={{ marginBottom: "16px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "600",
                    marginBottom: "12px",
                    fontSize: "1.125rem",
                  }}
                >
                  View Full Description
                </summary>
                <div style={{ marginTop: "12px" }}>{parseContent(content)}</div>
              </details>
            ) : (
              <div>{parseContent(content)}</div>
            )}
          </div>
        );
      },
    },
    TechnicalSpecifications: {
      label: "Technical Specifications",
      fields: {
        content: {
          type: "array",
          label: "Specifications",
          getItemSummary: (item: {
            name: string;
            value: string;
            unit?: string;
            locked?: boolean;
          }) => `${item?.name || "New spec"}: ${item?.value || ""} ${item?.unit || ""}`,
          arrayFields: {
            name: { type: "text", label: "Specification Name" },
            value: { type: "text", label: "Value" },
            unit: { type: "text", label: "Unit (optional)" },
            locked: {
              type: "radio",
              label: "Lock (prevent AI editing)",
              options: [
                { label: "Locked", value: true },
                { label: "Unlocked", value: false },
              ],
            },
          },
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        collapsible: {
          type: "radio",
          label: "Collapsible Layout",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
        aiInstruction: {
          type: "textarea",
          label: "AI Instruction Override (optional)",
        },
      },
      defaultProps: {
        content: [
          {
            name: "Dimension",
            value: "10",
            unit: "cm",
            locked: false,
          },
          {
            name: "Weight",
            value: "500",
            unit: "g",
            locked: false,
          },
          {
            name: "Material",
            value: "Premium",
            unit: "",
            locked: false,
          },
        ],
        collapsible: false,
        tone: "neutral",
      },
      render: ({ content, tone, collapsible, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "24px 0", paddingCustom, margin, marginCustom),
        };

        if (!content || content.length === 0) {
          return (
            <div style={containerStyle}>
              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginBottom: "16px",
                  color: resolvedTextColor || undefined,
                }}
              >
                Technical Specifications
              </h3>
              <p style={{ color: resolvedTextColor || "#6b7280", fontStyle: "italic" }}>
                No specifications available
              </p>
            </div>
          );
        }

        const tableContent = (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#ffffff",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontWeight: "600",
                      color: "#111827",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Specification
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontWeight: "600",
                      color: "#111827",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.map((spec, index) => (
                  <tr
                    key={`spec-${spec.name}-${index}`}
                    style={{
                      borderBottom: index < content.length - 1 ? "1px solid #e5e7eb" : "none",
                      backgroundColor: spec.locked ? "#fef3c7" : index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      transition: "background-color 0.2s",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: "500",
                        color: resolvedTextColor || "#374151",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {spec.name}
                      {spec.locked && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "0.75rem",
                            color: resolvedTextColor || "#6b7280",
                          }}
                          title="Locked - AI cannot edit"
                        >
                          🔒
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: resolvedTextColor || "#6b7280",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {spec.value}{spec.unit ? ` ${spec.unit}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        return (
          <div style={containerStyle}>
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "16px",
                color: resolvedTextColor || "#111827",
              }}
            >
              Technical Specifications
            </h3>
            {collapsible ? (
              <details style={{ cursor: "pointer" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "500",
                    marginBottom: "12px",
                    padding: "12px 16px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "6px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9375rem",
                    color: "#374151",
                    userSelect: "none",
                  }}
                >
                  View Specifications ({content.length} {content.length === 1 ? "item" : "items"})
                </summary>
                {tableContent}
              </details>
            ) : (
              tableContent
            )}
          </div>
        );
      },
    },
    BrandLink: {
      label: "Brand Link",
      fields: {
        brandName: {
          type: "text",
          label: "Brand Name",
        },
        url: {
          type: "text",
          label: "URL",
        },
        openInNewTab: {
          type: "radio",
          label: "Open in New Tab",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        description: {
          type: "textarea",
          label: "Brand Description (optional)",
        },
        autoPopulate: {
          type: "radio",
          label: "Auto-populate from Product Data",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
      },
      defaultProps: {
        brandName: "Brand Name",
        url: "https://example.com",
        openInNewTab: true,
        description: "",
        autoPopulate: false,
        tone: "neutral",
      },
      render: ({ brandName, url, openInNewTab, description, tone,  textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "10px", paddingCustom, marginCustom),
        };

        return (
          <div style={containerStyle}>
            {url && !url.startsWith("https://example.com") && (<div style={{ marginBottom: "8px" }}>
              <a
                href={url}
                target={openInNewTab ? "_blank" : "_self"}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: resolvedTextColor || "#2563eb",
                  textDecoration: "none",
                }}
              >
                {brandName} →
              </a>
            </div>)}
            {description && (
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: resolvedTextColor || "#6b7280",
                  marginTop: "8px",
                  marginBottom: 0,
                }}
              >
                {description}
              </p>
            )}
          </div>
        );
      },
    },
    YouTubeEmbed: {
      label: "YouTube Embed",
      fields: {
        content: {
          type: "text",
          label: "YouTube URL",
        },
        embedStyle: {
          type: "select",
          label: "Embed Style",
          options: [
            { label: "Inline", value: "inline" },
            { label: "Thumbnail", value: "thumbnail" },
            { label: "Modal", value: "modal" },
          ],
        },
        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
          options: [
            { label: "16:9", value: "16:9" },
            { label: "4:3", value: "4:3" },
            { label: "1:1", value: "1:1" },
          ],
        },
        caption: {
          type: "textarea",
          label: "Caption (optional)",
        },
        autoGenerateCaption: {
          type: "radio",
          label: "Auto-generate Caption",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        tone: {
          type: "select",
          label: "Tone (optional)",
          options: [
            { label: "Neutral", value: "neutral" },
            { label: "Bold", value: "bold" },
            { label: "Technical", value: "technical" },
            { label: "Friendly", value: "friendly" },
            { label: "Premium", value: "premium" },
          ],
        },
        // textColor: {
        //   type: "select",
        //   label: "Text Color",
        //   options: colorPresets,
        // },
        // textColorCustom: {
        //   type: "text",
        //   label: "Custom Text Color (hex, rgb, or color name)",
        // },
        // padding: {
        //   type: "select",
        //   label: "Padding",
        //   options: spacingPresets,
        // },
        // paddingCustom: {
        //   type: "text",
        //   label: "Custom Padding (e.g., 16px, 16px 24px)",
        // },
        // margin: {
        //   type: "select",
        //   label: "Margin",
        //   options: spacingPresets,
        // },
        // marginCustom: {
        //   type: "text",
        //   label: "Custom Margin (e.g., 16px, 16px 24px)",
        // },
      },
      defaultProps: {
        content: "",
        embedStyle: "thumbnail",
        aspectRatio: "16:9",
        caption: "",
        autoGenerateCaption: false,
        tone: "neutral",
      },
      render: ({ content, embedStyle, aspectRatio, caption, tone, textColor, textColorCustom, padding, paddingCustom, margin, marginCustom }) => {
        // Extract video ID from YouTube URL
        const getVideoId = (url: string): string | null => {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
          }
          return null;
        };

        const videoId = getVideoId(content);
        const resolvedTextColor = resolveColor(textColor, textColorCustom);
        const containerStyle = {
          // ...getStyleProps(textColor, textColorCustom, padding || "24px 0", paddingCustom, margin, marginCustom),
        };

        // For thumbnail-style placeholders, we want a simple black screen with a play button
        // even if there is no valid YouTube URL yet.
        if (!videoId && embedStyle !== "thumbnail") {
          return (
            <div
              style={{
                ...containerStyle,
                border: "1px solid #dc2626",
                borderRadius: "8px",
                color: resolvedTextColor || "#dc2626",
              }}
            >
              Invalid YouTube URL
            </div>
          );
        }

        const aspectRatioMap: Record<string, string> = {
          "16:9": "56.25%",
          "4:3": "75%",
          "1:1": "100%",
        };

        const paddingBottom = aspectRatioMap[aspectRatio || "16:9"] || "56.25%";

        if (embedStyle === "thumbnail") {
          return (
            <div style={containerStyle}>
              <div
                style={{
                  position: "relative",
                  width: "80%",
                  paddingBottom: paddingBottom,
                  backgroundColor: "#000",
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "68px",
                    height: "48px",
                    backgroundColor: "rgba(255, 0, 0, 0.7)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: "24px",
                      marginLeft: "4px",
                    }}
                  >
                    <Play />
                  </span>
                </div>
              </div>
              {caption && (
                <p
                  style={{
                    marginTop: "12px",
                    fontSize: "0.9375rem",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  {caption}
                </p>
              )}
            </div>
          );
        }

        // Inline or modal (for modal, we'll render inline but it can be enhanced with JS)
        return (
          <div style={{ padding: "24px 0" }}>
            <div
              style={{
                position: "relative",
                // width: "100%",
                maxWidth: "200px",
                paddingBottom: paddingBottom,
                height: 0,
                overflow: "hidden",
                borderRadius: "8px",
                backgroundColor: "#000",
              }}
            >
              <iframe
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                src={`https://www.youtube.com/embed/${videoId}`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {caption && (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "0.9375rem",
                  color: resolvedTextColor || "#6b7280",
                  textAlign: "center",
                }}
              >
                {caption}
              </p>
            )}
          </div>
        );
      },
    },
  },
};

export default config;
