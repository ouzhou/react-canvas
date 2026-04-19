import {
  CanvasProvider,
  Canvas,
  View,
  Text,
  ScrollView,
  Image,
  SvgPath,
} from "@react-canvas/react-v2";
import { useRef } from "react";
import { useJuejinIndex2Rain } from "../hooks/use-juejin-index2-rain.ts";
import { useViewportSize } from "../smoke/hooks/use-viewport-size";
import localParagraphFontUrl from "../assets/NotoSansSC-Regular.otf?url";

export const JuejinPage = () => {
  const { vw, vh } = useViewportSize();
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const rainOverlayRef = useRef<HTMLDivElement>(null);
  const loadingBarAnimation = "juejin-loading-bar 1.2s ease-in-out infinite";

  useJuejinIndex2Rain(rainOverlayRef, vw, vh, true);

  return (
    <>
      <CanvasProvider initOptions={{ defaultParagraphFontUrl: localParagraphFontUrl }}>
        {({ isReady, runtime, initError }) => {
          if (initError) {
            return <div>Error loading canvas</div>;
          }
          if (!isReady || !runtime) {
            return (
              <div
                style={{
                  width: vw,
                  height: vh,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f4f5f5",
                }}
              >
                <style>
                  {`@keyframes juejin-loading-bar {
                  0% { transform: scaleX(0.25); opacity: 0.5; }
                  50% { transform: scaleX(1); opacity: 1; }
                  100% { transform: scaleX(0.25); opacity: 0.5; }
                }`}
                </style>
                <div
                  style={{
                    width: 240,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#4e5969" }}>Loading...</div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      backgroundColor: "#e5e6eb",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#1e80ff",
                        transformOrigin: "left center",
                        animation: loadingBarAnimation,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div ref={canvasAreaRef} style={{ width: vw, height: vh, position: "relative" }}>
              <Canvas
                width={vw}
                height={vh}
                paragraphFontProvider={runtime.paragraphFontProvider}
                defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
              >
                <View
                  style={{
                    width: vw,
                    height: vh,
                    backgroundColor: "#f4f5f5",
                    flexDirection: "column",
                  }}
                >
                  {/* Header */}
                  <View
                    style={{
                      width: vw,
                      height: 60,
                      backgroundColor: "#ffffff",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: Math.max(24, (vw - 1440) / 2 + 24),
                      paddingRight: Math.max(24, (vw - 1440) / 2 + 24),
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 1,
                        backgroundColor: "#f1f1f1",
                      }}
                    />
                    <View style={{ flexDirection: "row", alignItems: "center", height: "100%" }}>
                      <View
                        style={{ marginRight: 24, cursor: "pointer", justifyContent: "center" }}
                      >
                        <Image
                          uri="https://lf3-cdn-tos.bytescm.com/obj/static/xitu_juejin_web/e08da34488b114bd4c665ba2fa520a31.svg"
                          style={{ width: 107, height: 22 }}
                        />
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", height: "100%" }}>
                        {["首页", "沸点", "课程", "数据指南", "AI Coding", "更多"].map(
                          (item, index) => {
                            const isActive = index === 0;
                            return (
                              <View
                                key={item}
                                style={() => ({
                                  paddingLeft: 16,
                                  paddingRight: 16,
                                  height: "100%",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                })}
                              >
                                <Text
                                  style={{
                                    fontSize: 14,
                                    color: isActive ? "#1e80ff" : "#515767",
                                    fontWeight: isActive ? 600 : 400,
                                  }}
                                >
                                  {item}
                                </Text>
                                {isActive && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      bottom: 0,
                                      left: 16,
                                      right: 16,
                                      height: 2,
                                      backgroundColor: "#1e80ff",
                                    }}
                                  />
                                )}
                                {item === "AI Coding" && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      top: 8,
                                      right: 0,
                                      backgroundColor: "#f53f3f",
                                      paddingLeft: 4,
                                      paddingRight: 4,
                                      paddingTop: 2,
                                      paddingBottom: 2,
                                      borderRadius: 2,
                                    }}
                                  >
                                    <Text style={{ color: "#ffffff", fontSize: 10, lineHeight: 1 }}>
                                      HOT
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          },
                        )}
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      {/* Search */}
                      <View
                        style={{
                          width: 240,
                          height: 32,
                          backgroundColor: "#f2f3f5",
                          borderRadius: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          paddingLeft: 16,
                          paddingRight: 12,
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: "#86909c" }}>探索稀土掘金</Text>
                        <View style={{ width: 16, height: 16 }}>
                          <SvgPath
                            d="M11.3333 11.3333L14.6667 14.6667M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z"
                            stroke="#86909c"
                            strokeWidth={1.5}
                            viewBox="0 0 16 16"
                            style={{ width: 16, height: 16 }}
                          />
                        </View>
                      </View>

                      {/* Creator Center Button */}
                      <View
                        style={({ hovered }) => ({
                          height: 32,
                          paddingLeft: 16,
                          paddingRight: 16,
                          backgroundColor: hovered ? "#1171ee" : "#1e80ff",
                          borderRadius: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          cursor: "pointer",
                        })}
                      >
                        <Text style={{ color: "#ffffff", fontSize: 14 }}>创作者中心</Text>
                        <View style={{ width: 12, height: 12, marginLeft: 4 }}>
                          <SvgPath
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            viewBox="0 0 12 12"
                            style={{ width: 12, height: 12 }}
                          />
                        </View>
                      </View>

                      {/* Bell Icon */}
                      <View style={{ width: 24, height: 24, cursor: "pointer" }}>
                        <SvgPath
                          d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
                          fill="#86909c"
                          viewBox="0 0 24 24"
                          style={{ width: 24, height: 24 }}
                        />
                      </View>

                      {/* Avatar */}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "#ffcf00",
                          borderWidth: 1,
                          borderColor: "#e5e6eb",
                          cursor: "pointer",
                        }}
                      />
                    </View>
                  </View>

                  {/* Main Content */}
                  <ScrollView style={{ flex: 1, width: vw }}>
                    <View
                      style={{
                        width: Math.min(1200, vw),
                        alignSelf: "center",
                        flexDirection: "row",
                        paddingTop: 12,
                        paddingLeft: 16,
                        paddingRight: 16,
                      }}
                    >
                      {/* Left Sidebar */}
                      {vw >= 1024 && (
                        <View style={{ width: 180, flexShrink: 0, marginRight: 16 }}>
                          <View
                            style={{
                              backgroundColor: "#ffffff",
                              borderRadius: 4,
                              paddingTop: 8,
                              paddingBottom: 8,
                              flexDirection: "column",
                            }}
                          >
                            {[
                              {
                                label: "关注",
                                icon: "M8 2L2 6V14H6V10H10V14H14V6L8 2Z",
                                color: "#86909c",
                              },
                              {
                                label: "综合",
                                icon: "M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2ZM8 12.5C5.51472 12.5 3.5 10.4853 3.5 8C3.5 5.51472 5.51472 3.5 8 3.5C10.4853 3.5 12.5 5.51472 12.5 8C12.5 10.4853 10.4853 12.5 8 12.5Z",
                                color: "#1e80ff",
                                active: true,
                              },
                              { label: "后端", textIcon: "后端" },
                              { label: "前端", textIcon: "前端" },
                              { label: "Android", textIcon: "安" },
                              { label: "iOS", textIcon: "iO" },
                              { label: "人工智能", textIcon: "AI" },
                              { label: "开发工具", textIcon: "开" },
                              { label: "代码人生", textIcon: "代" },
                              { label: "阅读", textIcon: "阅" },
                              { divider: true },
                              {
                                label: "排行榜",
                                icon: "M8 1L10.163 5.38197L15 6.09017L11.5 9.50492L12.326 14.3098L8 12.0361L3.674 14.3098L4.5 9.50492L1 6.09017L5.837 5.38197L8 1Z",
                                color: "#ffcf00",
                              },
                            ].map((item, index) => {
                              if (item.divider) {
                                return (
                                  <View
                                    key={`div-${index}`}
                                    style={{
                                      height: 1,
                                      backgroundColor: "#f1f1f1",
                                      marginLeft: 16,
                                      marginRight: 16,
                                      marginTop: 8,
                                      marginBottom: 8,
                                    }}
                                  />
                                );
                              }
                              return (
                                <View
                                  key={item.label}
                                  style={({ hovered }) => ({
                                    flexDirection: "row",
                                    alignItems: "center",
                                    paddingLeft: 16,
                                    paddingRight: 16,
                                    paddingTop: 8,
                                    paddingBottom: 8,
                                    marginLeft: 8,
                                    marginRight: 8,
                                    marginBottom: 4,
                                    borderRadius: 4,
                                    backgroundColor: item.active
                                      ? "#eaf2ff"
                                      : hovered
                                        ? "#f2f3f5"
                                        : "transparent",
                                    cursor: "pointer",
                                  })}
                                >
                                  <View
                                    style={{
                                      width: 24,
                                      height: 24,
                                      marginRight: 12,
                                      justifyContent: "center",
                                      alignItems: "center",
                                    }}
                                  >
                                    {item.icon ? (
                                      <SvgPath
                                        d={item.icon}
                                        fill={item.color}
                                        viewBox="0 0 16 16"
                                        style={{ width: 16, height: 16 }}
                                      />
                                    ) : (
                                      <Text style={{ fontSize: 12, color: "#86909c" }}>
                                        {item.textIcon}
                                      </Text>
                                    )}
                                  </View>
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: item.active ? "#1e80ff" : "#515767",
                                      fontWeight: item.active ? 600 : 400,
                                    }}
                                  >
                                    {item.label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Feed List */}
                      <View style={{ flex: 1, maxWidth: 720 }}>
                        <View
                          style={{ backgroundColor: "#ffffff", borderRadius: 4, marginBottom: 8 }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingLeft: 16,
                              paddingRight: 16,
                              paddingTop: 12,
                              paddingBottom: 12,
                            }}
                          >
                            <View
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: 16,
                                right: 16,
                                height: 1,
                                backgroundColor: "#f1f1f1",
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                color: "#1e80ff",
                                fontWeight: 600,
                                marginRight: 24,
                              }}
                            >
                              推荐
                            </Text>
                            <Text style={{ fontSize: 14, color: "#86909c" }}>最新</Text>
                          </View>

                          {/* Articles */}
                          <View style={{ flexDirection: "column" }}>
                            {[
                              {
                                author: "汉秋",
                                time: "1天前",
                                tag: "前端",
                                title: "iOS 自定义 UICollectionView 拼图布局 + 布局切换动画实践",
                                desc: "🧩 iOS 自定义 UICollectionView 拼图布局 + 布局切换动画实践 🚀 一、为什么自定义布局？ 系统的...",
                                views: "77",
                                likes: "点赞",
                              },
                              {
                                author: "程序员大叔",
                                time: "1天前",
                                tag: "前端",
                                title: "写给年轻程序员的几点建议",
                                desc: "本人快 40 岁了。第一份工作是做网站编辑，那时候开始接触 jQuery，后来转做前端，一直做...",
                                views: "7.7k",
                                likes: "138",
                                coverColor: "#22c55e",
                                coverText: "如何写出优雅的代码",
                              },
                              {
                                author: "前端开发爱好者",
                                time: "2天前",
                                tag: "前端 · JavaScript · Vue.js",
                                title: "90% 前端都不知道的 20 个「零依赖」浏览器原生能力！",
                                desc: "分享 20 个 2025 年依旧「少人知道、却能立竿见影」的浏览器 API。收藏 = 省下一个工具库 +...",
                                views: "14k",
                                likes: "307",
                                coverColor: "#1e3a8a",
                                coverText: "Vue",
                              },
                              {
                                author: "力少",
                                time: "2天前",
                                tag: "前端 · AI 编程",
                                title: "这可能是程序员商用AI赚钱最容易的一个机会了",
                                desc: "这可能是程序员商用AI赚钱最容易的一个机会了！AI 发展太快了，如果你离开关注 AI 报道，一定会发现一个趋势：AI 的...",
                                views: "2.9k",
                                likes: "12",
                              },
                              {
                                author: "日月之行_",
                                time: "3天前",
                                tag: "前端",
                                title: "codeReview不再头疼，AI代码审查让你的MR质量瞬间提升！",
                                desc: "为什么需要AI做codeReview？ 在快节奏的软件开发中，代码审查往往是影响交付速度的瓶颈...",
                                views: "1.7k",
                                likes: "8",
                                coverColor: "#1f2937",
                                coverText: "Code Review",
                              },
                              {
                                author: "404星球的猫",
                                time: "3天前",
                                tag: "前端 · JavaScript · 面试",
                                title: "别再滥用 Base64 了——Blob 才是前端减负的正经姿势",
                                desc: "前端开发的涨薪密码：二进制神器Blob，轻松实现本地预览、零上传下载、内存流式处理，一文...",
                                views: "14k",
                                likes: "212",
                                coverColor: "#dbeafe",
                                coverText: "Blob",
                                coverTextColor: "#1e40af",
                              },
                            ].map((article, index) => (
                              <View
                                key={index}
                                style={({ hovered }) => ({
                                  padding: 16,
                                  backgroundColor: hovered ? "#fafafa" : "#ffffff",
                                  cursor: "pointer",
                                })}
                              >
                                {index !== 5 && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      bottom: 0,
                                      left: 16,
                                      right: 16,
                                      height: 1,
                                      backgroundColor: "#f1f1f1",
                                    }}
                                  />
                                )}
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <Text style={{ fontSize: 13, color: "#4e5969" }}>
                                    {article.author}
                                  </Text>
                                  <View
                                    style={{
                                      width: 1,
                                      height: 12,
                                      backgroundColor: "#e5e6eb",
                                      marginLeft: 8,
                                      marginRight: 8,
                                    }}
                                  />
                                  <Text style={{ fontSize: 13, color: "#86909c" }}>
                                    {article.time}
                                  </Text>
                                  <View
                                    style={{
                                      width: 1,
                                      height: 12,
                                      backgroundColor: "#e5e6eb",
                                      marginLeft: 8,
                                      marginRight: 8,
                                    }}
                                  />
                                  <Text style={{ fontSize: 13, color: "#86909c" }}>
                                    {article.tag}
                                  </Text>
                                </View>
                                <View
                                  style={{ flexDirection: "row", justifyContent: "space-between" }}
                                >
                                  <View
                                    style={{ flex: 1, paddingRight: 16, flexDirection: "column" }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: "#1d2129",
                                        marginBottom: 4,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {article.title}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 13,
                                        color: "#86909c",
                                        marginBottom: 12,
                                        lineHeight: 1.6,
                                      }}
                                    >
                                      {article.desc}
                                    </Text>
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 16,
                                      }}
                                    >
                                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <SvgPath
                                          d="M8 3C3.5 3 1 8 1 8s2.5 5 7 5 7-5 7-5-2.5-5-7-5zm0 8.5c-1.93 0-3.5-1.57-3.5-3.5S6.07 4.5 8 4.5 11.5 6.07 11.5 8 9.93 11.5 8 11.5z"
                                          fill="#86909c"
                                          viewBox="0 0 16 16"
                                          style={{ width: 16, height: 16, marginRight: 4 }}
                                        />
                                        <Text style={{ fontSize: 13, color: "#86909c" }}>
                                          {article.views}
                                        </Text>
                                      </View>
                                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                                        <SvgPath
                                          d="M11.5 3h-7C3.67 3 3 3.67 3 4.5v7c0 .83.67 1.5 1.5 1.5h7c.83 0 1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zM8 11.5c-1.93 0-3.5-1.57-3.5-3.5S6.07 4.5 8 4.5 11.5 6.07 11.5 8 9.93 11.5 8 11.5z"
                                          fill="#86909c"
                                          viewBox="0 0 16 16"
                                          style={{ width: 16, height: 16, marginRight: 4 }}
                                        />
                                        <Text style={{ fontSize: 13, color: "#86909c" }}>
                                          {article.likes}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                  {article.coverColor && (
                                    <View
                                      style={{
                                        width: 120,
                                        height: 80,
                                        borderRadius: 4,
                                        backgroundColor: article.coverColor,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          color: article.coverTextColor || "#ffffff",
                                          fontSize: 12,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {article.coverText}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Right Sidebar */}
                      {vw >= 1280 && (
                        <View
                          style={{
                            width: 260,
                            flexShrink: 0,
                            marginLeft: 16,
                            flexDirection: "column",
                          }}
                        >
                          {/* Sign In Card */}
                          <View
                            style={{
                              backgroundColor: "#ffffff",
                              borderRadius: 4,
                              padding: 16,
                              marginBottom: 16,
                              flexDirection: "column",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 12,
                              }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: 600, color: "#1d2129" }}>
                                下午好！
                              </Text>
                              <View
                                style={({ hovered }) => ({
                                  paddingLeft: 16,
                                  paddingRight: 16,
                                  paddingTop: 6,
                                  paddingBottom: 6,
                                  borderWidth: 1,
                                  borderColor: "#1e80ff",
                                  borderRadius: 4,
                                  backgroundColor: hovered ? "#eaf2ff" : "transparent",
                                  cursor: "pointer",
                                })}
                              >
                                <Text style={{ fontSize: 14, color: "#1e80ff" }}>去签到</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 12, color: "#86909c" }}>
                              点亮在社区的每一天
                            </Text>
                          </View>

                          {/* Articles Ranking */}
                          <View
                            style={{
                              backgroundColor: "#ffffff",
                              borderRadius: 4,
                              padding: 16,
                              marginBottom: 16,
                              flexDirection: "column",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 16,
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    backgroundColor: "#ffcf00",
                                    borderRadius: 10,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginRight: 8,
                                  }}
                                >
                                  <Text style={{ color: "#ffffff", fontSize: 12 }}>榜</Text>
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: 600, color: "#1d2129" }}>
                                  文章榜
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <SvgPath
                                  d="M13.6 8.4H8.4V13.6H7.6V8.4H2.4V7.6H7.6V2.4H8.4V7.6H13.6V8.4Z"
                                  fill="#86909c"
                                  viewBox="0 0 16 16"
                                  style={{ width: 12, height: 12, marginRight: 4 }}
                                />
                                <Text style={{ fontSize: 13, color: "#86909c" }}>换一换</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: "column", gap: 16 }}>
                              {[
                                {
                                  num: "1",
                                  color: "#f53f3f",
                                  title: "别让压图压垮首帧：系统 Pick...",
                                },
                                {
                                  num: "2",
                                  color: "#ff7d00",
                                  title: "XChat 为什么选择 Rust 语言...",
                                },
                                {
                                  num: "3",
                                  color: "#ffcf00",
                                  title: "HTML-in-Canvas：让 Canvas...",
                                },
                                {
                                  num: "4",
                                  color: "#86909c",
                                  title: "从考研到前端转型AI agent直...",
                                },
                                {
                                  num: "5",
                                  color: "#86909c",
                                  title: "我的 2026 全栈选型：Vue3 +...",
                                },
                              ].map((item) => (
                                <View
                                  key={item.num}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: item.color,
                                      fontSize: 14,
                                      fontWeight: 600,
                                      fontStyle: "italic",
                                      width: 20,
                                    }}
                                  >
                                    {item.num}
                                  </Text>
                                  <Text style={{ color: "#1d2129", fontSize: 14 }}>
                                    {item.title}
                                  </Text>
                                </View>
                              ))}
                            </View>
                            <View
                              style={{
                                marginTop: 16,
                                paddingTop: 12,
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <View
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: 1,
                                  backgroundColor: "#f1f1f1",
                                }}
                              />
                              <Text style={{ fontSize: 13, color: "#86909c" }}>查看更多 &gt;</Text>
                            </View>
                          </View>

                          {/* Banners */}
                          <View style={{ flexDirection: "column", gap: 16, marginBottom: 16 }}>
                            <View
                              style={{
                                height: 100,
                                borderRadius: 4,
                                backgroundColor: "#3b82f6",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: 600 }}>
                                沸点周刊
                              </Text>
                            </View>
                            <View
                              style={{
                                height: 100,
                                borderRadius: 4,
                                backgroundColor: "#fef3c7",
                                borderWidth: 1,
                                borderColor: "#fde68a",
                                justifyContent: "center",
                                alignItems: "center",
                                flexDirection: "column",
                                cursor: "pointer",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#2563eb",
                                  fontSize: 16,
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                五一计划
                              </Text>
                              <Text style={{ color: "#374151", fontSize: 14 }}>发沸点 领矿石</Text>
                            </View>
                            <View
                              style={{
                                height: 100,
                                borderRadius: 4,
                                backgroundColor: "#eff6ff",
                                borderWidth: 1,
                                borderColor: "#bfdbfe",
                                justifyContent: "center",
                                alignItems: "center",
                                flexDirection: "column",
                                cursor: "pointer",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#2563eb",
                                  fontSize: 16,
                                  fontWeight: 600,
                                  marginBottom: 4,
                                }}
                              >
                                万物皆可Skill
                              </Text>
                              <Text style={{ color: "#374151", fontSize: 14 }}>发沸点 领矿石</Text>
                            </View>
                          </View>

                          {/* Authors Ranking */}
                          <View
                            style={{
                              backgroundColor: "#ffffff",
                              borderRadius: 4,
                              padding: 16,
                              flexDirection: "column",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 16,
                              }}
                            >
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: "#1e80ff",
                                  borderRadius: 10,
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 8,
                                }}
                              >
                                <Text style={{ color: "#ffffff", fontSize: 12 }}>作</Text>
                              </View>
                              <Text style={{ fontSize: 16, fontWeight: 600, color: "#1d2129" }}>
                                作者榜
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  backgroundColor: "#bfdbfe",
                                  marginRight: 12,
                                }}
                              />
                              <View style={{ flexDirection: "column" }}>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    color: "#1d2129",
                                    fontWeight: 600,
                                    marginBottom: 4,
                                  }}
                                >
                                  风象雨
                                </Text>
                                <Text style={{ fontSize: 12, color: "#86909c" }}>
                                  前端工程师 @ 字节跳动
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </ScrollView>

                  {/* Floating Action Buttons */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 32,
                      right: 32,
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <View
                      style={() => ({
                        width: 40,
                        height: 40,
                        backgroundColor: "#ffffff",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: "#e5e6eb",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                    >
                      <SvgPath
                        d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3C14.7536 3.00311 16.9135 3.89973 18.507 5.49301C20.1003 7.0863 20.9969 9.24641 21 11.5Z"
                        stroke="#86909c"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        style={{ width: 20, height: 20 }}
                      />
                    </View>
                    <View
                      style={() => ({
                        width: 40,
                        height: 40,
                        backgroundColor: "#ffffff",
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: "#e5e6eb",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                    >
                      <SvgPath
                        d="M5 12H19M12 5L12 19"
                        stroke="#86909c"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                        style={{ width: 20, height: 20, transform: [{ rotate: "45deg" }] }}
                      />
                    </View>
                  </View>
                </View>
              </Canvas>
            </div>
          );
        }}
      </CanvasProvider>
      <div
        ref={rainOverlayRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: vw,
          height: vh,
          zIndex: 1000,
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </>
  );
};
