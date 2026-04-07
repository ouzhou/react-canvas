import {
  attachInspectorHandlers,
  InspectorHighlight,
  type InspectorState,
} from "@react-canvas/plugin-inspector";
import {
  attachViewportHandlers,
  useViewportState,
  type ViewportState,
} from "@react-canvas/plugin-viewport";
import { Canvas, CanvasProvider, Image, ScrollView, Text, View } from "@react-canvas/react";
import {
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** 与设计稿接近的逻辑宽度，便于一排排布多个「子页面」 */
const PHONE_W = 340;
const PHONE_H = 620;

const BRAND = "#53B175";
const PAGE_BG = "#ffffff";
const MUTED = "#94a3b8";
const TEXT = "#0f172a";

/** 外壳 border 4×2，内容区宽度用于图片与网格列宽 */
const PHONE_CONTENT_W = PHONE_W - 8;

function StatusBar() {
  return (
    <View
      style={{
        height: 44,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: PAGE_BG,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT }}>9:41</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Text style={{ fontSize: 11, color: TEXT, fontWeight: "700" }}>▮</Text>
        <Text style={{ fontSize: 11, color: TEXT, fontWeight: "700" }}>▮</Text>
        <Text style={{ fontSize: 11, color: TEXT, fontWeight: "700" }}>▮</Text>
        <Text style={{ fontSize: 11, color: TEXT, fontWeight: "700" }}>▮</Text>
        <Text style={{ fontSize: 12, color: TEXT }}>📶</Text>
        <Text style={{ fontSize: 12, color: TEXT }}>🔋</Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT }}>100%</Text>
      </View>
    </View>
  );
}

/** 参考稿中「三条横线 + 竖条」的筛选图标 */
function FilterSlidersIcon() {
  return (
    <View
      style={{ width: 22, height: 18, flexDirection: "column", justifyContent: "space-between" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
        <View
          style={{
            height: 2,
            flex: 1,
            marginHorizontal: 4,
            backgroundColor: TEXT,
            borderRadius: 1,
          }}
        />
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
        <View
          style={{
            height: 2,
            flex: 1,
            marginHorizontal: 4,
            backgroundColor: TEXT,
            borderRadius: 1,
          }}
        />
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
        <View
          style={{
            height: 2,
            flex: 1,
            marginHorizontal: 4,
            backgroundColor: TEXT,
            borderRadius: 1,
          }}
        />
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: TEXT }} />
      </View>
    </View>
  );
}

type PhoneShellProps = {
  /** 导航栏居中标题 */
  title: string;
  /** 左侧：返回 ‹、关闭 ✕ 或占位 */
  leftSlot?: "back" | "close" | "none";
  /** 右侧自定义（如筛选） */
  rightSlot?: ReactNode;
  children: ReactNode;
};

function PhoneNavBar({ title, leftSlot = "none", rightSlot }: Omit<PhoneShellProps, "children">) {
  const slotW = 44;
  const leftNode =
    leftSlot === "back" ? (
      <Text style={{ fontSize: 22, color: TEXT, fontWeight: "400" }}>‹</Text>
    ) : leftSlot === "close" ? (
      <Text style={{ fontSize: 20, color: TEXT, fontWeight: "500" }}>✕</Text>
    ) : (
      <View style={{ width: slotW }} />
    );

  return (
    <View
      style={{
        minHeight: 48,
        paddingVertical: 8,
        paddingHorizontal: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: PAGE_BG,
      }}
    >
      <View style={{ width: slotW, alignItems: "flex-start", justifyContent: "center" }}>
        {leftNode}
      </View>
      <Text
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "700",
          color: TEXT,
          numberOfLines: 1,
          ellipsizeMode: "tail",
        }}
      >
        {title}
      </Text>
      <View style={{ width: slotW, alignItems: "flex-end", justifyContent: "center" }}>
        {rightSlot ?? <View />}
      </View>
    </View>
  );
}

/** 实验布局：左上角标注该屏说明，下接无圆角手机框 */
function LabScreenFrame({ screenTitle, children }: { screenTitle: string; children: ReactNode }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#475569",
          marginBottom: 8,
          alignSelf: "flex-start",
        }}
      >
        {screenTitle}
      </Text>
      {children}
    </View>
  );
}

