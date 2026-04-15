import {
  Canvas,
  CanvasProvider,
  ScrollView,
  Text,
  View,
  Image,
  clientXYToStageLocal,
} from "@react-canvas/react-v2";
import type { Camera, SceneRuntime } from "@react-canvas/react-v2";
import type { SceneGraphSnapshot, ScenePointerEvent } from "@react-canvas/core-v2";
import { useChat } from "@ai-sdk/react";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, tool, isToolUIPart, stepCountIs } from "ai";
import type { ChatTransport, UIMessage, UIMessageChunk, ToolUIPart } from "ai";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { ColorField } from "@/components/color-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { z } from "zod";
import {
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Type,
  Image as ImageIcon,
  LayoutTemplate,
  Box,
  MousePointer2,
  Wrench,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { activateLinguiLocale, linguiI18n, normalizeLinguiLocale } from "./lib/lingui";
import { persistLabLocale } from "./lib/locale-preference";

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const onResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

const PHONE_W = 280;
const PHONE_H = 520;

const CANVAS_PAD = 20;
const CANVAS_GAP = 16;
/** 帧标题行高（Text fontSize=12 + marginBottom=8）。 */
const FRAME_LABEL_H = 20 + 8;
/** 帧手机壳固定 borderWidth=1、无 padding，相对内容宽 +2（左右各 1px）。 */
const FRAME_BORDER = 2;
const FRAME_TOTAL_W = PHONE_W + FRAME_BORDER;
const FRAME_TOTAL_H = PHONE_H + FRAME_BORDER + FRAME_LABEL_H;

/** 手型模式下超过此位移才视为画布平移，否则仍视为点击选中 */
const HAND_PAN_MOVE_THRESHOLD_PX = 8;

/**
 * 根据帧 index 计算其在画布中的 world 坐标中心点。
 * 布局与 `LabDesignPreviewCanvas` 的 `flexWrap` 一致（`justifyContent: center`）。
 */
function calcFrameWorldCenter(
  frameIndex: number,
  viewportW: number,
  totalFrames: number,
): { cx: number; cy: number } {
  const innerW = viewportW - CANVAS_PAD * 2;
  const cols = Math.max(1, Math.floor((innerW + CANVAS_GAP) / (FRAME_TOTAL_W + CANVAS_GAP)));
  const rows = Math.ceil(totalFrames / cols);
  const col = frameIndex % cols;
  const row = Math.floor(frameIndex / cols);
  const framesInRow = row === rows - 1 ? totalFrames - row * cols : cols;
  // calcCanvasSize 里 canvasW = max(viewportW, contentW)，当内容窄于视口时 canvasW = viewportW。
  // Yoga justifyContent:"center" 在 canvasW 内居中整行，所以行的起始 X = canvasW/2 - rowW/2。
  const contentW = cols * FRAME_TOTAL_W + (cols - 1) * CANVAS_GAP + CANVAS_PAD * 2;
  const canvasW = Math.max(viewportW, contentW);
  const rowW = framesInRow * FRAME_TOTAL_W + (framesInRow - 1) * CANVAS_GAP;
  const rowStartX = canvasW / 2 - rowW / 2;
  const cx = rowStartX + col * (FRAME_TOTAL_W + CANVAS_GAP) + FRAME_TOTAL_W / 2;
  const cy = CANVAS_PAD + row * (FRAME_TOTAL_H + CANVAS_GAP) + FRAME_TOTAL_H / 2;
  return { cx, cy };
}

/** 根据视口宽度计算内容画布尺寸（不小于视口本身）。 */
function calcCanvasSize(
  viewportW: number,
  viewportH: number,
  frameCount: number,
): { canvasW: number; canvasH: number } {
  const innerW = viewportW - CANVAS_PAD * 2;
  const cols = Math.max(1, Math.floor((innerW + CANVAS_GAP) / (FRAME_TOTAL_W + CANVAS_GAP)));
  const rows = Math.ceil(frameCount / cols);
  const contentW = cols * FRAME_TOTAL_W + (cols - 1) * CANVAS_GAP + CANVAS_PAD * 2;
  const contentH = rows * FRAME_TOTAL_H + (rows - 1) * CANVAS_GAP + CANVAS_PAD * 2;
  return {
    canvasW: Math.max(viewportW, contentW),
    canvasH: Math.max(viewportH, contentH),
  };
}
const BRAND = "#53B175";
const PAGE_BG = "#ffffff";
const MUTED = "#94a3b8";
const TEXT = "#0f172a";
const LAB_AI_TOKEN_KEY = "open-canvas-lab-ai-token";
const LAB_AI_API_URL_KEY = "open-canvas-lab-ai-api-url";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";

function normalizeDeepseekBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_DEEPSEEK_BASE_URL;
  return trimmed.replace(/\/v1\/chat\/completions$/i, "/v1").replace(/\/chat\/completions$/i, "");
}

