import { Canvas, CanvasProvider, ScrollView, Text, View } from "@react-canvas/react-v2";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLingui } from "@lingui/react";
import { Button } from "@/components/ui/button";
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
const BRAND = "#53B175";
const PAGE_BG = "#ffffff";
const MUTED = "#94a3b8";
const TEXT = "#0f172a";
const LAB_AI_TOKEN_KEY = "open-canvas-lab-ai-token";

function StatusBar() {
  return (
    <View
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
        style={{
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PAGE_BG,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{title}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function ExploreScreen() {
  const categories = [
    { title: "Fresh Fruits", bg: "#dcfce7" },
    { title: "Oil & Ghee", bg: "#ffedd5" },
    { title: "Meat & Fish", bg: "#fce7f3" },
    { title: "Bakery", bg: "#f3e8ff" },
  ];
  return (
    <PhoneShell title="Explore">
      <View style={{ flex: 1, padding: 12 }}>
        <View
          style={{
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 14,
            backgroundColor: "#f1f5f9",
          }}
        >
          <Text style={{ fontSize: 12, color: MUTED }}>Search Store</Text>
        </View>
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {categories.map((c) => (
            <View
              key={c.title}
              style={{
                width: 120,
                marginBottom: 8,
                borderRadius: 14,
                backgroundColor: c.bg,
                minHeight: 74,
                padding: 10,
                justifyContent: "flex-end",
              }}
            >
              <Text style={{ fontSize: 12, lineHeight: 16, color: TEXT, fontWeight: 600 }}>
                {c.title}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </PhoneShell>
  );
}

function FiltersScreen() {
  const options = ["Eggs", "Noodles", "Snacks", "Fast Food"];
  return (
    <PhoneShell title="Filters">
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 10 }}>
          Categories
        </Text>
        {options.map((label, i) => (
          <View
            key={label}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
          >
            <Text style={{ fontSize: 14, color: i === 0 ? BRAND : MUTED }}>
              {i === 0 ? "☑" : "☐"}
            </Text>
            <Text style={{ marginLeft: 8, fontSize: 13, color: TEXT }}>{label}</Text>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <View
          style={{
            borderRadius: 14,
            backgroundColor: BRAND,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Apply Filter</Text>
        </View>
      </View>
    </PhoneShell>
  );
}

function CartScreen() {
  const items = [
    { name: "Bell Pepper Red", info: "1kg, Price", price: "$4.99", icon: "🫑" },
    { name: "Egg Chicken Red", info: "4pcs, Price", price: "$1.99", icon: "🥚" },
    { name: "Organic Bananas", info: "7pcs, Price", price: "$3.00", icon: "🍌" },
  ];
  return (
    <PhoneShell title="My Cart">
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 12 }}>
            {items.map((item) => (
              <View key={item.name} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", paddingBottom: 10 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: "#f8fafc",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{item.info}</Text>
                    <Text style={{ fontSize: 13, color: TEXT, fontWeight: 700, marginTop: 6 }}>
                      {item.price}
                    </Text>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={{ padding: 12 }}>
          <View
            style={{
              borderRadius: 14,
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Checkout $12.96</Text>
          </View>
        </View>
      </View>
    </PhoneShell>
  );
}

function ProductScreen() {
  return (
    <PhoneShell title="Product">
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 160,
            backgroundColor: "#e2e8f0",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 42 }}>🍎</Text>
        </View>
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 18, color: TEXT, fontWeight: 700 }}>Naturel Red Apple</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>1kg, Price</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ fontSize: 14, color: TEXT }}>Qty 1</Text>
            <Text style={{ fontSize: 18, color: TEXT, fontWeight: 700 }}>$4.99</Text>
          </View>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 18 }}>
            Apples are nutritious. Good for weight loss, heart and bone health.
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ padding: 12 }}>
          <View
            style={{
              borderRadius: 14,
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Add To Basket</Text>
          </View>
        </View>
      </View>
    </PhoneShell>
  );
}

function BeveragesScreen() {
  const products = [
    { name: "Diet Coke", price: "$1.99" },
    { name: "Sprite Can", price: "$1.50" },
    { name: "Orange Juice", price: "$15.99" },
    { name: "Pepsi Can", price: "$4.99" },
  ];
  const tints = ["#e0f2fe", "#fef3c7", "#fce7f3", "#dbeafe"];
  return (
    <PhoneShell title="Beverages">
      <View style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {products.map((p, i) => (
            <View
              key={p.name}
              style={{
                width: 120,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                padding: 8,
                marginBottom: 8,
                backgroundColor: "#fff",
              }}
            >
              <View
                style={{
                  height: 72,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tints[i % tints.length],
                }}
              >
                <Text style={{ fontSize: 24 }}>🥤</Text>
              </View>
              <Text style={{ marginTop: 6, fontSize: 11, color: TEXT, fontWeight: 600 }}>
                {p.name}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: TEXT, fontWeight: 700 }}>
                {p.price}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </PhoneShell>
  );
}

function SearchScreen() {
  return (
    <PhoneShell title="Search">
      <View style={{ flex: 1, padding: 12 }}>
        <View
          style={{
            borderRadius: 14,
            backgroundColor: "#f1f5f9",
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: TEXT }}>Egg</Text>
        </View>
        <View style={{ height: 10 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {[1, 2, 3, 4].map((n) => (
            <View
              key={n}
              style={{
                width: 120,
                marginBottom: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                padding: 8,
              }}
            >
              <View
                style={{
                  height: 72,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#fef9c3",
                }}
              >
                <Text style={{ fontSize: 24 }}>🥚</Text>
              </View>
              <Text style={{ marginTop: 6, fontSize: 11, color: TEXT }}>Egg Product {n}</Text>
            </View>
          ))}
        </View>
      </View>
    </PhoneShell>
  );
}

function FavouriteScreen() {
  const list = ["Sprite Can", "Diet Coke", "Apple Juice", "Pepsi Can"];
  return (
    <PhoneShell title="Favourite">
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 12 }}>
            {list.map((item) => (
              <View key={item} style={{ paddingTop: 10, paddingBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: "#e0f2fe",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Text>🥤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>{item}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>325ml, Price</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>$1.99</Text>
                </View>
                <View style={{ height: 1, marginTop: 10, backgroundColor: "#f1f5f9" }} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </PhoneShell>
  );
}

type LabFrameTemplate =
  | "product"
  | "explore"
  | "beverages"
  | "search"
  | "filters"
  | "cart"
  | "favourite";

type LabFrameModel = {
  id: string;
  title: string;
  template: LabFrameTemplate;
};

const LAB_FRAMES: readonly LabFrameModel[] = [
  { id: "frame-product", title: "商品详情 · Product", template: "product" },
  { id: "frame-explore", title: "分类探索 · Explore", template: "explore" },
  { id: "frame-beverages", title: "饮料 · Beverages", template: "beverages" },
  { id: "frame-search", title: "搜索 · Search", template: "search" },
  { id: "frame-filters", title: "筛选 · Filters", template: "filters" },
  { id: "frame-cart", title: "购物车 · My Cart", template: "cart" },
  { id: "frame-favourite", title: "收藏 · Favourite", template: "favourite" },
];

function LabFrameGroup({
  frameId,
  title,
  selected,
  children,
}: {
  frameId: string;
  title: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: selected ? "#0f172a" : "#475569",
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View
        id={frameId}
        style={{
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? "#2563eb" : "#cbd5e1",
          borderRadius: 20,
          padding: selected ? 2 : 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function renderFrameContent(template: LabFrameTemplate): ReactNode {
  switch (template) {
    case "product":
      return <ProductScreen />;
    case "explore":
      return <ExploreScreen />;
    case "beverages":
      return <BeveragesScreen />;
    case "search":
      return <SearchScreen />;
    case "filters":
      return <FiltersScreen />;
    case "cart":
      return <CartScreen />;
    case "favourite":
      return <FavouriteScreen />;
    default:
      return null;
  }
}

function LabDesignPreviewCanvas({ selectedFrameId }: { selectedFrameId: string | null }) {
  return (
    <ScrollView style={{ flex: 1 }}>
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
        {LAB_FRAMES.map((frame) => (
          <LabFrameGroup
            key={frame.id}
            frameId={frame.id}
            title={frame.title}
            selected={selectedFrameId === frame.id}
          >
            {renderFrameContent(frame.template)}
          </LabFrameGroup>
        ))}
      </View>
    </ScrollView>
  );
}

export function App() {
  const { width, height } = useViewportSize();
  const { i18n } = useLingui();
  const [locale, setLocale] = useState(() => linguiI18n.locale);
  const [handEnabled, setHandEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(LAB_FRAMES[0]?.id ?? null);
  const [expandedFrameIds, setExpandedFrameIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(LAB_FRAMES.map((frame) => [frame.id, true])),
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [apiToken, setApiToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(LAB_AI_TOKEN_KEY) ?? "";
  });
  const chatApiUrl = (import.meta.env.VITE_AI_CHAT_URL as string | undefined)?.trim();
  const chatEnabled = Boolean(chatApiUrl);
  const transport = useMemo(() => {
    if (!chatApiUrl) {
      return undefined;
    }
    return new DefaultChatTransport({
      api: chatApiUrl,
      credentials: "omit",
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (apiToken.trim()) {
          headers.set("Authorization", `Bearer ${apiToken.trim()}`);
        }
        return fetch(input, { ...init, headers });
      },
    });
  }, [chatApiUrl, apiToken]);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: chatEnabled
              ? "Vercel AI SDK 已接入，可直接开始对话。"
              : "未配置 VITE_AI_CHAT_URL。请先配置后再对话。",
          },
        ],
      },
    ],
    transport,
  });

  const pickLocale = (nextLocale: "en" | "zh-cn") => {
    activateLinguiLocale(nextLocale);
    persistLabLocale(normalizeLinguiLocale(nextLocale));
    setLocale(linguiI18n.locale);
  };

  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-slate-100">
      <div className="absolute inset-0 z-0">
        <CanvasProvider>
          {({ isReady, runtime, initError }) => {
            if (initError) {
              return (
                <div className="flex h-full items-center justify-center text-sm text-red-600">
                  {i18n._("lab.initError", { message: initError.message })}
                </div>
              );
            }

            if (!isReady || !runtime) {
              return (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {i18n._("lab.loading")}
                </div>
              );
            }

            return (
              <Canvas
                width={width}
                height={height}
                paragraphFontProvider={runtime.paragraphFontProvider}
                defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
              >
                <View
                  style={{
                    width,
                    height,
                    backgroundColor: "#e2e8f0",
                  }}
                >
                  <LabDesignPreviewCanvas selectedFrameId={selectedFrameId} />
                </View>
              </Canvas>
            );
          }}
        </CanvasProvider>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        {sidebarCollapsed ? (
          <button
            className="pointer-events-auto absolute left-4 top-4 rounded-md border bg-white/95 px-3 py-1.5 text-xs text-slate-700 shadow hover:bg-slate-100"
            type="button"
            onClick={() => setSidebarCollapsed(false)}
          >
            展开节点树
          </button>
        ) : (
          <div className="pointer-events-auto absolute left-4 top-4 w-[280px] rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">节点树</p>
              <button
                className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                type="button"
                onClick={() => setSidebarCollapsed(true)}
              >
                收起
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-md border bg-white p-2 text-xs">
              <button
                className="mb-1 flex w-full items-center justify-between rounded px-2 py-1 text-left text-slate-700 hover:bg-slate-100"
                type="button"
              >
                <span className="font-medium">Frames</span>
                <span>{LAB_FRAMES.length}</span>
              </button>
              <div className="space-y-1">
                {LAB_FRAMES.map((frame) => {
                  const expanded = expandedFrameIds[frame.id] ?? true;
                  const selected = selectedFrameId === frame.id;
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
                          className={`flex-1 rounded px-2 py-1 text-left ${selected ? "bg-blue-100 text-blue-700" : "text-slate-700 hover:bg-slate-100"}`}
                          type="button"
                          onClick={() => setSelectedFrameId(frame.id)}
                        >
                          {frame.title}
                        </button>
                      </div>
                      {expanded ? (
                        <button
                          className="ml-6 mt-0.5 block rounded px-2 py-1 text-left text-slate-500 hover:bg-slate-100"
                          type="button"
                          onClick={() => setSelectedFrameId(frame.id)}
                        >
                          screen ({frame.template})
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-auto absolute right-4 top-4 w-[360px] rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
          <p className="mb-2 text-sm font-medium text-slate-800">{i18n._("lab.editor.title")}</p>
          <textarea
            className="h-44 w-full resize-none rounded-md border p-2 font-mono text-xs outline-none"
            defaultValue={`<View>\n  <Text>Hello</Text>\n</View>`}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm">{i18n._("lab.editor.apply")}</Button>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-white/95 p-1.5 shadow-lg backdrop-blur">
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${handEnabled ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            onClick={() => {
              setHandEnabled((v) => !v);
            }}
          >
            hand: {handEnabled ? "on" : "off"}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${locale === "zh-cn" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            onClick={() => pickLocale("zh-cn")}
          >
            {i18n._("lab.locale.zh")}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-xs ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            type="button"
            onClick={() => pickLocale("en")}
          >
            {i18n._("lab.locale.en")}
          </button>
          <a
            className="inline-flex rounded-md px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            href="https://github.com/zhouou/react-canvas"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>

        {chatOpen ? (
          <div className="pointer-events-auto absolute bottom-4 right-4 w-[360px] rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">{i18n._("lab.chat.title")}</p>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-slate-500 underline"
                  type="button"
                  onClick={() => {
                    setSettingsOpen((v) => !v);
                    setTokenDraft(apiToken);
                  }}
                >
                  设置
                </button>
                <button
                  className="text-xs text-slate-500 underline"
                  type="button"
                  onClick={() => {
                    setChatOpen(false);
                    setSettingsOpen(false);
                  }}
                >
                  关闭
                </button>
              </div>
            </div>

            {settingsOpen ? (
              <div className="mb-2 rounded-md border bg-slate-50 p-2">
                <p className="mb-1 text-[11px] text-slate-600">API Token（本地持久化）</p>
                <input
                  className="w-full rounded-md border bg-white px-2 py-1 text-xs outline-none"
                  placeholder="输入 token（保存到 localStorage）"
                  value={tokenDraft}
                  onChange={(e) => {
                    setTokenDraft(e.target.value);
                  }}
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
                    }}
                  >
                    清空
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => {
                      const next = tokenDraft.trim();
                      if (next) {
                        window.localStorage.setItem(LAB_AI_TOKEN_KEY, next);
                      } else {
                        window.localStorage.removeItem(LAB_AI_TOKEN_KEY);
                      }
                      setApiToken(next);
                      setSettingsOpen(false);
                    }}
                  >
                    保存
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-2 h-40 space-y-2 overflow-y-auto rounded-md border bg-white p-2 text-xs">
              {messages.map((message) => (
                <div key={message.id}>
                  <p className="mb-1 text-[10px] text-slate-500">{message.role}</p>
                  {message.parts.map((part, idx) =>
                    part.type === "text" ? (
                      <p className="text-slate-700" key={`${message.id}-${idx}`}>
                        {part.text}
                      </p>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
            {error ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-600">
                <span className="min-w-0 break-words">{error.message}</span>
                <button
                  className="shrink-0 underline"
                  type="button"
                  onClick={() => {
                    clearError();
                  }}
                >
                  关闭
                </button>
              </div>
            ) : null}
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = chatInput.trim();
                if (!text || !chatEnabled) {
                  return;
                }
                void sendMessage({ text });
                setChatInput("");
              }}
            >
              <input
                className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none"
                disabled={!chatEnabled || status === "submitted"}
                placeholder={chatEnabled ? "输入消息..." : "请先配置 VITE_AI_CHAT_URL"}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                }}
              />
              <Button
                disabled={!chatEnabled || (!chatInput.trim() && status === "ready")}
                size="sm"
              >
                {status === "streaming" ? "Stop" : "发送"}
              </Button>
              {status === "streaming" ? (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void stop();
                  }}
                >
                  停止
                </Button>
              ) : null}
            </form>
          </div>
        ) : (
          <Button
            className="pointer-events-auto absolute bottom-4 right-4"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setChatOpen(true);
            }}
          >
            AI 对话
          </Button>
        )}
      </div>
    </main>
  );
}