function PhoneShell({ title, leftSlot = "none", rightSlot, children }: PhoneShellProps) {
  return (
    <View
      style={{
        width: PHONE_W,
        height: PHONE_H,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#e5e7eb",
        backgroundColor: PAGE_BG,
      }}
    >
      <StatusBar />
      <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
      <PhoneNavBar title={title} leftSlot={leftSlot} rightSlot={rightSlot} />
      <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function useViewportSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  }));

  useLayoutEffect(() => {
    const onResize = (): void => {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}

function PrimaryButton({ label, rightLabel }: { label: string; rightLabel?: string }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 18,
        backgroundColor: BRAND,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>{label}</Text>
      {rightLabel ? (
        <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>{rightLabel}</Text>
      ) : null}
    </View>
  );
}

/** 1 · 商品详情 */
function ProductDetailPage() {
  return (
    <LabScreenFrame screenTitle="商品详情 · Product">
      <PhoneShell title="Product" leftSlot="back">
        <ScrollView style={{ flex: 1 }}>
          <View style={{ width: "100%" }}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80",
              }}
              style={{ width: PHONE_CONTENT_W, height: 200 }}
              resizeMode="cover"
            />
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 20, fontWeight: "700", color: TEXT }}>
                    Naturel Red Apple
                  </Text>
                  <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>1kg, Price</Text>
                </View>
                <Text style={{ fontSize: 20, color: BRAND }}>♡</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, color: BRAND }}>−</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: TEXT }}>1</Text>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, color: BRAND }}>+</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "700", color: TEXT }}>$4.99</Text>
              </View>
              <View style={{ marginTop: 20 }}>
                <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
                <View style={{ paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT }}>
                    Product Detail
                  </Text>
                  <Text style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 18 }}>
                    Apples are nutritious. Apples may be good for weight loss, heart, and bone
                    health.
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT }}>Nutritions</Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: "#f1f5f9",
                  }}
                >
                  <Text style={{ fontSize: 11, color: MUTED }}>100gr</Text>
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT }}>Review</Text>
                <Text style={{ fontSize: 14, color: "#fbbf24", marginTop: 6 }}>★★★★★</Text>
              </View>
              <View style={{ height: 88 }} />
            </View>
          </View>
        </ScrollView>
        <PrimaryButton label="Add To Basket" />
      </PhoneShell>
    </LabScreenFrame>
  );
}

const CATEGORIES = [
  { title: "Fresh Fruits & Vegetable", bg: "#dcfce7" },
  { title: "Cooking Oil & Ghee", bg: "#ffedd5" },
  { title: "Meat & Fish", bg: "#fce7f3" },
  { title: "Bakery & Snacks", bg: "#f3e8ff" },
  { title: "Dairy & Eggs", bg: "#fef9c3" },
  { title: "Beverages", bg: "#dbeafe" },
];

/** 2 · 探索分类 */
function ExplorePage() {
  return (
    <LabScreenFrame screenTitle="分类探索 · Explore">
      <PhoneShell title="Explore" leftSlot="none">
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
            <View
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: "#f1f5f9",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: MUTED }}>🔍 Search Store</Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: 12,
                paddingBottom: 72,
                justifyContent: "space-between",
              }}
            >
              {CATEGORIES.map((c) => (
                <View
                  key={c.title}
                  style={{
                    width: (PHONE_CONTENT_W - 12 * 2 - 8) / 2,
                    marginBottom: 10,
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: c.bg,
                    minHeight: 88,
                    justifyContent: "flex-end",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: TEXT, lineHeight: 18 }}>
                    {c.title}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: PAGE_BG,
            }}
          >
            <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
            <View
              style={{
                flexDirection: "row",
                paddingVertical: 10,
                paddingHorizontal: 8,
                justifyContent: "space-around",
              }}
            >
              {[
                { icon: "🏪", label: "Shop", active: false },
                { icon: "🔍", label: "Explore", active: true },
                { icon: "🛒", label: "Cart", active: false },
                { icon: "♡", label: "Fav", active: false },
                { icon: "👤", label: "Account", active: false },
              ].map((t) => (
                <View key={t.label} style={{ alignItems: "center", minWidth: 52 }}>
                  <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      fontWeight: t.active ? "700" : "500",
                      color: t.active ? BRAND : MUTED,
                    }}
                  >
                    {t.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </PhoneShell>
    </LabScreenFrame>
  );
}

const BEVERAGES = [
  { name: "Diet Coke", info: "355ml, Price", price: "$1.99" },
  { name: "Sprite Can", info: "325ml, Price", price: "$1.50" },
  { name: "Apple & Grape Juice", info: "2L, Price", price: "$15.99" },
  { name: "Orange Juice", info: "2L, Price", price: "$15.99" },
  { name: "Coca Cola Can", info: "325ml, Price", price: "$4.99" },
  { name: "Pepsi Can", info: "330ml, Price", price: "$4.99" },
];

function ProductCardMini({
  name,
  info,
  price,
  tint,
}: {
  name: string;
  info: string;
  price: string;
  tint: string;
}) {
  return (
    <View
      style={{
        width: (PHONE_CONTENT_W - 16 * 2 - 10) / 2,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <View
        style={{
          height: 100,
          borderRadius: 12,
          backgroundColor: tint,
          marginBottom: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 28 }}>🥤</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: TEXT, numberOfLines: 2 }}>{name}</Text>
      <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{info}</Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT }}>{price}</Text>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: BRAND,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>+</Text>
        </View>
      </View>
    </View>
  );
}