function StatusBar() {
  return (
    <View
      name="StatusBar"
      style={{
        height: 38,
        paddingLeft: 12,
        paddingRight: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: PAGE_BG,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>9:41</Text>
      <Text style={{ fontSize: 11, color: TEXT }}>100%</Text>
    </View>
  );
}

function PhoneShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      name="PhoneShell"
      style={{
        width: PHONE_W,
        height: PHONE_H,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#e2e8f0",
        borderRadius: 18,
        backgroundColor: PAGE_BG,
      }}
    >
      <StatusBar />
      <View
        name="NavBar"
        style={{
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PAGE_BG,
        }}
      >
        <Text name="NavTitle" style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
          {title}
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
      <View name="PageContent" style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}

// --- JSON Schema 驱动渲染演示 ---
type ComponentSchema = {
  id: string;
  type: "View" | "Text" | "ScrollView" | "Image";
  name?: string;
  props?: any;
  text?: string;
  children?: ComponentSchema[];
};

type LabFrameTemplate =
  | "product"
  | "explore"
  | "beverages"
  | "search"
  | "filters"
  | "cart"
  | "favourite";

/** 与 AI 工具 execute 共用，保证手动测试与对话调工具行为一致 */
function applyUpdateComponentPropsToSchema(
  prev: ComponentSchema,
  {
    nodeId,
    props,
    text,
  }: {
    nodeId: string;
    props?: Record<string, unknown>;
    text?: string;
  },
): ComponentSchema {
  const updateTree = (node: ComponentSchema): ComponentSchema => {
    if (node.id === nodeId || node.name === nodeId) {
      const nextProps = props ? { ...node.props, ...props } : node.props;
      if (text === undefined) {
        return { ...node, props: nextProps };
      }
      if (node.type !== "Text") {
        return { ...node, props: nextProps };
      }
      return { ...node, props: nextProps, text };
    }
    if (node.children) {
      return { ...node, children: node.children.map(updateTree) };
    }
    return node;
  };
  return updateTree(prev);
}

/** 供 querySchemaNodes 工具：按关键词在 id / name / type / 文案 上打分，非向量语义；含少量中英别名扩展。 */
type SchemaNodeQueryHit = {
  nodeId: string;
  type: ComponentSchema["type"];
  name?: string;
  textPreview?: string;
  path: string;
  score: number;
};

/** 常见中文说法 → 与 Lab schema 中英 id/name/text 对齐的补充词（子串匹配） */
const SCHEMA_QUERY_TOKEN_ALIASES: Record<string, readonly string[]> = {
  价格: ["price", "pricetext"],
  价: ["price"],
  元: ["$", "¥", "rmb"],
  商品: ["product"],
  详情: ["details", "productdetails"],
  标题: ["title", "producttitle"],
  描述: ["description", "productdesc", "desc"],
  图片: ["image", "productimage", "apple"],
  加购: ["basket", "cart", "add-to-cart"],
  购物车: ["cart", "basket"],
  数量: ["qty", "quantity"],
};

function expandSchemaQueryToken(token: string): readonly string[] {
  const raw = token.trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const aliases = SCHEMA_QUERY_TOKEN_ALIASES[raw] ?? SCHEMA_QUERY_TOKEN_ALIASES[lower];
  const variants = new Set<string>([lower]);
  if (aliases) {
    for (const a of aliases) variants.add(a.toLowerCase());
  }
  return [...variants];
}

function scoreTokenAgainstNode(
  token: string,
  idl: string,
  namel: string,
  textl: string,
  typel: string,
): number {
  let best = 0;
  for (const v of expandSchemaQueryToken(token)) {
    if (!v) continue;
    if (idl.includes(v)) best = Math.max(best, 4);
    if (namel.includes(v)) best = Math.max(best, 3);
    if (textl.includes(v)) best = Math.max(best, 3);
    if (typel.includes(v)) best = Math.max(best, 1);
  }
  return best;
}

function searchSchemaNodesByQuery(
  root: ComponentSchema,
  query: string,
  limit: number,
): SchemaNodeQueryHit[] {
  const q = query.trim().toLowerCase();
  const hits: SchemaNodeQueryHit[] = [];

  function walk(node: ComponentSchema, path: string) {
    const nodePath = path ? `${path} > ${node.id}` : node.id;
    const idl = node.id.toLowerCase();
    const namel = node.name?.toLowerCase() ?? "";
    const textl = (node.text ?? "").toLowerCase();
    const typel = node.type.toLowerCase();

    if (!q) {
      hits.push({
        nodeId: node.id,
        type: node.type,
        name: node.name,
        textPreview: node.text?.slice(0, 120),
        path: nodePath,
        score: 0,
      });
    } else {
      const tokens = q.split(/\s+/).filter(Boolean);
      let score = 0;
      for (const t of tokens) {
        score += scoreTokenAgainstNode(t, idl, namel, textl, typel);
      }
      if (score > 0) {
        hits.push({
          nodeId: node.id,
          type: node.type,
          name: node.name,
          textPreview: node.text?.slice(0, 120),
          path: nodePath,
          score,
        });
      }
    }
    node.children?.forEach((ch) => walk(ch, nodePath));
  }

  walk(root, "");

  if (!q) {
    return hits.slice(0, limit);
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

function applyInsertComponentToSchema(
  prev: ComponentSchema,
  { parentId, component }: { parentId: string; component: ComponentSchema },
): ComponentSchema {
  const insertTree = (node: ComponentSchema): ComponentSchema => {
    if (node.id === parentId || node.name === parentId) {
      return { ...node, children: [...(node.children || []), component] };
    }
    if (node.children) {
      return { ...node, children: node.children.map(insertTree) };
    }
    return node;
  };
  return insertTree(prev);
}

function applyRemoveComponentFromSchema(prev: ComponentSchema, nodeId: string): ComponentSchema {
  const filterTree = (node: ComponentSchema): ComponentSchema | null => {
    if (node.id === nodeId || node.name === nodeId) return null;
    if (node.children) {
      return {
        ...node,
        children: node.children.map(filterTree).filter(Boolean) as ComponentSchema[],
      };
    }
    return node;
  };
  return filterTree(prev) || prev;
}

function SchemaRenderer({ schema }: { schema: ComponentSchema }) {
  if (schema.type === "Text") {
    return (
      <Text key={schema.id} id={schema.id} name={schema.name} {...schema.props}>
        {schema.text}
      </Text>
    );
  }
  if (schema.type === "View") {
    return (
      <View key={schema.id} id={schema.id} name={schema.name} {...schema.props}>
        {schema.children?.map((child) => (
          <SchemaRenderer key={child.id} schema={child} />
        ))}
      </View>
    );
  }
  if (schema.type === "ScrollView") {
    return (
      <ScrollView key={schema.id} id={schema.id} name={schema.name} {...schema.props}>
        {schema.children?.map((child) => (
          <SchemaRenderer key={child.id} schema={child} />
        ))}
      </ScrollView>
    );
  }
  if (schema.type === "Image") {
    return <Image key={schema.id} id={schema.id} name={schema.name} {...schema.props} />;
  }
  return null;
}

const initialProductScreenSchema: ComponentSchema = {
  id: "product-container",
  type: "View",
  name: "ProductContainer",
  props: { style: { flex: 1 } },
  children: [
    {
      id: "product-image",
      type: "View",
      name: "ProductImage",
      props: {
        style: {
          height: 160,
          backgroundColor: "#e2e8f0",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      children: [
        { id: "apple-icon", type: "Text", text: "🍎", props: { style: { fontSize: 42 } } },
      ],
    },
    {
      id: "product-details",
      type: "View",
      name: "ProductDetails",
      props: { style: { padding: 12 } },
      children: [
        {
          id: "product-title",
          type: "Text",
          name: "ProductTitle",
          text: "Naturel Red Apple",
          props: { style: { fontSize: 18, color: TEXT, fontWeight: 700 } },
        },
        {
          id: "product-subtitle",
          type: "Text",
          name: "ProductSubtitle",
          text: "1kg, Price",
          props: { style: { fontSize: 12, color: MUTED, marginTop: 4 } },
        },
        {
          id: "price-row",
          type: "View",
          name: "PriceRow",
          props: {
            style: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
          },
          children: [
            {
              id: "qty-text",
              type: "Text",
              text: "Qty 1",
              props: { style: { fontSize: 14, color: TEXT } },
            },
            {
              id: "price-text",
              type: "Text",
              name: "PriceText",
              text: "$4.99",
              props: { style: { fontSize: 18, color: TEXT, fontWeight: 700 } },
            },
          ],
        },
        {
          id: "product-desc",
          type: "Text",
          name: "ProductDescription",
          text: "Apples are nutritious. Good for weight loss, heart and bone health.",
          props: { style: { fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 18 } },
        },
      ],
    },
    { id: "spacer", type: "View", props: { style: { flex: 1 } } },
    {
      id: "bottom-bar",
      type: "View",
      name: "BottomBar",
      props: { style: { padding: 12 } },
      children: [
        {
          id: "add-to-cart-btn",
          type: "View",
          name: "AddToCartButton",
          props: {
            style: {
              borderRadius: 14,
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 12,
            },
          },
          children: [
            {
              id: "add-to-cart-text",
              type: "Text",
              text: "Add To Basket",
              props: { style: { color: "#fff", fontSize: 14, fontWeight: 700 } },
            },
          ],
        },
      ],
    },
  ],
};

const PHONE_TITLE_BY_TEMPLATE: Record<LabFrameTemplate, string> = {
  product: "Product",
  explore: "Explore",
  beverages: "Beverages",
  search: "Search",
  filters: "Filters",
  cart: "My Cart",
  favourite: "Favourite",
};

/** AI 工具里指向某一帧 JSON 的键：内置 product / explore / …，或 addFrame 注册的新键 */
const zFrameKey = z
  .string()
  .describe("目标帧键 frameKey：如 product、explore，或 addFrame 注册的 login 等");

const initialExploreSchema: ComponentSchema = {
  id: "explore-root",
  type: "View",
  name: "ExploreRoot",
  props: { style: { flex: 1, padding: 12 } },
  children: [
    {
      id: "explore-search",
      type: "View",
      name: "ExploreSearch",
      props: {
        style: {
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 14,
          backgroundColor: "#f1f5f9",
        },
      },
      children: [
        {
          id: "explore-search-hint",
          type: "Text",
          text: "Search Store",
          props: { style: { fontSize: 12, color: MUTED } },
        },
      ],
    },
    { id: "explore-gap", type: "View", props: { style: { height: 10 } } },
    {
      id: "explore-grid",
      type: "View",
      name: "ExploreGrid",
      props: {
        style: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
      },
      children: [
        {
          id: "explore-c1",
          type: "View",
          name: "CatFresh",
          props: {
            style: {
              width: 120,
              marginBottom: 8,
              borderRadius: 14,
              backgroundColor: "#dcfce7",
              minHeight: 74,
              padding: 10,
              justifyContent: "flex-end",
            },
          },
          children: [
            {
              id: "explore-c1-t",
              type: "Text",
              text: "Fresh Fruits",
              props: { style: { fontSize: 12, lineHeight: 16, color: TEXT, fontWeight: 600 } },
            },
          ],
        },
        {
          id: "explore-c2",
          type: "View",
          props: {
            style: {
              width: 120,
              marginBottom: 8,
              borderRadius: 14,
              backgroundColor: "#ffedd5",
              minHeight: 74,
              padding: 10,
              justifyContent: "flex-end",
            },
          },
          children: [
            {
              id: "explore-c2-t",
              type: "Text",
              text: "Oil & Ghee",
              props: { style: { fontSize: 12, lineHeight: 16, color: TEXT, fontWeight: 600 } },
            },
          ],
        },
        {
          id: "explore-c3",
          type: "View",
          props: {
            style: {
              width: 120,
              marginBottom: 8,
              borderRadius: 14,
              backgroundColor: "#fce7f3",
              minHeight: 74,
              padding: 10,
              justifyContent: "flex-end",
            },
          },
          children: [
            {
              id: "explore-c3-t",
              type: "Text",
              text: "Meat & Fish",
              props: { style: { fontSize: 12, lineHeight: 16, color: TEXT, fontWeight: 600 } },
            },
          ],
        },
        {
          id: "explore-c4",
          type: "View",
          props: {
            style: {
              width: 120,
              marginBottom: 8,
              borderRadius: 14,
              backgroundColor: "#f3e8ff",
              minHeight: 74,
              padding: 10,
              justifyContent: "flex-end",
            },
          },
          children: [
            {
              id: "explore-c4-t",
              type: "Text",
              text: "Bakery",
              props: { style: { fontSize: 12, lineHeight: 16, color: TEXT, fontWeight: 600 } },
            },
          ],
        },
      ],
    },
  ],
};

const initialBeveragesSchema: ComponentSchema = {
  id: "bev-root",
  type: "View",
  name: "BevRoot",
  props: { style: { flex: 1, padding: 12 } },
  children: [
    {
      id: "bev-grid",
      type: "View",
      props: {
        style: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
      },
      children: [
        {
          id: "bev-card-1",
          type: "View",
          props: {
            style: {
              width: 120,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              padding: 8,
              marginBottom: 8,
              backgroundColor: "#fff",
            },
          },
          children: [
            {
              id: "bev-card-1-tint",
              type: "View",
              props: {
                style: {
                  height: 72,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#e0f2fe",
                },
              },
              children: [
                { id: "bev-1-emoji", type: "Text", text: "🥤", props: { style: { fontSize: 24 } } },
              ],
            },
            {
              id: "bev-1-name",
              type: "Text",
              text: "Diet Coke",
              props: { style: { marginTop: 6, fontSize: 11, color: TEXT, fontWeight: 600 } },
            },
            {
              id: "bev-1-price",
              type: "Text",
              text: "$1.99",
              props: { style: { marginTop: 4, fontSize: 12, color: TEXT, fontWeight: 700 } },
            },
          ],
        },
        {
          id: "bev-card-2",
          type: "View",
          props: {
            style: {
              width: 120,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              padding: 8,
              marginBottom: 8,
              backgroundColor: "#fff",
            },
          },
          children: [
            {
              id: "bev-card-2-tint",
              type: "View",
              props: {
                style: {
                  height: 72,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#fef3c7",
                },
              },
              children: [
                { id: "bev-2-emoji", type: "Text", text: "🥤", props: { style: { fontSize: 24 } } },
              ],
            },
            {
              id: "bev-2-name",
              type: "Text",
              text: "Sprite Can",
              props: { style: { marginTop: 6, fontSize: 11, color: TEXT, fontWeight: 600 } },
            },
            {
              id: "bev-2-price",
              type: "Text",
              text: "$1.50",
              props: { style: { marginTop: 4, fontSize: 12, color: TEXT, fontWeight: 700 } },
            },
          ],
        },
      ],
    },
  ],
};

const initialSearchSchema: ComponentSchema = {
  id: "search-root",
  type: "View",
  props: { style: { flex: 1, padding: 12 } },
  children: [
    {
      id: "search-box",
      type: "View",
      props: {
        style: {
          borderRadius: 14,
          backgroundColor: "#f1f5f9",
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 12,
          paddingRight: 12,
        },
      },
      children: [
        {
          id: "search-query-text",
          type: "Text",
          text: "Egg",
          props: { style: { fontSize: 12, color: TEXT } },
        },
      ],
    },
    { id: "search-gap", type: "View", props: { style: { height: 10 } } },
    {
      id: "search-grid",
      type: "View",
      props: {
        style: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
      },
      children: [1, 2, 3, 4].map((n) => ({
        id: `search-card-${n}`,
        type: "View",
        props: {
          style: {
            width: 120,
            marginBottom: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            padding: 8,
          },
        },
        children: [
          {
            id: `search-card-${n}-img`,
            type: "View",
            props: {
              style: {
                height: 72,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fef9c3",
              },
            },
            children: [
              {
                id: `search-egg-${n}`,
                type: "Text",
                text: "🥚",
                props: { style: { fontSize: 24 } },
              },
            ],
          },
          {
            id: `search-card-${n}-label`,
            type: "Text",
            text: `Egg Product ${n}`,
            props: { style: { marginTop: 6, fontSize: 11, color: TEXT } },
          },
        ],
      })) as ComponentSchema[],
    },
  ],
};

const initialFiltersSchema: ComponentSchema = {
  id: "filters-root",
  type: "View",
  props: { style: { flex: 1, padding: 12 } },
  children: [
    {
      id: "filters-heading",
      type: "Text",
      text: "Categories",
      props: { style: { fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 10 } },
    },
    ...(["Eggs", "Noodles", "Snacks", "Fast Food"] as const).map(
      (label, i): ComponentSchema => ({
        id: `filters-row-${i}`,
        type: "View",
        props: { style: { flexDirection: "row", alignItems: "center", marginBottom: 10 } },
        children: [
          {
            id: `filters-check-${i}`,
            type: "Text",
            text: i === 0 ? "☑" : "☐",
            props: { style: { fontSize: 14, color: i === 0 ? BRAND : MUTED } },
          },
          {
            id: `filters-label-${i}`,
            type: "Text",
            text: label,
            props: { style: { marginLeft: 8, fontSize: 13, color: TEXT } },
          },
        ],
      }),
    ),
    { id: "filters-spacer", type: "View", props: { style: { flex: 1 } } },
    {
      id: "filters-apply",
      type: "View",
      props: {
        style: {
          borderRadius: 14,
          backgroundColor: BRAND,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
      children: [
        {
          id: "filters-apply-text",
          type: "Text",
          text: "Apply Filter",
          props: { style: { color: "#fff", fontSize: 14, fontWeight: 700 } },
        },
      ],
    },
  ],
};

const initialCartSchema: ComponentSchema = {
  id: "cart-root",
  type: "View",
  props: { style: { flex: 1 } },
  children: [
    {
      id: "cart-scroll",
      type: "ScrollView",
      name: "CartScroll",
      props: { style: { flex: 1 } },
      children: [
        {
          id: "cart-list",
          type: "View",
          props: { style: { padding: 12 } },
          children: [
            {
              id: "cart-item-1",
              type: "View",
              props: { style: { marginBottom: 10 } },
              children: [
                {
                  id: "cart-item-1-row",
                  type: "View",
                  props: { style: { flexDirection: "row", paddingBottom: 10 } },
                  children: [
                    {
                      id: "cart-item-1-icon",
                      type: "View",
                      props: {
                        style: {
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: "#f8fafc",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 10,
                        },
                      },
                      children: [
                        {
                          id: "cart-item-1-emoji",
                          type: "Text",
                          text: "🫑",
                          props: { style: { fontSize: 20 } },
                        },
                      ],
                    },
                    {
                      id: "cart-item-1-main",
                      type: "View",
                      props: { style: { flex: 1 } },
                      children: [
                        {
                          id: "cart-item-1-name",
                          type: "Text",
                          text: "Bell Pepper Red",
                          props: { style: { fontSize: 13, color: TEXT, fontWeight: 600 } },
                        },
                        {
                          id: "cart-item-1-info",
                          type: "Text",
                          text: "1kg, Price",
                          props: { style: { fontSize: 11, color: MUTED, marginTop: 4 } },
                        },
                        {
                          id: "cart-item-1-price",
                          type: "Text",
                          text: "$4.99",
                          props: {
                            style: { fontSize: 13, color: TEXT, fontWeight: 700, marginTop: 6 },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "cart-item-1-sep",
                  type: "View",
                  props: { style: { height: 1, backgroundColor: "#f1f5f9" } },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "cart-footer",
      type: "View",
      props: { style: { padding: 12 } },
      children: [
        {
          id: "cart-checkout-btn",
          type: "View",
          props: {
            style: {
              borderRadius: 14,
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 12,
            },
          },
          children: [
            {
              id: "cart-checkout-text",
              type: "Text",
              text: "Checkout $12.96",
              props: { style: { color: "#fff", fontSize: 14, fontWeight: 700 } },
            },
          ],
        },
      ],
    },
  ],
};

const initialFavouriteSchema: ComponentSchema = {
  id: "fav-root",
  type: "View",
  props: { style: { flex: 1 } },
  children: [
    {
      id: "fav-scroll",
      type: "ScrollView",
      props: { style: { flex: 1 } },
      children: [
        {
          id: "fav-list",
          type: "View",
          props: { style: { padding: 12 } },
          children: ["Sprite Can", "Diet Coke", "Apple Juice", "Pepsi Can"].map((item, idx) => ({
            id: `fav-row-${idx}`,
            type: "View",
            props: { style: { paddingTop: 10, paddingBottom: 10 } },
            children: [
              {
                id: `fav-row-${idx}-inner`,
                type: "View",
                props: { style: { flexDirection: "row", alignItems: "center" } },
                children: [
                  {
                    id: `fav-icon-${idx}`,
                    type: "View",
                    props: {
                      style: {
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "#e0f2fe",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 10,
                      },
                    },
                    children: [{ id: `fav-emoji-${idx}`, type: "Text", text: "🥤" }],
                  },
                  {
                    id: `fav-mid-${idx}`,
                    type: "View",
                    props: { style: { flex: 1 } },
                    children: [
                      {
                        id: `fav-title-${idx}`,
                        type: "Text",
                        text: item,
                        props: { style: { fontSize: 12, color: TEXT, fontWeight: 600 } },
                      },
                      {
                        id: `fav-sub-${idx}`,
                        type: "Text",
                        text: "325ml, Price",
                        props: { style: { fontSize: 11, color: MUTED, marginTop: 2 } },
                      },
                    ],
                  },
                  {
                    id: `fav-price-${idx}`,
                    type: "Text",
                    text: "$1.99",
                    props: { style: { fontSize: 12, fontWeight: 700, color: TEXT } },
                  },
                ],
              },
              {
                id: `fav-sep-${idx}`,
                type: "View",
                props: { style: { height: 1, marginTop: 10, backgroundColor: "#f1f5f9" } },
              },
            ],
          })),
        },
      ],
    },
  ],
};

const initialFrameSchemas: Record<LabFrameTemplate, ComponentSchema> = {
  product: initialProductScreenSchema,
  explore: initialExploreSchema,
  beverages: initialBeveragesSchema,
  search: initialSearchSchema,
  filters: initialFiltersSchema,
  cart: initialCartSchema,
  favourite: initialFavouriteSchema,
};

function SchemaPhoneScreen({ title, schema }: { title: string; schema: ComponentSchema }) {
  return (
    <PhoneShell title={title}>
      <SchemaRenderer schema={schema} />
    </PhoneShell>
  );
}

type LayerType = "frame" | "view" | "text" | "image" | "scroll" | "component";

type LayerNode = {
  id: string;
  name: string;
  type: LayerType;
  children?: LayerNode[];
};

type LabFrameModel = {
  id: string;
  /** 画布上手机框上方的说明标题 */
  title: string;
  /** 与 frameSchemas 的键一致；内置为 product / explore / …，动态帧由 addFrame 生成 */
  template: string;
  /** 手机壳内顶部导航栏标题（PhoneShell） */
  phoneNavTitle: string;
  layers?: LayerNode[];
};

const INITIAL_LAB_FRAMES: LabFrameModel[] = [
  {
    id: "frame-product",
    title: "商品详情 · Product",
    template: "product",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.product,
    layers: [
      { id: "p-status", name: "StatusBar", type: "component" },
      { id: "p-nav", name: "NavBar", type: "view" },
      {
        id: "p-scroll",
        name: "ScrollView",
        type: "scroll",
        children: [
          { id: "p-img", name: "Image (Apple)", type: "image" },
          {
            id: "p-content",
            name: "Content",
            type: "view",
            children: [
              { id: "p-title", name: "Title", type: "text" },
              { id: "p-sub", name: "Subtitle", type: "text" },
              { id: "p-price", name: "Price Row", type: "view" },
              { id: "p-desc", name: "Description", type: "text" },
            ],
          },
        ],
      },
      { id: "p-btn", name: "Add To Basket", type: "component" },
    ],
  },
  {
    id: "frame-explore",
    title: "分类探索 · Explore",
    template: "explore",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.explore,
    layers: [
      { id: "e-status", name: "StatusBar", type: "component" },
      { id: "e-nav", name: "NavBar", type: "view" },
      { id: "e-search", name: "Search Bar", type: "view" },
      {
        id: "e-grid",
        name: "Categories Grid",
        type: "view",
        children: [
          { id: "e-c1", name: "Fresh Fruits", type: "view" },
          { id: "e-c2", name: "Oil & Ghee", type: "view" },
          { id: "e-c3", name: "Meat & Fish", type: "view" },
          { id: "e-c4", name: "Bakery", type: "view" },
        ],
      },
    ],
  },
  {
    id: "frame-beverages",
    title: "饮料 · Beverages",
    template: "beverages",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.beverages,
  },
  {
    id: "frame-search",
    title: "搜索 · Search",
    template: "search",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.search,
  },
  {
    id: "frame-filters",
    title: "筛选 · Filters",
    template: "filters",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.filters,
  },
  {
    id: "frame-cart",
    title: "购物车 · My Cart",
    template: "cart",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.cart,
  },
  {
    id: "frame-favourite",
    title: "收藏 · Favourite",
    template: "favourite",
    phoneNavTitle: PHONE_TITLE_BY_TEMPLATE.favourite,
  },
];

function getIconForLayerType(type: LayerType) {
  switch (type) {
    case "frame":
      return <Smartphone className="size-3 text-slate-500" />;
    case "text":
      return <Type className="size-3 text-slate-500" />;
    case "image":
      return <ImageIcon className="size-3 text-slate-500" />;
    case "scroll":
      return <MousePointer2 className="size-3 text-slate-500" />;
    case "component":
      return <LayoutTemplate className="size-3 text-slate-500" />;
    case "view":
    default:
      return <Box className="size-3 text-slate-500" />;
  }
}

function LabFrameGroup({
  frameId,
  title,
  children,
}: {
  frameId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#475569",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View
        id={frameId}
        style={{
          borderWidth: 1,
          borderColor: "#cbd5e1",
          borderRadius: 20,
          padding: 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function renderFrameContent(phoneNavTitle: string, schema: ComponentSchema): ReactNode {
  return <SchemaPhoneScreen schema={schema} title={phoneNavTitle} />;
}

function LabDesignPreviewCanvas({
  labFrames,
  frameSchemas,
}: {
  labFrames: LabFrameModel[];
  frameSchemas: Record<string, ComponentSchema>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignContent: "flex-start",
        padding: 20,
        gap: 16,
      }}
    >
      {labFrames.map((frame) => (
        <LabFrameGroup key={frame.id} frameId={frame.id} title={frame.title}>
          {frameSchemas[frame.template]
            ? renderFrameContent(frame.phoneNavTitle, frameSchemas[frame.template])
            : null}
        </LabFrameGroup>
      ))}
    </View>
  );
}

function ResizableSidebar({
  side,
  width,
  minWidth,
  maxWidth,
  onWidthChange,
  children,
  className,
}: {
  side: "left" | "right";
  width: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange: (w: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  return (
    <div
      className={`pointer-events-auto absolute bottom-0 top-0 flex flex-col bg-white/95 shadow-2xl backdrop-blur ${
        side === "left" ? "left-0 border-r" : "right-0 border-l"
      } ${className || ""}`}
      style={{ width }}
    >
      {children}
      <div
        className={`absolute bottom-0 top-0 z-50 w-4 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 ${
          side === "left" ? "-right-2" : "-left-2"
        }`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startX: e.clientX, startWidth: width };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return;
          const delta = e.clientX - dragRef.current.startX;
          let newWidth =
            side === "left"
              ? dragRef.current.startWidth + delta
              : dragRef.current.startWidth - delta;
          newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
          onWidthChange(newWidth);
        }}
        onPointerUp={(e) => {
          if (dragRef.current) {
            e.currentTarget.releasePointerCapture(e.pointerId);
            dragRef.current = null;
          }
        }}
      />
    </div>
  );
}

/** 按运行时节点 id / schema 的 name 字段匹配 */
function findSchemaNodeByRuntimeId(
  root: ComponentSchema,
  runtimeId: string,
): ComponentSchema | null {
  if (root.id === runtimeId || root.name === runtimeId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findSchemaNodeByRuntimeId(child, runtimeId);
      if (found) return found;
    }
  }
  return null;
}

/** 按 schema.name 匹配（运行时 SceneNode.label 来自 React 的 name prop） */
function findSchemaNodeByName(root: ComponentSchema, name: string): ComponentSchema | null {
  if (root.name === name) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findSchemaNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}

/** 仅 Text 节点可写 schema.text；容器节点应先用 querySchemaNodes 找到子 Text 的 nodeId。 */
function resolveOptionalTextWrite(
  root: ComponentSchema,
  nodeId: string,
  text: string | undefined,
): { text: string | undefined; warning?: string } {
  if (text === undefined) {
    return { text: undefined };
  }
  const targetNode = findSchemaNodeByRuntimeId(root, nodeId);
  if (!targetNode) {
    return {
      text: undefined,
      warning: linguiI18n._(msg`未找到 id/name 为「${nodeId}」的节点，未写入 text`),
    };
  }
  if (targetNode.type !== "Text") {
    return {
      text: undefined,
      warning: linguiI18n._(
        msg`未写入 text：节点「${nodeId}」类型为 ${targetNode.type}，仅 Text 可改文案。请先调用 querySchemaNodes，用关键词检索展示文案的 Text 的 nodeId（如 basket、加购）。props 仍会合并。`,
      ),
    };
  }
  return { text };
}

/** 根据节点 id 判断属于哪一帧的 JSON 树根（多棵树之一） */
function findTemplateForLayerNodeId(
  map: Record<string, ComponentSchema>,
  nodeId: string,
): string | null {
  for (const key of Object.keys(map)) {
    if (findSchemaNodeByRuntimeId(map[key], nodeId)) return key;
  }
  return null;
}

/** 沿父链向上，找到第一个「帧根」View（与 labFrames[].id 一致） */
function findAncestorFrameIdForSceneNode(
  snapshot: SceneGraphSnapshot,
  nodeId: string,
  frameIds: Set<string>,
): string | null {
  let cur: string | null = nodeId;
  const nodes = snapshot.nodes;
  while (cur) {
    if (frameIds.has(cur)) return cur;
    cur = nodes[cur]?.parentId ?? null;
  }
  return null;
}

const DEFAULT_TOOL_TEST_INSERT_JSON = `{
  "id": "lab-tool-test-node",
  "name": "LabToolTest",
  "type": "Text",
  "text": "插入的测试文案",
  "props": { "style": { "fontSize": 12, "color": "#64748b", "marginTop": 8 } }
}`;

function SchemaTreeNode({ node, depth }: { node: ComponentSchema; depth: number }) {
  const hasKids = Boolean(node.children?.length);
  const [open, setOpen] = useState(depth < 2);
  const label = node.name?.trim();
  const textPreview =
    node.text !== undefined && node.text !== ""
      ? node.text.length > 40
        ? `${node.text.slice(0, 40)}…`
        : node.text
      : "";

  return (
    <div className="select-text font-mono text-[10px] leading-snug">
      <div
        className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 rounded px-1 py-0.5 hover:bg-slate-100"
        style={{ paddingLeft: 4 + depth * 10 }}
      >
        {hasKids ? (
          <button
            aria-expanded={open}
            className="mt-0.5 shrink-0 rounded p-0 text-slate-500 hover:bg-slate-200"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <span className="inline-block w-3 shrink-0" aria-hidden />
        )}
        <span className="shrink-0 rounded bg-slate-200 px-1 text-slate-800">{node.type}</span>
        <span className="shrink-0 text-violet-800">{node.id}</span>
        {label ? <span className="shrink-0 text-slate-500">· {label}</span> : null}
        {textPreview ? (
          <span className="min-w-0 truncate text-emerald-800" title={node.text}>
            「{textPreview}」
          </span>
        ) : null}
      </div>
      {hasKids && open
        ? node.children!.map((ch, i) => (
            <SchemaTreeNode key={`${ch.id}-${i}`} depth={depth + 1} node={ch} />
          ))
        : null}
    </div>
  );
}

function ProductSchemaTreePanel({
  frameTemplate,
  frameTitle,
  root,
}: {
  frameTemplate: string;
  frameTitle: string;
  root: ComponentSchema | undefined;
}) {
  const { t } = useLingui();
  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 shadow-sm">
      <h3 className="mb-1 font-semibold text-slate-800">
        {t`当前帧 JSON 树（实时）· ${frameTemplate}`}
      </h3>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-600">
        {t`Lab 中每一帧对应`}
        <strong>{t`一棵`}</strong>
        {t`独立的根节点树（`}
        <code className="font-mono">Record&lt;帧模板, ComponentSchema&gt;</code>
        {t`）。下方展示的是 `}
        <strong>{frameTitle}</strong>
        {t` 这一帧的数据。`}
      </p>
      <div className="max-h-56 overflow-auto rounded border border-slate-200 bg-white p-2">
        {root ? (
          <SchemaTreeNode depth={0} node={root} />
        ) : (
          <span className="text-slate-400">{t`无 schema`}</span>
        )}
      </div>
    </section>
  );
}

function ToolTestPanel({
  labFrames,
  frameSchemas,
  onAddFrame,
  onQuerySchemaNodes,
  onUpdateComponentProps,
  onInsertComponent,
  onRemoveComponent,
}: {
  labFrames: LabFrameModel[];
  frameSchemas: Record<string, ComponentSchema>;
  onAddFrame: (input: { frameKey: string; displayTitle: string; phoneNavTitle: string }) => unknown;
  onQuerySchemaNodes: (frame: string, query: string, limit: number) => unknown;
  onUpdateComponentProps: (
    frame: string,
    input: { nodeId: string; props?: Record<string, unknown>; text?: string },
  ) => unknown;
  onInsertComponent: (
    frame: string,
    input: { parentId: string; component: ComponentSchema },
  ) => unknown;
  onRemoveComponent: (frame: string, input: { nodeId: string }) => unknown;
}) {
  const { t } = useLingui();
  const [toolTargetFrame, setToolTargetFrame] = useState("product");
  const [addFrameKey, setAddFrameKey] = useState("login");
  const [addDisplayTitle, setAddDisplayTitle] = useState("登录 · Login");
  const [addPhoneNavTitle, setAddPhoneNavTitle] = useState("Login");
  const [queryKeywords, setQueryKeywords] = useState("basket cart 加购");
  const [queryLimit, setQueryLimit] = useState(20);
  const [updNodeId, setUpdNodeId] = useState("add-to-cart-text");
  const [updText, setUpdText] = useState("￥10 · 工具测试");
  const [updPropsJson, setUpdPropsJson] = useState("");
  const [insParentId, setInsParentId] = useState("product-details");
  const [insComponentJson, setInsComponentJson] = useState(DEFAULT_TOOL_TEST_INSERT_JSON);
  const [remNodeId, setRemNodeId] = useState("lab-tool-test-node");
  const [log, setLog] = useState<string>(() => t`点击下方按钮后，此处显示返回值。`);

  const activeFrameTitle =
    labFrames.find((f) => f.template === toolTargetFrame)?.title ?? toolTargetFrame;

  const runUpdate = () => {
    try {
      let props: Record<string, unknown> | undefined;
      if (updPropsJson.trim()) {
        props = JSON.parse(updPropsJson) as Record<string, unknown>;
      }
      const out = onUpdateComponentProps(toolTargetFrame, {
        nodeId: updNodeId.trim(),
        text: updText,
        ...(props !== undefined ? { props } : {}),
      });
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      setLog(t`错误: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const runInsert = () => {
    try {
      const raw = JSON.parse(insComponentJson) as ComponentSchema;
      const out = onInsertComponent(toolTargetFrame, {
        parentId: insParentId.trim(),
        component: raw,
      });
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      setLog(t`错误: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const runRemove = () => {
    try {
      const out = onRemoveComponent(toolTargetFrame, { nodeId: remNodeId.trim() });
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      setLog(t`错误: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const runQuery = () => {
    try {
      const lim = Math.min(100, Math.max(1, queryLimit));
      const out = onQuerySchemaNodes(toolTargetFrame, queryKeywords.trim(), lim);
      setLog(JSON.stringify(out, null, 2));
    } catch (e) {
      setLog(t`错误: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const runAddFrame = () => {
    try {
      const out = onAddFrame({
        frameKey: addFrameKey.trim(),
        displayTitle: addDisplayTitle.trim(),
        phoneNavTitle: addPhoneNavTitle.trim(),
      });
      setLog(JSON.stringify(out, null, 2));
      if (
        out &&
        typeof out === "object" &&
        "success" in out &&
        (out as { success: boolean }).success
      ) {
        const fk = (out as { frameKey?: string }).frameKey;
        if (fk) setToolTargetFrame(fk);
      }
    } catch (e) {
      setLog(t`错误: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        {t`与 AI 对话里调用的工具`}
        <strong>{t`共用`}</strong>
        <code className="mx-0.5 rounded bg-white px-1 font-mono text-[10px]">setFrameSchemas</code>
        {t`。请先选择目标帧，工具会写入对应那一棵 JSON 树。`}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 text-xs">
        <label className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <span className="mb-1.5 block text-[10px] font-medium text-slate-500">
            {t`工具测试 / JSON 树预览 · 目标帧`}
          </span>
          <select
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 font-mono text-xs"
            value={toolTargetFrame}
            onChange={(e) => setToolTargetFrame(e.target.value)}
          >
            {labFrames.map((f) => (
              <option key={f.id} value={f.template}>
                {f.template} — {f.title}
              </option>
            ))}
          </select>
        </label>

        <ProductSchemaTreePanel
          frameTemplate={toolTargetFrame}
          frameTitle={activeFrameTitle}
          root={frameSchemas[toolTargetFrame]}
        />

        <section className="rounded-lg border border-violet-200 bg-violet-50/30 p-3 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">addFrame</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-600">
            {t`新增一帧空页面根节点，之后用 insert / update 流式加内容。frameKey 勿与已有重复。`}
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">frameKey</span>
            <Input
              className="h-8 font-mono text-xs"
              value={addFrameKey}
              onChange={(e) => setAddFrameKey(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`displayTitle（框外标题）`}
            </span>
            <Input
              className="h-8 font-mono text-xs"
              value={addDisplayTitle}
              onChange={(e) => setAddDisplayTitle(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`phoneNavTitle（壳内导航）`}
            </span>
            <Input
              className="h-8 font-mono text-xs"
              value={addPhoneNavTitle}
              onChange={(e) => setAddPhoneNavTitle(e.target.value)}
            />
          </label>
          <Button
            className="w-full"
            size="sm"
            type="button"
            variant="secondary"
            onClick={runAddFrame}
          >
            {t`执行 addFrame`}
          </Button>
        </section>

        <section className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">querySchemaNodes</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-600">
            {t`用语义/关键词在当前目标帧的 JSON 里检索节点（匹配 id、name、type、文案），拿到 nodeId 后再去改 updateComponentProps。不是向量检索，请拆成中英文关键词。`}
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`query（空格分词；留空则列出前若干节点）`}
            </span>
            <Input
              className="h-8 font-mono text-xs"
              value={queryKeywords}
              onChange={(e) => setQueryKeywords(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`limit（1–100）`}
            </span>
            <Input
              className="h-8 font-mono text-xs"
              inputMode="numeric"
              value={String(queryLimit)}
              onChange={(e) => setQueryLimit(Number(e.target.value) || 20)}
            />
          </label>
          <Button className="w-full" size="sm" type="button" variant="secondary" onClick={runQuery}>
            {t`执行 querySchemaNodes`}
          </Button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">updateComponentProps</h3>
          <p className="mb-2 text-[11px] text-slate-500">
            {t`text 仅对 type: Text 生效。改按钮文案请先 query 找到子 Text 的 nodeId（如 add-to-cart-text）。`}
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">nodeId</span>
            <Input
              className="h-8 font-mono text-xs"
              value={updNodeId}
              onChange={(e) => setUpdNodeId(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`text（可选）`}
            </span>
            <Input
              className="h-8 font-mono text-xs"
              value={updText}
              onChange={(e) => setUpdText(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`props（可选 JSON，会与 node.props 合并）`}
            </span>
            <Textarea
              className="min-h-[72px] font-mono text-[11px]"
              placeholder={'例如 {"style":{"color":"#fef08a"}}'}
              value={updPropsJson}
              onChange={(e) => setUpdPropsJson(e.target.value)}
            />
          </label>
          <Button className="w-full" size="sm" type="button" onClick={runUpdate}>
            {t`执行 updateComponentProps`}
          </Button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">insertComponent</h3>
          <p className="mb-2 text-[11px] text-slate-500">
            {t`向父节点追加子节点。默认插到 product-details 下。`}
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">parentId</span>
            <Input
              className="h-8 font-mono text-xs"
              value={insParentId}
              onChange={(e) => setInsParentId(e.target.value)}
            />
          </label>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">
              {t`component（JSON）`}
            </span>
            <Textarea
              className="min-h-[140px] font-mono text-[11px]"
              value={insComponentJson}
              onChange={(e) => setInsComponentJson(e.target.value)}
            />
          </label>
          <Button
            className="w-full"
            size="sm"
            type="button"
            variant="secondary"
            onClick={runInsert}
          >
            {t`执行 insertComponent`}
          </Button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 font-semibold text-slate-800">removeComponent</h3>
          <p className="mb-2 text-[11px] text-slate-500">
            {t`默认删除上面插入的 lab-tool-test-node（需先插入）。`}
          </p>
          <label className="mb-2 block">
            <span className="mb-1 block text-[10px] font-medium text-slate-500">nodeId</span>
            <Input
              className="h-8 font-mono text-xs"
              value={remNodeId}
              onChange={(e) => setRemNodeId(e.target.value)}
            />
          </label>
          <Button className="w-full" size="sm" type="button" variant="outline" onClick={runRemove}>
            {t`执行 removeComponent`}
          </Button>
        </section>

        <section className="rounded-lg border border-slate-300 bg-slate-900 p-3 text-[11px] text-slate-100">
          <div className="mb-1 font-medium text-slate-300">{t`上次执行结果`}</div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed">
            {log}
          </pre>
        </section>
      </div>
    </div>
  );
}

function PropertiesPanel({
  nodeId,
  runtime,
  schema,
  onUpdateNode,
}: {
  nodeId: string;
  runtime: SceneRuntime | null;
  schema: ComponentSchema;
  onUpdateNode: (nodeId: string, props?: any, text?: string) => void;
}) {
  const { t } = useLingui();
  const [layout, setLayout] = useState<any>(null);
  const [nodeInfo, setNodeInfo] = useState<any>(null);

  useEffect(() => {
    if (!runtime) return;
    const update = () => {
      const snap = runtime.getLayoutSnapshot();
      const graph = runtime.getSceneGraphSnapshot();
      setLayout(snap[nodeId]);
      setNodeInfo(graph.nodes[nodeId]);
    };
    update();
    return runtime.subscribeAfterLayout(update);
  }, [runtime, nodeId]);

  const nodeSchema = useMemo(() => {
    const byRuntime = findSchemaNodeByRuntimeId(schema, nodeId);
    if (byRuntime) return byRuntime;
    const label = nodeInfo?.label as string | undefined;
    if (label) return findSchemaNodeByName(schema, label);
    return null;
  }, [schema, nodeId, nodeInfo?.label]);

  /** 写入对应帧 JSON 树时必须用 schema 里的 id（与 SchemaRenderer 中 id={schema.id} 一致） */
  const schemaUpdateId = nodeSchema?.id ?? nodeId;

  if (!layout) return <div className="text-slate-500">{t`节点无布局数据`}</div>;

  const handleStyleChange = (key: string, value: any) => {
    if (!nodeSchema) return;
    const currentStyle = nodeSchema.props?.style || {};
    const newStyle = { ...currentStyle };
    if (value === "") {
      delete newStyle[key];
    } else {
      newStyle[key] = value;
    }
    onUpdateNode(schemaUpdateId, { style: newStyle });
  };

  const handleTextChange = (value: string) => {
    if (!nodeSchema) return;
    onUpdateNode(schemaUpdateId, undefined, value);
  };

  const isTextNode = layout.nodeKind === "text" || nodeSchema?.type === "Text";
  const hasTextContent =
    layout.textContent !== undefined || nodeSchema?.text !== undefined || isTextNode;

  const linkedNameSuffix = nodeSchema?.name ? ` · ${nodeSchema.name}` : "";

  return (
    <div className="space-y-6">
      <div>
        <div className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">ID</span>
          <span className="font-mono text-slate-500">{nodeId}</span>
        </div>
        {nodeInfo?.label && (
          <div className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
              Name
            </span>
            <span>{nodeInfo.label}</span>
          </div>
        )}
      </div>

      {nodeSchema ? (
        <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-2 text-xs text-blue-800">
          {t`已关联到可编辑 schema（${nodeSchema.type}${linkedNameSuffix}）`}
        </div>
      ) : (
        <div className="mb-4 space-y-2 rounded border border-amber-100 bg-amber-50 p-2 text-xs text-amber-950">
          <p className="font-medium">{t`为何是只读？`}</p>
          <p className="leading-relaxed text-amber-900/90">
            {t`每一帧有一棵独立的 JSON 树（frameSchemas[模板名]）。属性面板会把你选中的图层匹配到当前帧那棵树里的节点；有 id / name 且在 JSON 里存在才能写回。`}
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-amber-900/85">
            <li>
              {t`选了手机壳装饰（帧边框 frame-…、PhoneShell、StatusBar、NavBar 等）——它们不在各帧的 JSON 里。`}
            </li>
            <li>
              {t`要可编辑：展开对应帧的图层树，点由 SchemaRenderer 渲染的节点（例如商品帧的 product-title、探索帧的 explore-c1-t 等）。`}
            </li>
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 font-bold text-slate-700">{t`布局 (Layout)`}</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-slate-400">{t`宽度 W`}</span>
            {nodeSchema ? (
              <Input
                className="h-8 font-mono text-xs"
                inputMode="decimal"
                value={String(nodeSchema.props?.style?.width ?? Math.round(layout.width))}
                onChange={(e) => {
                  const val = e.target.value;
                  handleStyleChange("width", val === "" ? "" : Number(val) || val);
                }}
              />
            ) : (
              <Input
                className="h-8 font-mono text-xs"
                readOnly
                value={String(Math.round(layout.width))}
              />
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-slate-400">{t`高度 H`}</span>
            {nodeSchema ? (
              <Input
                className="h-8 font-mono text-xs"
                inputMode="decimal"
                value={String(nodeSchema.props?.style?.height ?? Math.round(layout.height))}
                onChange={(e) => {
                  const val = e.target.value;
                  handleStyleChange("height", val === "" ? "" : Number(val) || val);
                }}
              />
            ) : (
              <Input
                className="h-8 font-mono text-xs"
                readOnly
                value={String(Math.round(layout.height))}
              />
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-slate-400">{t`位置 X`}</span>
            <Input
              className="h-8 font-mono text-xs"
              readOnly
              value={String(Math.round(layout.left))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-slate-400">{t`位置 Y`}</span>
            <Input
              className="h-8 font-mono text-xs"
              readOnly
              value={String(Math.round(layout.top))}
            />
          </label>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          {t`X/Y 为布局引擎计算结果；改宽高与样式即可间接影响位置。`}
        </p>
      </div>

      <div>
        <div className="mb-2 font-bold text-slate-700">{t`外观 (Appearance)`}</div>
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-slate-400">{t`背景色`}</span>
            <ColorField
              value={
                nodeSchema
                  ? (nodeSchema.props?.style?.backgroundColor ?? "")
                  : layout.backgroundColor || "transparent"
              }
              previewFallback={layout.backgroundColor || "transparent"}
              placeholder={t`# 或 transparent`}
              readOnly={!nodeSchema}
              onChange={(v) => handleStyleChange("backgroundColor", v)}
            />
          </label>
          {nodeSchema ? (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-slate-400">{t`文字颜色`}</span>
              <ColorField
                value={nodeSchema.props?.style?.color ?? ""}
                previewFallback={layout.color || "#000000"}
                onChange={(v) => handleStyleChange("color", v)}
              />
            </label>
          ) : null}
        </div>
      </div>

      {hasTextContent ? (
        <div>
          <div className="mb-2 font-bold text-slate-700">{t`文本内容`}</div>
          {nodeSchema ? (
            <Textarea
              className="min-h-[88px] font-mono text-xs"
              placeholder={t`输入文本…`}
              value={nodeSchema.text ?? ""}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          ) : (
            <Textarea
              className="min-h-[88px] font-mono text-xs"
              readOnly
              value={layout.textContent ?? ""}
            />
          )}
          {!nodeSchema ? (
            <p className="mt-1 text-[10px] text-slate-400">
              {t`只读预览：无对应 schema 节点时无法写回。`}
            </p>
          ) : null}
        </div>
      ) : null}

      {nodeSchema ? (
        <div>
          <div className="mb-2 font-bold text-slate-700">{t`字体 (Font)`}</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-slate-400">{t`字号`}</span>
              <Input
                className="h-8 font-mono text-xs"
                inputMode="numeric"
                placeholder="14"
                value={
                  nodeSchema.props?.style?.fontSize === undefined
                    ? ""
                    : String(nodeSchema.props.style.fontSize)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  handleStyleChange("fontSize", val === "" ? "" : Number(val) || val);
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-slate-400">{t`字重`}</span>
              <Input
                className="h-8 font-mono text-xs"
                inputMode="numeric"
                placeholder="400"
                value={
                  nodeSchema.props?.style?.fontWeight === undefined
                    ? ""
                    : String(nodeSchema.props.style.fontWeight)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  handleStyleChange("fontWeight", val === "" ? "" : Number(val) || val);
                }}
              />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolCallDisplay({ part, msgId, idx }: { part: ToolUIPart; msgId: string; idx: number }) {
  const toolName = part.type.replace(/^tool-/, "");
  const state = part.state;
  const isRunning = state === "input-streaming" || state === "input-available";
  const isSuccess = state === "output-available";
  const isError = state === "output-error";
  return (
    <div
      key={`${msgId}-tool-${idx}`}
      className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
    >
      <div className="mt-0.5 shrink-0">
        {isRunning ? (
          <Loader2 className="size-3.5 animate-spin text-blue-500" />
        ) : isSuccess ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : isError ? (
          <XCircle className="size-3.5 text-red-500" />
        ) : (
          <Wrench className="size-3.5 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-700">{toolName}</div>
        {"input" in part && part.input != null && (
          <div className="mt-1 font-mono text-[10px] text-slate-500 break-all whitespace-pre-wrap">
            {JSON.stringify(part.input, null, 2)}
          </div>
        )}
        {isSuccess && "output" in part && part.output != null && (
          <div className="mt-1 font-mono text-[10px] text-emerald-600 break-all">
            → {JSON.stringify(part.output)}
          </div>
        )}
        {isError && "errorText" in part && part.errorText && (
          <div className="mt-1 text-[10px] text-red-500">{part.errorText as string}</div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const { width, height } = useViewportSize();

  const handleUpdateNode = useCallback((nodeId: string, props?: any, text?: string) => {
    setFrameSchemas((prev) => {
      const tmpl = findTemplateForLayerNodeId(prev, nodeId);
      if (!tmpl) return prev;
      const { text: textArg } = resolveOptionalTextWrite(prev[tmpl], nodeId, text);
      return {
        ...prev,
        [tmpl]: applyUpdateComponentPropsToSchema(prev[tmpl], { nodeId, props, text: textArg }),
      };
    });
  }, []);

  const [labFrames, setLabFrames] = useState<LabFrameModel[]>(() => [...INITIAL_LAB_FRAMES]);
  const [frameSchemas, setFrameSchemas] = useState<Record<string, ComponentSchema>>(() => ({
    ...initialFrameSchemas,
  }));

  const { canvasW, canvasH } = useMemo(
    () => calcCanvasSize(width, height, labFrames.length),
    [width, height, labFrames.length],
  );
  const { t, i18n } = useLingui();
  const [locale, setLocale] = useState(() => linguiI18n.locale);
  /** 手型开启时可拖动画布；小位移不抢事件，仍可点选。起点在可滚动 scrollView 内时不抢平移。 */
  const [handEnabled, setHandEnabled] = useState(true);
  const [cameraScale, setCameraScale] = useState(1);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const [canvasRuntime, setCanvasRuntime] = useState<SceneRuntime | null>(null);
  const handEnabledRef = useRef(handEnabled);
  handEnabledRef.current = handEnabled;
  const canvasStageHostRef = useRef<HTMLDivElement | null>(null);
  const hoverOutlineRef = useRef<HTMLDivElement | null>(null);
  const hoverOutlineRafRef = useRef<number | null>(null);
  const handPanGestureRef = useRef<{
    startX: number;
    startY: number;
    originTx: number;
    originTy: number;
    pointerId: number;
    hitLeafAtDown: string | null;
    panning: boolean;
  } | null>(null);

  const handleRuntimeReady = useCallback(
    (rt: SceneRuntime | null) => {
      runtimeRef.current = rt;
      setCanvasRuntime(rt);
      if (!rt) return;
      // 计算所有帧的包围盒，fit 到视口
      const innerW = width - CANVAS_PAD * 2;
      const cols = Math.max(1, Math.floor((innerW + CANVAS_GAP) / (FRAME_TOTAL_W + CANVAS_GAP)));
      const rows = Math.ceil(labFrames.length / cols);
      const contentW = cols * FRAME_TOTAL_W + (cols - 1) * CANVAS_GAP;
      const contentH = rows * FRAME_TOTAL_H + (rows - 1) * CANVAS_GAP;
      // canvasW = max(viewportW, contentW + padding*2)，内容在 canvasW 内水平居中
      const canvasW = Math.max(width, contentW + CANVAS_PAD * 2);
      const contentCx = canvasW / 2;
      const contentCy = CANVAS_PAD + contentH / 2;
      // 初始时侧边栏默认展开，左 280、右 360
      const initLeftW = 280;
      const initRightW = 360;
      const visibleW = width - initLeftW - initRightW;
      const visibleH = height;
      const padding = 48;
      const scaleX = (visibleW - padding * 2) / contentW;
      const scaleY = (visibleH - padding * 2) / contentH;
      const fitScale = Math.min(scaleX, scaleY, 1);
      rt.focusToWorld(contentCx, contentCy, fitScale, {
        cx: initLeftW + visibleW / 2,
        cy: visibleH / 2,
      });
    },
    [width, height, labFrames.length],
  );

  const handleCameraChange = useCallback((cam: Camera) => {
    setCameraScale(cam.scale);
  }, []);

  const [isHandPanning, setIsHandPanning] = useState(false);

  const updateHoverOutlineFromClient = useCallback((clientX: number, clientY: number) => {
    const rt = runtimeRef.current;
    const overlay = hoverOutlineRef.current;
    const host = canvasStageHostRef.current;
    const canvas = host?.querySelector("canvas");
    if (!rt || !overlay || !canvas) {
      if (overlay) overlay.style.display = "none";
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const stage = clientXYToStageLocal({ left: rect.left, top: rect.top }, clientX, clientY);
    const { x: wx, y: wy } = rt.screenToWorld(stage.x, stage.y);
    const id = rt.hitTestWorld(wx, wy);
    if (!id) {
      overlay.style.display = "none";
      return;
    }
    const lo = rt.getLayoutSnapshot()[id];
    if (!lo) {
      overlay.style.display = "none";
      return;
    }
    const tl = rt.worldToScreen(lo.absLeft, lo.absTop);
    const br = rt.worldToScreen(lo.absLeft + lo.width, lo.absTop + lo.height);
    overlay.style.display = "block";
    overlay.style.left = `${tl.x}px`;
    overlay.style.top = `${tl.y}px`;
    overlay.style.width = `${Math.max(0, br.x - tl.x)}px`;
    overlay.style.height = `${Math.max(0, br.y - tl.y)}px`;
  }, []);

  const scheduleHoverOutline = useCallback(
    (clientX: number, clientY: number) => {
      if (hoverOutlineRafRef.current !== null) return;
      hoverOutlineRafRef.current = requestAnimationFrame(() => {
        hoverOutlineRafRef.current = null;
        updateHoverOutlineFromClient(clientX, clientY);
      });
    },
    [updateHoverOutlineFromClient],
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedFrameIds, setExpandedFrameIds] = useState<Record<string, boolean>>({});
  const [expandedLayerIds, setExpandedLayerIds] = useState<Record<string, boolean>>({});
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(280);

  useEffect(() => {
    if (!canvasRuntime) return;
    const rt = canvasRuntime;
    const frameIdSet = new Set(labFrames.map((f) => f.id));
    const unsub = rt.addListener(
      rt.getRootId(),
      "click",
      (e: ScenePointerEvent) => {
        setSelectedLayerId(e.targetId);
        setRightTab("properties");
        const snap = rt.getSceneGraphSnapshot();
        const frameId = findAncestorFrameIdForSceneNode(snap, e.targetId, frameIdSet);
        if (frameId) {
          setExpandedFrameIds((prev) => ({ ...prev, [frameId]: true }));
        }
      },
      { capture: true },
    );
    return unsub;
  }, [canvasRuntime, labFrames]);
  const [rightWidth, setRightWidth] = useState(360);

  /** 聚焦到指定帧，fit 该帧到可视区域中央，保留适当留白。 */
  const focusFrame = useCallback(
    (frameId: string) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      const idx = labFrames.findIndex((f) => f.id === frameId);
      if (idx < 0) return;
      const { cx, cy } = calcFrameWorldCenter(idx, width, labFrames.length);
      const leftOccupied = sidebarCollapsed ? 0 : leftWidth;
      const rightOccupied = sidebarCollapsed ? 0 : rightWidth;
      const visibleLeft = leftOccupied;
      const visibleRight = width - rightOccupied;
      const visibleW = visibleRight - visibleLeft;
      const visibleH = height;
      const padding = 80;
      const targetScale = Math.min(
        (visibleW - padding * 2) / FRAME_TOTAL_W,
        (visibleH - padding * 2) / FRAME_TOTAL_H,
        1.5,
      );
      rt.focusToWorld(cx, cy, targetScale, {
        cx: visibleLeft + visibleW / 2,
        cy: visibleH / 2,
      });
    },
    [width, height, labFrames, sidebarCollapsed, leftWidth, rightWidth],
  );
  const [realLayers, setRealLayers] = useState<Record<string, LayerNode[]>>({});

  const [leftTab, setLeftTab] = useState<"tree" | "components">("tree");
  const [rightTab, setRightTab] = useState<"properties" | "chat" | "toolTest">("properties");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState("");
  const [apiUrlDraft, setApiUrlDraft] = useState("");
  const [apiToken, setApiToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(LAB_AI_TOKEN_KEY) ?? "";
  });
  const [apiUrl, setApiUrl] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_DEEPSEEK_BASE_URL;
    }
    const saved = window.localStorage.getItem(LAB_AI_API_URL_KEY);
    return normalizeDeepseekBaseUrl(saved ?? DEFAULT_DEEPSEEK_BASE_URL);
  });
  const hasApiToken = Boolean(apiToken.trim());
  const chatApiUrl = normalizeDeepseekBaseUrl(apiUrl);

  const canvasTools = useMemo(
    () => ({
      updateComponentProps: tool({
        description: t`修改某一帧 JSON 树里某个节点的属性（样式、文本等）。默认修改商品详情帧 product。`,
        inputSchema: z.object({
          targetFrame: zFrameKey
            .optional()
            .default("product")
            .describe(t`要修改的帧键；默认 product；动态帧为 addFrame 注册的 frameKey`),
          nodeId: z.string().describe(t`节点的 id 或 name`),
          props: z
            .record(z.string(), z.any())
            .optional()
            .describe(t`要合并到 node.props 的属性对象，例如 style.color 或等价的嵌套样式字段`),
          text: z
            .string()
            .optional()
            .describe(
              t`仅当目标节点 type 为 Text 时生效。若需改按钮/容器上的可见文案，请先 querySchemaNodes 用语义关键词找到对应 Text 的 nodeId`,
            ),
        }),
        execute: async ({
          targetFrame,
          nodeId,
          props,
          text,
        }: {
          targetFrame: string;
          nodeId: string;
          props?: Record<string, unknown>;
          text?: string;
        }) => {
          const frame = targetFrame ?? "product";
          if (!frameSchemas[frame]) {
            return {
              success: false,
              error: linguiI18n._(
                msg`未知 frameKey「${frame}」。可用键：${Object.keys(frameSchemas).join(", ")}`,
              ),
            };
          }
          const root = frameSchemas[frame];
          const { text: textArg, warning } = resolveOptionalTextWrite(root, nodeId, text);
          setFrameSchemas((prev) => ({
            ...prev,
            [frame]: applyUpdateComponentPropsToSchema(prev[frame], {
              nodeId,
              props,
              text: textArg,
            }),
          }));
          return {
            success: true,
            nodeId,
            targetFrame: frame,
            ...(warning ? { warning } : {}),
          };
        },
      }),
      querySchemaNodes: tool({
        description: t`在指定帧的 JSON 树里按关键词检索节点，返回 nodeId、类型、文案摘要与路径。用于在改文案/样式前先找到正确的 nodeId。支持英文及常见中文词（如 价格、价、元）与 schema 中英 id/name 的别名扩展匹配；非向量语义，仍为子串打分。`,
        inputSchema: z.object({
          targetFrame: zFrameKey
            .optional()
            .default("product")
            .describe(t`要检索的帧键`),
          query: z
            .string()
            .describe(
              t`检索关键词，空格分词；匹配 id、name、type、节点 text。留空则按前序遍历列出前若干节点供浏览`,
            ),
          limit: z.number().int().min(1).max(100).optional().default(20),
        }),
        execute: async ({
          targetFrame,
          query,
          limit,
        }: {
          targetFrame: string;
          query: string;
          limit: number;
        }) => {
          const frame = targetFrame ?? "product";
          if (!frameSchemas[frame]) {
            return {
              error: linguiI18n._(msg`未知 frameKey「${frame}」`),
              targetFrame: frame,
              query,
              limit: limit ?? 20,
              count: 0,
              matches: [],
            };
          }
          const root = frameSchemas[frame];
          const lim = limit ?? 20;
          const matches = searchSchemaNodesByQuery(root, query, lim);
          return {
            targetFrame: frame,
            query,
            limit: lim,
            count: matches.length,
            matches,
          };
        },
      }),
      insertComponent: tool({
        description: t`在某一帧 JSON 树的指定父节点下插入子组件。默认操作商品详情帧。`,
        inputSchema: z.object({
          targetFrame: zFrameKey
            .optional()
            .default("product")
            .describe(t`目标帧键，默认 product`),
          parentId: z.string().describe(t`父节点的 id 或 name`),
          component: z
            .object({
              id: z.string(),
              name: z.string().optional(),
              type: z.string(),
              props: z.record(z.string(), z.any()).optional(),
              text: z.string().optional(),
              children: z.array(z.any()).optional(),
            })
            .describe(t`要插入的组件 schema`),
        }),
        execute: async (args) => {
          const { targetFrame, parentId, component } = args as {
            targetFrame: string;
            parentId: string;
            component: ComponentSchema;
          };
          const frame = targetFrame ?? "product";
          if (!frameSchemas[frame]) {
            return {
              success: false,
              error: linguiI18n._(msg`未知 frameKey「${frame}」`),
            };
          }
          setFrameSchemas((prev) => ({
            ...prev,
            [frame]: applyInsertComponentToSchema(prev[frame], { parentId, component }),
          }));
          return { success: true, parentId, targetFrame: frame };
        },
      }),
      removeComponent: tool({
        description: t`从某一帧 JSON 树删除节点（及子树）。默认操作商品详情帧。`,
        inputSchema: z.object({
          targetFrame: zFrameKey
            .optional()
            .default("product")
            .describe(t`目标帧键`),
          nodeId: z.string().describe(t`要删除的节点的 id 或 name`),
        }),
        execute: async ({ targetFrame, nodeId }: { targetFrame: string; nodeId: string }) => {
          const frame = targetFrame ?? "product";
          if (!frameSchemas[frame]) {
            return { success: false, error: linguiI18n._(msg`未知 frameKey「${frame}」`) };
          }
          setFrameSchemas((prev) => ({
            ...prev,
            [frame]: applyRemoveComponentFromSchema(prev[frame], nodeId),
          }));
          return { success: true, nodeId, targetFrame: frame };
        },
      }),
      addFrame: tool({
        description: t`新增一帧画布预览：仅创建空根节点 ScreenRoot；请随后用 insertComponent、updateComponentProps 多次调用以流式搭建 UI（勿整树替换）。`,
        inputSchema: z.object({
          frameKey: z
            .string()
            .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/)
            .describe(t`唯一帧键，字母开头，如 login、orders_v2`),
          displayTitle: z.string().describe(t`画布上该帧上方的说明标题`),
          phoneNavTitle: z.string().describe(t`手机壳内顶部导航栏标题`),
        }),
        execute: async ({ frameKey, displayTitle, phoneNavTitle }) => {
          const fk = frameKey.trim();
          if (!fk) {
            return { success: false as const, error: linguiI18n._(msg`frameKey 不能为空`) };
          }
          if (frameSchemas[fk] || labFrames.some((f) => f.template === fk)) {
            return {
              success: false as const,
              error: linguiI18n._(msg`帧键「${fk}」已存在，请换名或直接使用该 targetFrame`),
            };
          }
          const frameId = `frame-${fk}`;
          setLabFrames((prev) => [
            ...prev,
            {
              id: frameId,
              title: displayTitle,
              template: fk,
              phoneNavTitle: phoneNavTitle.trim() || displayTitle,
            },
          ]);
          setFrameSchemas((prev) => ({
            ...prev,
            [fk]: {
              id: `${fk}-root`,
              type: "View",
              name: "ScreenRoot",
              props: { style: { flex: 1 } },
              children: [],
            },
          }));
          return {
            success: true,
            frameKey: fk,
            frameId,
            rootNodeId: `${fk}-root`,
            hint: t`流式搭建：insertComponent 的 targetFrame 填此 frameKey，parentId 可先填 {frameKey}-root`,
          };
        },
      }),
    }),
    [frameSchemas, labFrames, t, i18n.locale],
  );

  const runToolTestAddFrame = useCallback(
    (input: { frameKey: string; displayTitle: string; phoneNavTitle: string }) => {
      const fk = input.frameKey.trim();
      if (!fk) {
        return { success: false as const, error: linguiI18n._(msg`frameKey 不能为空`) };
      }
      if (frameSchemas[fk] || labFrames.some((f) => f.template === fk)) {
        return { success: false as const, error: linguiI18n._(msg`帧键「${fk}」已存在`) };
      }
      const frameId = `frame-${fk}`;
      setLabFrames((prev) => [
        ...prev,
        {
          id: frameId,
          title: input.displayTitle,
          template: fk,
          phoneNavTitle: input.phoneNavTitle.trim() || input.displayTitle,
        },
      ]);
      setFrameSchemas((prev) => ({
        ...prev,
        [fk]: {
          id: `${fk}-root`,
          type: "View",
          name: "ScreenRoot",
          props: { style: { flex: 1 } },
          children: [],
        },
      }));
      return {
        success: true,
        frameKey: fk,
        frameId,
        rootNodeId: `${fk}-root`,
      };
    },
    [frameSchemas, labFrames],
  );

  const runToolTestUpdate = useCallback(
    (frame: string, input: { nodeId: string; props?: Record<string, unknown>; text?: string }) => {
      const root = frameSchemas[frame];
      const { text: textArg, warning } = resolveOptionalTextWrite(root, input.nodeId, input.text);
      setFrameSchemas((prev) => ({
        ...prev,
        [frame]: applyUpdateComponentPropsToSchema(prev[frame], { ...input, text: textArg }),
      }));
      return {
        success: true,
        targetFrame: frame,
        nodeId: input.nodeId,
        ...(warning ? { warning } : {}),
      };
    },
    [frameSchemas],
  );

  const runToolTestQuery = useCallback(
    (frame: string, query: string, limit: number) => {
      const matches = searchSchemaNodesByQuery(frameSchemas[frame], query, limit);
      return { targetFrame: frame, query, limit, count: matches.length, matches };
    },
    [frameSchemas],
  );

  const runToolTestInsert = useCallback(
    (frame: string, input: { parentId: string; component: ComponentSchema }) => {
      setFrameSchemas((prev) => ({
        ...prev,
        [frame]: applyInsertComponentToSchema(prev[frame], input),
      }));
      return { success: true, targetFrame: frame, parentId: input.parentId };
    },
    [frameSchemas],
  );

  const runToolTestRemove = useCallback(
    (frame: string, input: { nodeId: string }) => {
      setFrameSchemas((prev) => ({
        ...prev,
        [frame]: applyRemoveComponentFromSchema(prev[frame], input.nodeId),
      }));
      return { success: true, targetFrame: frame, nodeId: input.nodeId };
    },
    [frameSchemas],
  );

  const schemaForSelectedLayer = useMemo(() => {
    if (!selectedLayerId) return null;
    const frameTemplateKey = findTemplateForLayerNodeId(frameSchemas, selectedLayerId);
    if (!frameTemplateKey) return null;
    return { template: frameTemplateKey, schema: frameSchemas[frameTemplateKey] };
  }, [frameSchemas, selectedLayerId]);

  const transport = useMemo<ChatTransport<UIMessage>>(
    () => ({
      sendMessages: async ({ messages, abortSignal }) => {
        const apiKey = apiToken.trim();
        if (!apiKey) {
          throw new Error(t`请先在设置中提供 API Token`);
        }

        const modelMessages = await convertToModelMessages(messages);
        const provider = createDeepSeek({ apiKey, baseURL: chatApiUrl });
        const result = streamText({
          model: provider.chat("deepseek-chat"),
          messages: modelMessages,
          tools: canvasTools,
          abortSignal,
          // 默认 stopWhen 为 stepCountIs(1)，工具执行后不会进入下一轮；需多步：先 query 再 update 等
          stopWhen: stepCountIs(15),
        });

        return result.toUIMessageStream() as ReadableStream<UIMessageChunk>;
      },
      reconnectToStream: async () => null,
    }),
    [chatApiUrl, apiToken, canvasTools, t],
  );

  const chatInitialMessages = useMemo(
    () => [
      {
        id: "system",
        role: "system" as const,
        parts: [
          {
            type: "text" as const,
            text: t`你是一个 UI 助手，帮助用户修改画布上的移动端 UI 组件。
你可以调用以下工具：
- querySchemaNodes: 按关键词在某一帧的 JSON 树里检索节点，得到正确的 nodeId（改文案前若不确定 id，请先检索）
- updateComponentProps: 修改节点属性；text 字段仅对 type 为 Text 的节点生效，容器上的可见文案应对子 Text 节点的 nodeId 修改
- insertComponent: 在指定父节点下插入新组件
- removeComponent: 删除指定节点

请优先使用工具来修改 UI，工具调用会立即生效并反映在画布上。
画布上有多帧预览，每一帧对应一棵独立的 JSON 树（可用 targetFrame 指定，默认 product）。

重要：若用户诉求需要改界面（改文案/样式/增删节点），在一条回复内连续调用工具直到完成诉求，不要只执行 querySchemaNodes 就结束。典型流程：querySchemaNodes 得到 nodeId → 立刻 updateComponentProps / insertComponent / removeComponent 完成修改；仅在纯查询或已明确 nodeId 时可只调用一步。`,
          },
        ],
      },
      {
        id: "welcome",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: t`你好！我是 UI 助手，可以帮你修改画布上的界面元素。请告诉我你想做什么修改？`,
          },
        ],
      },
    ],
    [t],
  );

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    id: `open-canvas-lab-chat-${i18n.locale}`,
    messages: chatInitialMessages,
    transport,
  });

  const pickLocale = (nextLocale: "en" | "zh-cn") => {
    activateLinguiLocale(nextLocale);
    persistLabLocale(normalizeLinguiLocale(nextLocale));
    setLocale(linguiI18n.locale);
  };

  const buildLayerTree = (snapshot: SceneGraphSnapshot, currentId: string): LayerNode[] => {
    const nodeInfo = snapshot.nodes[currentId];
    if (!nodeInfo) return [];

    return nodeInfo.children.map((childId: string) => {
      const childInfo = snapshot.nodes[childId];
      const kind = (childInfo as any)?.nodeKind ?? "view";

      let type: LayerType = "view";
      if (kind === "text") type = "text";
      else if (kind === "image") type = "image";
      else if (kind === "scrollView") type = "scroll";
      else if (kind === "svgPath") type = "image"; // fallback

      return {
        id: childId,
        name: childInfo?.label || childId,
        type,
        children: buildLayerTree(snapshot, childId),
      };
    });
  };

  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const updateLayers = () => {
      const snapshot = rt.getSceneGraphSnapshot();
      const newRealLayers: Record<string, LayerNode[]> = {};

      for (const frame of labFrames) {
        // find the node that matches the frameId
        const frameNodeId = Object.keys(snapshot.nodes).find((id) => id === frame.id);
        if (frameNodeId) {
          newRealLayers[frame.id] = buildLayerTree(snapshot, frameNodeId);
        }
      }
      setRealLayers((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(newRealLayers);
        if (prevJson === nextJson) return prev;
        return newRealLayers;
      });
    };

    // Subscribe to layout updates to keep tree in sync
    const unsubscribe = rt.subscribeAfterLayout(() => {
      updateLayers();
    });

    // Initial update
    updateLayers();

    return unsubscribe;
    // canvasRuntime：首次挂载时 runtimeRef 尚为 null，若仅依赖 labFrames，运行时就绪后不会重跑，会一直用 INITIAL_LAB_FRAMES 的静态 layers。
  }, [labFrames, canvasRuntime]);

  const renderLayerTree = (layer: LayerNode, depth: number) => {
    const isExpanded = expandedLayerIds[layer.id] ?? true;
    const hasChildren = layer.children && layer.children.length > 0;
    const isSelected = selectedLayerId === layer.id;

    return (
      <div key={layer.id}>
        <div
          className={`flex items-center gap-1 py-1 rounded cursor-pointer ${isSelected ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"}`}
          style={{ paddingLeft: `${depth * 12 + 24}px`, paddingRight: "8px" }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLayerId(layer.id);
            setRightTab("properties");
          }}
        >
          <div
            className="w-4 h-4 flex items-center justify-center shrink-0"
            onClick={(e) => {
              if (hasChildren) {
                e.stopPropagation();
                setExpandedLayerIds((prev) => ({ ...prev, [layer.id]: !isExpanded }));
              }
            }}
          >
            {hasChildren ? (
              <span className="text-slate-400 hover:text-slate-600 text-[10px]">
                {isExpanded ? "▾" : "▸"}
              </span>
            ) : null}
          </div>
          {getIconForLayerType(layer.type)}
          <span className="truncate ml-1">{layer.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>{layer.children!.map((child) => renderLayerTree(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-slate-100">
      <div
        ref={canvasStageHostRef}
        className="absolute inset-0 z-0"
        style={{ cursor: handEnabled ? (isHandPanning ? "grabbing" : "grab") : "default" }}
        onPointerDown={(e) => {
          if (!handEnabledRef.current) return;
          const rt = runtimeRef.current;
          if (!rt) return;
          const host = canvasStageHostRef.current;
          const canvas = host?.querySelector("canvas");
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const stage = clientXYToStageLocal(
            { left: rect.left, top: rect.top },
            e.clientX,
            e.clientY,
          );
          const { x: wx, y: wy } = rt.screenToWorld(stage.x, stage.y);
          const hitLeaf = rt.hitTestWorld(wx, wy);
          const cam = rt.getCamera();
          handPanGestureRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originTx: cam.tx,
            originTy: cam.ty,
            pointerId: e.pointerId,
            hitLeafAtDown: hitLeaf,
            panning: false,
          };
        }}
        onPointerMove={(e) => {
          scheduleHoverOutline(e.clientX, e.clientY);
          const p = handPanGestureRef.current;
          if (!p || !handEnabledRef.current) return;
          if ((e.buttons & 1) !== 1) return;
          const rt = runtimeRef.current;
          if (!rt) return;
          const dx = e.clientX - p.startX;
          const dy = e.clientY - p.startY;
          const dist = Math.hypot(dx, dy);
          if (!p.panning) {
            if (dist <= HAND_PAN_MOVE_THRESHOLD_PX) return;
            if (rt.findVerticalScrollAncestorForLeaf(p.hitLeafAtDown) !== null) {
              return;
            }
            p.panning = true;
            setIsHandPanning(true);
            canvasStageHostRef.current?.setPointerCapture(e.pointerId);
          }
          if (p.panning) {
            rt.setCamera({
              tx: p.originTx + (e.clientX - p.startX),
              ty: p.originTy + (e.clientY - p.startY),
            });
          }
        }}
        onPointerUp={(e) => {
          const p = handPanGestureRef.current;
          if (p?.panning) {
            canvasStageHostRef.current?.releasePointerCapture(e.pointerId);
          }
          if (p) {
            handPanGestureRef.current = null;
            setIsHandPanning(false);
          }
        }}
        onPointerCancel={() => {
          const p = handPanGestureRef.current;
          if (p?.panning) {
            canvasStageHostRef.current?.releasePointerCapture(p.pointerId);
          }
          if (p) {
            handPanGestureRef.current = null;
            setIsHandPanning(false);
          }
        }}
        onPointerLeave={() => {
          if (hoverOutlineRef.current) {
            hoverOutlineRef.current.style.display = "none";
          }
        }}
        onWheel={(e) => {
          const rt = runtimeRef.current;
          if (!rt) return;
          const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
          rt.zoomAt(e.clientX, e.clientY, factor);
        }}
      >
        <CanvasProvider>
          {({ isReady, runtime, initError }) => {
            if (initError) {
              return (
                <div className="flex h-full items-center justify-center text-sm text-red-600">
                  {t`画布初始化失败：${initError.message}`}
                </div>
              );
            }

            if (!isReady || !runtime) {
              return (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {t`Canvas 正在加载...`}
                </div>
              );
            }

            return (
              <Canvas
                width={width}
                height={height}
                paragraphFontProvider={runtime.paragraphFontProvider}
                defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
                onRuntimeReady={handleRuntimeReady}
                onCameraChange={handleCameraChange}
              >
                <View
                  style={{
                    width: canvasW,
                    height: canvasH,
                    backgroundColor: "#e2e8f0",
                  }}
                >
                  <LabDesignPreviewCanvas labFrames={labFrames} frameSchemas={frameSchemas} />
                </View>
              </Canvas>
            );
          }}
        </CanvasProvider>
        <div
          ref={hoverOutlineRef}
          className="pointer-events-none absolute z-[5]"
          style={{
            display: "none",
            borderRadius: 6,
            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.92)",
          }}
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        {sidebarCollapsed ? (
          <div className="pointer-events-auto absolute left-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex cursor-pointer items-center gap-1 hover:opacity-80">
              <div className="flex size-5 items-center justify-center rounded bg-slate-900 text-white">
                <span className="text-[10px] font-bold">RC</span>
              </div>
              <ChevronDown className="size-3 text-slate-500" />
            </div>
            <span className="text-sm font-medium text-slate-800">{t`React Canvas Lab`}</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              {t`Free`}
            </span>
            <div className="ml-1 h-4 w-px bg-slate-200" />
            <button
              className="flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title={t`展开侧边栏`}
            >
              <PanelLeft className="size-4" />
            </button>
          </div>
        ) : (
          <ResizableSidebar
            maxWidth={600}
            minWidth={200}
            side="left"
            width={leftWidth}
            onWidthChange={setLeftWidth}
          >
            <div className="flex flex-col border-b border-slate-100">
              <div className="flex items-center justify-between p-3 pb-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded bg-slate-900 text-white">
                    <span className="text-[10px] font-bold">RC</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{t`Lab`}</span>
                </div>
                <button
                  className="flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  title={t`收起侧边栏`}
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 px-3 mt-1">
                <button
                  className={`pb-2 text-xs font-medium border-b-2 transition-colors ${leftTab === "tree" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                  type="button"
                  onClick={() => setLeftTab("tree")}
                >
                  {t`图层树`}
                </button>
                <button
                  className={`pb-2 text-xs font-medium border-b-2 transition-colors ${leftTab === "components" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                  type="button"
                  onClick={() => setLeftTab("components")}
                >
                  {t`组件库`}
                </button>
              </div>
            </div>

            {leftTab === "tree" ? (
              <div className="flex-1 overflow-y-auto p-2 text-xs">
                <button
                  className="mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100"
                  type="button"
                >
                  <span className="font-medium">{t`Frames`}</span>
                  <span>{labFrames.length}</span>
                </button>
                <div className="space-y-1">
                  {labFrames.map((frame) => {
                    const expanded = expandedFrameIds[frame.id] ?? false;
                    return (
                      <div key={frame.id}>
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded px-1 text-slate-500 hover:bg-slate-100"
                            type="button"
                            onClick={() => {
                              setExpandedFrameIds((prev) => ({
                                ...prev,
                                [frame.id]: !(prev[frame.id] ?? true),
                              }));
                            }}
                          >
                            {expanded ? "▾" : "▸"}
                          </button>
                          <button
                            className="flex-1 rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100"
                            type="button"
                            onClick={() => {
                              focusFrame(frame.id);
                            }}
                          >
                            {frame.title}
                          </button>
                        </div>
                        {expanded ? (
                          <div className="mt-0.5">
                            {realLayers[frame.id] && realLayers[frame.id].length > 0 ? (
                              realLayers[frame.id].map((layer) => renderLayerTree(layer, 0))
                            ) : frame.layers && frame.layers.length > 0 ? (
                              frame.layers.map((layer) => renderLayerTree(layer, 0))
                            ) : (
                              <div className="ml-6 py-1 px-2 text-slate-400 italic">
                                {t`（暂无图层数据）`}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
                <div>
                  <div className="text-slate-400 font-medium mb-2 px-1">{t`基础图元 (Primitives)`}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <Box className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">View</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <Type className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">Text</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <ImageIcon className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">Image</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <MousePointer2 className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">ScrollView</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium mb-2 px-1">{t`业务组件 (Business)`}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <LayoutTemplate className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">Button</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <LayoutTemplate className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">ProductCard</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <LayoutTemplate className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">CategoryItem</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <LayoutTemplate className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">StatusBar</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <LayoutTemplate className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">NavBar</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-colors">
                      <div className="text-slate-500 mb-2">
                        <Smartphone className="size-4" />
                      </div>
                      <span className="text-slate-700 font-medium text-[10px]">PhoneShell</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ResizableSidebar>
        )}

        {sidebarCollapsed ? (
          <div className="pointer-events-auto absolute right-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <span className="text-sm font-medium text-slate-800">{t`编辑器 & AI`}</span>
          </div>
        ) : (
          <ResizableSidebar
            maxWidth={800}
            minWidth={280}
            side="right"
            width={rightWidth}
            onWidthChange={setRightWidth}
          >
            <div className="flex h-full flex-col">
              {/* 顶部标题栏 */}
              <div className="flex flex-col border-b border-slate-100">
                <div className="flex items-center justify-between p-3 pb-1">
                  <p className="text-sm font-bold text-slate-800">{t`编辑器 & AI`}</p>
                  {rightTab === "chat" ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-slate-500 underline hover:text-slate-800"
                        type="button"
                        onClick={() => {
                          setSettingsOpen((v) => !v);
                          setTokenDraft(apiToken);
                          setApiUrlDraft(chatApiUrl || DEFAULT_DEEPSEEK_BASE_URL);
                        }}
                      >
                        {t`设置`}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 px-3 mt-1">
                  <button
                    className={`pb-2 text-xs font-medium border-b-2 transition-colors ${rightTab === "properties" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    type="button"
                    onClick={() => setRightTab("properties")}
                  >
                    {t`属性`}
                  </button>
                  <button
                    className={`pb-2 text-xs font-medium border-b-2 transition-colors ${rightTab === "chat" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    type="button"
                    onClick={() => setRightTab("chat")}
                  >
                    {t`AI 对话`}
                  </button>
                  <button
                    className={`pb-2 text-xs font-medium border-b-2 transition-colors ${rightTab === "toolTest" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                    type="button"
                    onClick={() => setRightTab("toolTest")}
                  >
                    {t`工具测试`}
                  </button>
                </div>
              </div>

              {rightTab === "chat" ? (
                <>
                  {/* Token 设置面板 */}
                  {settingsOpen ? (
                    <div className="border-b border-slate-100 bg-slate-50 p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[11px] text-slate-600">{t`API Token（本地持久化）`}</p>
                        <button
                          className="text-[11px] text-slate-500 underline hover:text-slate-800"
                          type="button"
                          onClick={() => {
                            setSettingsOpen(false);
                          }}
                        >
                          {t`关闭`}
                        </button>
                      </div>
                      <input
                        className="w-full rounded-md border bg-white px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder={t`输入 token（保存到 localStorage）`}
                        value={tokenDraft}
                        onChange={(e) => setTokenDraft(e.target.value)}
                      />
                      <p className="mt-2 mb-1.5 text-[11px] text-slate-600">
                        {t`DeepSeek Base URL（本地持久化）`}
                      </p>
                      <input
                        className="w-full rounded-md border bg-white px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder={DEFAULT_DEEPSEEK_BASE_URL}
                        value={apiUrlDraft}
                        onChange={(e) => setApiUrlDraft(e.target.value)}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            window.localStorage.removeItem(LAB_AI_TOKEN_KEY);
                            setApiToken("");
                            setTokenDraft("");
                            window.localStorage.removeItem(LAB_AI_API_URL_KEY);
                            setApiUrl(DEFAULT_DEEPSEEK_BASE_URL);
                            setApiUrlDraft(DEFAULT_DEEPSEEK_BASE_URL);
                          }}
                        >
                          {t`清空`}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => {
                            const nextToken = tokenDraft.trim();
                            const nextApiUrl = normalizeDeepseekBaseUrl(
                              apiUrlDraft || DEFAULT_DEEPSEEK_BASE_URL,
                            );
                            if (nextToken) {
                              window.localStorage.setItem(LAB_AI_TOKEN_KEY, nextToken);
                            } else {
                              window.localStorage.removeItem(LAB_AI_TOKEN_KEY);
                            }
                            window.localStorage.setItem(LAB_AI_API_URL_KEY, nextApiUrl);
                            setApiToken(nextToken);
                            setApiUrl(nextApiUrl);
                            setSettingsOpen(false);
                          }}
                        >
                          {t`保存`}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* 消息列表 */}
                  <Conversation className="flex-1">
                    <ConversationContent className="gap-4 p-3">
                      {messages
                        .filter((m) => m.role !== "system")
                        .map((message) => (
                          <Message key={message.id} from={message.role}>
                            <MessageContent>
                              {message.parts.map((part, idx) => {
                                if (part.type === "text") {
                                  return (
                                    <MessageResponse key={`${message.id}-text-${idx}`}>
                                      {part.text}
                                    </MessageResponse>
                                  );
                                }
                                if (isToolUIPart(part)) {
                                  return (
                                    <ToolCallDisplay
                                      key={`${message.id}-tool-${idx}`}
                                      part={part as ToolUIPart}
                                      msgId={message.id}
                                      idx={idx}
                                    />
                                  );
                                }
                                return null;
                              })}
                            </MessageContent>
                          </Message>
                        ))}
                    </ConversationContent>
                    <ConversationScrollButton />
                  </Conversation>

                  {/* 错误提示 */}
                  {error ? (
                    <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
                      <span className="min-w-0 break-words">{error.message}</span>
                      <button
                        className="shrink-0 underline"
                        type="button"
                        onClick={() => clearError()}
                      >
                        {t`关闭`}
                      </button>
                    </div>
                  ) : null}

                  {/* 输入栏 */}
                  <div className="border-t border-slate-100 p-3">
                    <PromptInput
                      onSubmit={(msg: PromptInputMessage) => {
                        const text = msg.text.trim();
                        if (!text || !hasApiToken) return;
                        void sendMessage({ text });
                      }}
                    >
                      <PromptInputTextarea
                        disabled={!hasApiToken || status === "submitted" || status === "streaming"}
                        placeholder={hasApiToken ? t`输入消息…` : t`请先在设置中提供 API Token`}
                        className="min-h-[40px] text-xs"
                      />
                      <PromptInputFooter className="justify-end p-1.5">
                        <PromptInputSubmit
                          disabled={!hasApiToken}
                          status={
                            status === "streaming" || status === "submitted" ? status : undefined
                          }
                          onStop={() => void stop()}
                        />
                      </PromptInputFooter>
                    </PromptInput>
                  </div>
                </>
              ) : rightTab === "toolTest" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <ToolTestPanel
                    frameSchemas={frameSchemas}
                    labFrames={labFrames}
                    onAddFrame={runToolTestAddFrame}
                    onInsertComponent={runToolTestInsert}
                    onQuerySchemaNodes={runToolTestQuery}
                    onRemoveComponent={runToolTestRemove}
                    onUpdateComponentProps={runToolTestUpdate}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-3 text-xs">
                  {selectedLayerId && schemaForSelectedLayer ? (
                    <PropertiesPanel
                      nodeId={selectedLayerId}
                      runtime={runtimeRef.current}
                      schema={schemaForSelectedLayer.schema}
                      onUpdateNode={handleUpdateNode}
                    />
                  ) : selectedLayerId ? (
                    <div className="flex h-full items-center justify-center px-3 text-center text-xs leading-relaxed text-slate-500">
                      {t`你选的是外壳或公共装饰（例如手机框、状态栏），不算本页可编辑内容，右侧改不了。请在左侧图层里点页面里的具体元素。`}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      {t`请在左侧图层树中选择一个节点`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ResizableSidebar>
        )}

        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-white/95 p-1.5 shadow-lg backdrop-blur">
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${handEnabled ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            title={t`手型工具（拖拽画布）`}
            onClick={() => {
              setHandEnabled((v) => !v);
            }}
          >
            ✋ {handEnabled ? t`开` : t`关`}
          </button>
          <span className="select-none px-1 text-xs tabular-nums text-slate-500">
            {Math.round(cameraScale * 100)}%
          </span>
          <button
            className="rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            type="button"
            title={t`重置缩放`}
            onClick={() => {
              runtimeRef.current?.setCamera({ scale: 1, tx: 0, ty: 0 });
            }}
          >
            1:1
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${locale === "zh-cn" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            onClick={() => pickLocale("zh-cn")}
          >
            {t`中文`}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            onClick={() => pickLocale("en")}
          >
            {t`English`}
          </button>
          <a
            className="inline-flex rounded-md px-3 py-1.5 text-xs hover:bg-slate-100"
            href="https://github.com/ouzhou/react-canvas"
            target="_blank"
            rel="noreferrer"
          >
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 bg-clip-text font-medium text-transparent">
              GitHub
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}