/** 3 · 饮料分类 */
function BeveragesPage() {
  const tints = ["#e0f2fe", "#fef3c7", "#fce7f3", "#ffedd5", "#dbeafe", "#f3e8ff"];
  return (
    <LabScreenFrame screenTitle="饮料 · Beverages">
      <PhoneShell title="Beverages" leftSlot="back" rightSlot={<FilterSlidersIcon />}>
        <ScrollView style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              paddingHorizontal: 16,
              paddingBottom: 20,
              justifyContent: "space-between",
            }}
          >
            {BEVERAGES.map((p, i) => (
              <ProductCardMini key={p.name} {...p} tint={tints[i % tints.length]} />
            ))}
          </View>
        </ScrollView>
      </PhoneShell>
    </LabScreenFrame>
  );
}

const EGG_RESULTS = [
  { name: "Egg Chicken Red", info: "4pcs, Price", price: "$1.99" },
  { name: "Egg Chicken White", info: "4pcs, Price", price: "$1.99" },
  { name: "Egg Pasta", info: "500g, Price", price: "$2.49" },
  { name: "Egg Noodles", info: "300g, Price", price: "$1.49" },
  { name: "Mayonnais Eggless", info: "250ml, Price", price: "$2.99" },
];

/** 4 · 搜索 */
function SearchPage() {
  const tints = ["#fef9c3", "#fef9c3", "#ffedd5", "#e0f2fe", "#f3e8ff"];
  return (
    <LabScreenFrame screenTitle="搜索 · Search">
      <PhoneShell title="Search" leftSlot="none">
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor: "#f1f5f9",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 14, color: TEXT }}>Egg</Text>
              <Text style={{ fontSize: 14, color: MUTED }}>⚙</Text>
            </View>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              paddingHorizontal: 16,
              paddingBottom: 20,
              justifyContent: "space-between",
            }}
          >
            {EGG_RESULTS.map((p, i) => (
              <ProductCardMini key={p.name} {...p} tint={tints[i % tints.length]} />
            ))}
          </View>
        </ScrollView>
      </PhoneShell>
    </LabScreenFrame>
  );
}

/** 5 · 筛选 */
function FiltersPage() {
  return (
    <LabScreenFrame screenTitle="筛选 · Filters">
      <PhoneShell title="Filters" leftSlot="close">
        <ScrollView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT, marginBottom: 12 }}>
              Categories
            </Text>
            {["Eggs", "Noodles & Pasta", "Chips & Crisps", "Fast Food"].map((label, i) => (
              <View
                key={label}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
              >
                <Text style={{ fontSize: 16, color: i === 0 ? BRAND : MUTED }}>
                  {i === 0 ? "☑" : "☐"}
                </Text>
                <Text style={{ fontSize: 14, color: TEXT, marginLeft: 10 }}>{label}</Text>
              </View>
            ))}
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: TEXT,
                marginTop: 16,
                marginBottom: 12,
              }}
            >
              Brand
            </Text>
            {["Individual Collection", "Cocola", "Ifad", "Kazi Farmas"].map((label, i) => (
              <View
                key={label}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
              >
                <Text style={{ fontSize: 16, color: i === 1 ? BRAND : MUTED }}>
                  {i === 1 ? "☑" : "☐"}
                </Text>
                <Text style={{ fontSize: 14, color: TEXT, marginLeft: 10 }}>{label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <PrimaryButton label="Apply Filter" />
      </PhoneShell>
    </LabScreenFrame>
  );
}

const CART_ITEMS = [
  { name: "Bell Pepper Red", info: "1kg, Price", price: "$4.99", emoji: "🫑" },
  { name: "Egg Chicken Red", info: "4pcs, Price", price: "$1.99", emoji: "🥚" },
  { name: "Organic Bananas", info: "7pcs, Price", price: "$3.00", emoji: "🍌" },
  { name: "Ginger", info: "250g, Price", price: "$2.99", emoji: "🫚" },
];

/** 6 · 购物车 */
function CartPage() {
  return (
    <LabScreenFrame screenTitle="购物车 · My Cart">
      <PhoneShell title="My Cart" leftSlot="none">
        <ScrollView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {CART_ITEMS.map((item, index) => (
              <View key={item.name}>
                <View
                  style={{
                    flexDirection: "row",
                    paddingVertical: 12,
                  }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      backgroundColor: "#f8fafc",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT, flex: 1 }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: MUTED }}>✕</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{item.info}</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ color: BRAND, fontSize: 16 }}>−</Text>
                        <Text style={{ fontSize: 14, fontWeight: "600" }}>1</Text>
                        <Text style={{ color: BRAND, fontSize: 16 }}>+</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT }}>
                        {item.price}
                      </Text>
                    </View>
                  </View>
                </View>
                {index < CART_ITEMS.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
        <PrimaryButton label="Go to Checkout" rightLabel="$12.96" />
      </PhoneShell>
    </LabScreenFrame>
  );
}

const FAV_ITEMS = BEVERAGES.slice(0, 5);

/** 7 · 收藏 */
function FavoritesPage() {
  return (
    <LabScreenFrame screenTitle="收藏 · Favourite">
      <PhoneShell title="Favourite" leftSlot="none">
        <ScrollView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            {FAV_ITEMS.map((item, index) => (
              <View key={item.name}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      backgroundColor: "#e0f2fe",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>🥤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{item.info}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: TEXT, marginRight: 8 }}>
                    {item.price}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 14 }}>›</Text>
                </View>
                {index < FAV_ITEMS.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: "#f1f5f9" }} />
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
        <PrimaryButton label="Add All To Cart" />
      </PhoneShell>
    </LabScreenFrame>
  );
}

function LabCanvas({
  width,
  height,
  canvasRef,
  viewport,
  setViewport,
}: {
  width: number;
  height: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewport: ViewportState;
  setViewport: Dispatch<SetStateAction<ViewportState>>;
}) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const [inspector, setInspector] = useState<InspectorState>({
    hoverNode: null,
    scopeStack: [],
  });

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const detachViewport = attachViewportHandlers(el, {
      logicalWidth: w,
      logicalHeight: h,
      setState: setViewport,
    });
    const detachInspector = attachInspectorHandlers(el, {
      logicalWidth: w,
      logicalHeight: h,
      onStateChange: setInspector,
    });
    return () => {
      detachViewport();
      detachInspector();
    };
  }, [canvasRef, w, h, setViewport]);

  return (
    <>
      <Canvas width={w} height={h} canvasRef={canvasRef} camera={viewport}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              alignContent: "center",
              padding: 20,
              gap: 20,
              backgroundColor: "#f1f5f9",
            }}
          >
            <ProductDetailPage />
            <ExplorePage />
            <BeveragesPage />
            <SearchPage />
            <FiltersPage />
            <CartPage />
            <FavoritesPage />
          </View>
        </View>
      </Canvas>
      <InspectorHighlight
        canvasRef={canvasRef}
        node={inspector.hoverNode}
        logicalWidth={w}
        logicalHeight={h}
        cameraRevision={viewport}
        className="z-[80] border-2 border-[var(--sl-color-accent)]"
      />
    </>
  );
}

/**
 * 全屏单 Canvas：内嵌多个手机画幅「子页面」（生鲜电商设计稿风格）。
 * 路由：`/mobile-app-lab`（无 Starlight 文档壳）。
 */
export function MobileAppLab() {
  const { w, h } = useViewportSize();
  const [viewport, setViewport] = useViewportState();
  const canvasDomRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="fixed inset-0 box-border overflow-hidden bg-slate-100 text-[var(--sl-color-text)]">
      <a
        className="absolute right-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-sm text-[var(--sl-color-accent)] shadow-sm underline-offset-2 hover:underline"
        href="/"
      >
        文档首页
      </a>
      <p className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(100%,22rem)] text-xs leading-snug text-[var(--sl-color-gray-3)]">
        按住
        Cmd（Windows：Ctrl）时可滚轮缩放或左键拖拽平移；松开修饰键即不可。悬停显示节点描边；双击进入子层选择；Esc
        退出层级
      </p>
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--sl-color-red)]">
                画布加载失败：{error.message}
              </div>
            );
          }
          if (!isReady) {
            return (
              <div className="flex h-full items-center justify-center text-sm text-[var(--sl-color-gray-3)]">
                正在加载 Yoga + CanvasKit…
              </div>
            );
          }
          return (
            <div className="[&_canvas]:block h-full w-full [&_canvas]:h-full [&_canvas]:w-full">
              <LabCanvas
                width={w}
                height={h}
                canvasRef={canvasDomRef}
                viewport={viewport}
                setViewport={setViewport}
              />
            </div>
          );
        }}
      </CanvasProvider>
    </div>
  );
}
