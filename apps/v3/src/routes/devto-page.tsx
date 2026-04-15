import { CanvasProvider, Canvas, View, Text, ScrollView, SvgPath } from "@react-canvas/react-v2";
import { useCallback, useRef } from "react";
import { useGlassLensPostProcess } from "../hooks/use-glass-lens-post-process.ts";
import { useViewportSize } from "../smoke/hooks/use-viewport-size";
import localParagraphFontUrl from "../assets/NotoSansSC-Regular.otf?url";

export const DevToPage = () => {
  const { vw, vh } = useViewportSize();
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const postProcess = useGlassLensPostProcess(canvasAreaRef, { radius: 120, lerp: 0.15 });
  const loadingBarAnimation = "devto-loading-bar 1.2s ease-in-out infinite";
  const onPostProcessDisabled = useCallback((reason: "software-surface" | "compile-failed") => {
    console.warn("[devto] SkSL post-process disabled:", reason);
  }, []);

  return (
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
                backgroundColor: "#f5f5f5",
              }}
            >
              <style>
                {`@keyframes devto-loading-bar {
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
                <div style={{ fontSize: 15, fontWeight: 500, color: "#404040" }}>Loading...</div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    backgroundColor: "#d4d4d4",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#3b49df",
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
              postProcess={postProcess}
              onPostProcessDisabled={onPostProcessDisabled}
            >
              <View
                style={{
                  width: vw,
                  height: vh,
                  backgroundColor: "#f5f5f5",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <View
                  style={{
                    width: vw,
                    height: 56,
                    backgroundColor: "#ffffff",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingLeft: Math.max(16, (vw - 1280) / 2 + 16),
                    paddingRight: Math.max(16, (vw - 1280) / 2 + 16),
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: "#d4d4d4",
                    }}
                  />

                  <View style={{ flexDirection: "row", alignItems: "center", height: "100%" }}>
                    {/* Logo */}
                    <View
                      style={{
                        width: 50,
                        height: 40,
                        backgroundColor: "#000000",
                        borderRadius: 3,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 16,
                        cursor: "pointer",
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: 700 }}>DEV</Text>
                    </View>

                    {/* Search Bar */}
                    <View
                      style={{
                        width: 420,
                        height: 40,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderColor: "#d4d4d4",
                        borderRadius: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingLeft: 8,
                        paddingRight: 8,
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <SvgPath
                          d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"
                          fill="#404040"
                          viewBox="0 0 24 24"
                          style={{ width: 24, height: 24, marginRight: 8 }}
                        />
                        <Text style={{ fontSize: 16, color: "#a3a3a3" }}>Search...</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: "#a3a3a3" }}>Powered by Algolia</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    {/* Create Post Button */}
                    <View
                      style={({ hovered }) => ({
                        height: 40,
                        paddingLeft: 16,
                        paddingRight: 16,
                        backgroundColor: hovered ? "#3b49df" : "transparent",
                        borderWidth: 1,
                        borderColor: "#3b49df",
                        borderRadius: 6,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                      })}
                    >
                      <Text
                        style={({ hovered }) => ({
                          color: hovered ? "#ffffff" : "#3b49df",
                          fontSize: 16,
                          fontWeight: 600,
                        })}
                      >
                        Create Post
                      </Text>
                    </View>

                    {/* Bell Icon */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        borderRadius: 20,
                      }}
                    >
                      <SvgPath
                        d="M12 22a2.98 2.98 0 0 0 2.818-2H9.182A2.98 2.98 0 0 0 12 22zm7-7.414V10c0-3.217-2.185-5.927-5.145-6.742C13.562 2.52 12.846 2 12 2s-1.562.52-1.855 1.258C7.184 4.073 5 6.783 5 10v4.586l-1.707 1.707A.996.996 0 0 0 3 17v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a.996.996 0 0 0-.293-.707L19 14.586z"
                        fill="#404040"
                        viewBox="0 0 24 24"
                        style={{ width: 24, height: 24 }}
                      />
                    </View>

                    {/* Avatar */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#d4d4d4",
                        cursor: "pointer",
                      }}
                    />
                  </View>
                </View>

                {/* Main Content */}
                <ScrollView style={{ flex: 1, width: vw }}>
                  <View
                    style={{
                      width: Math.min(1280, vw),
                      alignSelf: "center",
                      flexDirection: "row",
                      paddingTop: 16,
                      paddingLeft: 16,
                      paddingRight: 16,
                    }}
                  >
                    {/* Left Sidebar */}
                    {vw >= 768 && (
                      <View style={{ width: 240, flexShrink: 0, marginRight: 16 }}>
                        <View style={{ flexDirection: "column", gap: 4 }}>
                          {[
                            { icon: "🏠", label: "Home", active: true },
                            { icon: "🚀", label: "DEV++" },
                            { icon: "📚", label: "Reading List" },
                            { icon: "📹", label: "Videos" },
                            { icon: "🎓", label: "DEV Education Tracks" },
                            { icon: "🏆", label: "DEV Challenges" },
                            { icon: "💡", label: "DEV Help" },
                            { icon: "❤️", label: "Advertise on DEV" },
                            { icon: "🏛️", label: "Organization Accounts" },
                            { icon: "✨", label: "DEV Showcase" },
                            { icon: "🤓", label: "About" },
                            { icon: "📯", label: "Contact" },
                            { icon: "🛍️", label: "Forem Shop" },
                            { icon: "🦖", label: "MLH" },
                          ].map((item) => (
                            <View
                              key={item.label}
                              style={({ hovered }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 8,
                                paddingBottom: 8,
                                borderRadius: 6,
                                backgroundColor: item.active
                                  ? "#ffffff"
                                  : hovered
                                    ? "rgba(59, 73, 223, 0.1)"
                                    : "transparent",
                                cursor: "pointer",
                              })}
                            >
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{item.icon}</Text>
                              <Text
                                style={({ hovered }) => ({
                                  fontSize: 16,
                                  color: item.active ? "#171717" : hovered ? "#3b49df" : "#404040",
                                  fontWeight: item.active ? 600 : 400,
                                })}
                              >
                                {item.label}
                              </Text>
                            </View>
                          ))}

                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: 600,
                              color: "#171717",
                              marginTop: 16,
                              marginBottom: 8,
                              paddingLeft: 8,
                            }}
                          >
                            Other
                          </Text>
                          {[
                            { icon: "👍", label: "Code of Conduct" },
                            { icon: "🤓", label: "Privacy Policy" },
                            { icon: "👀", label: "Terms of Use" },
                          ].map((item) => (
                            <View
                              key={item.label}
                              style={({ hovered }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 8,
                                paddingBottom: 8,
                                borderRadius: 6,
                                backgroundColor: hovered ? "rgba(59, 73, 223, 0.1)" : "transparent",
                                cursor: "pointer",
                              })}
                            >
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{item.icon}</Text>
                              <Text
                                style={({ hovered }) => ({
                                  fontSize: 16,
                                  color: hovered ? "#3b49df" : "#404040",
                                })}
                              >
                                {item.label}
                              </Text>
                            </View>
                          ))}

                          <View
                            style={{
                              flexDirection: "row",
                              gap: 16,
                              paddingLeft: 8,
                              marginTop: 16,
                              marginBottom: 24,
                            }}
                          >
                            {["X", "f", "🐙", "📷", "👾", "🐘"].map((social) => (
                              <Text
                                key={social}
                                style={{ fontSize: 16, color: "#404040", cursor: "pointer" }}
                              >
                                {social}
                              </Text>
                            ))}
                          </View>

                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingLeft: 8,
                              paddingRight: 8,
                            }}
                          >
                            <Text style={{ fontSize: 16, fontWeight: 600, color: "#171717" }}>
                              My Tags
                            </Text>
                            <Text style={{ fontSize: 16, color: "#404040", cursor: "pointer" }}>
                              ⚙️
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Main Feed */}
                    <View style={{ flex: 1, maxWidth: 650, flexDirection: "column", gap: 12 }}>
                      {/* What's on your mind? */}
                      <View
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: "#d4d4d4",
                          padding: 16,
                          cursor: "text",
                        }}
                      >
                        <Text style={{ fontSize: 16, color: "#71717a" }}>What's on your mind?</Text>
                      </View>

                      {/* Tabs */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: "#3b49df",
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: 600 }}>
                            Discover
                          </Text>
                        </View>
                        <View
                          style={{
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: "#404040", fontSize: 16 }}>Following</Text>
                        </View>
                        <View
                          style={{
                            paddingLeft: 12,
                            paddingRight: 12,
                            paddingTop: 6,
                            paddingBottom: 6,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: "#404040", fontSize: 16 }}>Latest</Text>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Text style={{ fontSize: 20, color: "#404040", fontWeight: 600 }}>...</Text>
                      </View>

                      {/* Article Card */}
                      <View
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: "#d4d4d4",
                          flexDirection: "column",
                          overflow: "hidden",
                        }}
                      >
                        {/* Cover Image Placeholder */}
                        <View
                          style={{
                            width: "100%",
                            height: 270,
                            backgroundColor: "#09090b",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "#22d3ee", fontSize: 48, fontWeight: 700 }}>
                            DEV LOG #1
                          </Text>
                          <View style={{ flexDirection: "row", gap: 16, marginTop: 16 }}>
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: "#ec4899",
                                transform: [{ rotate: "45deg" }],
                              }}
                            />
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: "#eab308",
                                transform: [{ rotate: "15deg" }],
                              }}
                            />
                            <View
                              style={{
                                width: 40,
                                height: 40,
                                backgroundColor: "#a855f7",
                                transform: [{ rotate: "-20deg" }],
                              }}
                            />
                          </View>
                        </View>

                        <View style={{ padding: 20, flexDirection: "column" }}>
                          {/* Author Info */}
                          <View
                            style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
                          >
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: "#3b82f6",
                                marginRight: 12,
                              }}
                            />
                            <View style={{ flexDirection: "column" }}>
                              <Text style={{ fontSize: 14, fontWeight: 600, color: "#171717" }}>
                                FrancisTRoev (ง'̀-'́)ง 👾
                              </Text>
                              <Text style={{ fontSize: 12, color: "#71717a" }}>
                                Apr 10 (3 days ago)
                              </Text>
                            </View>
                          </View>

                          {/* Title */}
                          <Text
                            style={{
                              fontSize: 30,
                              fontWeight: 700,
                              color: "#171717",
                              marginBottom: 8,
                              lineHeight: 1.2,
                            }}
                          >
                            EasyPollVote [Dev Log #1]
                          </Text>

                          {/* Tags */}
                          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                            {["#discuss", "#easypvdevlog", "#nextjs", "#react"].map((tag) => (
                              <Text key={tag} style={{ fontSize: 14, color: "#71717a" }}>
                                {tag}
                              </Text>
                            ))}
                          </View>

                          {/* Footer Actions */}
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 24,
                            }}
                          >
                            <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <Text style={{ fontSize: 14, marginRight: 8 }}>❤️🔥🦄</Text>
                                <Text style={{ fontSize: 14, color: "#404040" }}>36 Reactions</Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <Text style={{ fontSize: 14, marginRight: 8 }}>💬</Text>
                                <Text style={{ fontSize: 14, color: "#404040" }}>18 Comments</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                              <Text style={{ fontSize: 12, color: "#71717a" }}>3 min read</Text>
                              <Text style={{ fontSize: 16, color: "#404040", cursor: "pointer" }}>
                                🔖
                              </Text>
                            </View>
                          </View>

                          {/* Comments Preview */}
                          <View style={{ flexDirection: "column", gap: 12, paddingTop: 16 }}>
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 1,
                                backgroundColor: "#f4f4f5",
                              }}
                            />
                            {/* Comment 1 */}
                            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: "#d946ef",
                                  marginRight: 12,
                                  marginTop: 4,
                                }}
                              />
                              <View
                                style={{
                                  flex: 1,
                                  backgroundColor: "#f4f4f5",
                                  borderRadius: 6,
                                  padding: 12,
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "#171717",
                                      marginRight: 8,
                                    }}
                                  >
                                    Beey
                                  </Text>
                                  <Text style={{ fontSize: 12, color: "#71717a" }}>2 days ago</Text>
                                </View>
                                <Text style={{ fontSize: 14, color: "#171717", lineHeight: 1.5 }}>
                                  Alright, but you might want to prevent people from voting more
                                  than once as there will be bots and the bots are gonna spam their
                                  favorite Pokemon so yea..
                                </Text>
                              </View>
                            </View>

                            {/* Comment 2 */}
                            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: "#10b981",
                                  marginRight: 12,
                                  marginTop: 4,
                                }}
                              />
                              <View
                                style={{
                                  flex: 1,
                                  backgroundColor: "#f4f4f5",
                                  borderRadius: 6,
                                  padding: 12,
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "#171717",
                                      marginRight: 8,
                                    }}
                                  >
                                    Yacham Duniya (CRAN3)
                                  </Text>
                                  <Text style={{ fontSize: 12, color: "#71717a" }}>2 days ago</Text>
                                </View>
                                <Text style={{ fontSize: 14, color: "#171717", lineHeight: 1.5 }}>
                                  Solid project man!!
                                </Text>
                              </View>
                            </View>

                            <Text
                              style={{
                                fontSize: 14,
                                color: "#404040",
                                marginTop: 8,
                                cursor: "pointer",
                              }}
                            >
                              See all 18 comments
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Right Sidebar */}
                    {vw >= 1024 && (
                      <View
                        style={{
                          width: 320,
                          flexShrink: 0,
                          marginLeft: 16,
                          flexDirection: "column",
                          gap: 16,
                        }}
                      >
                        {/* Active Discussions */}
                        <View
                          style={{
                            backgroundColor: "#fafafa",
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: "#d4d4d4",
                            flexDirection: "column",
                          }}
                        >
                          <View style={{ padding: 16 }}>
                            <View
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 1,
                                backgroundColor: "#e5e5e5",
                              }}
                            />
                            <Text style={{ fontSize: 20, fontWeight: 700, color: "#171717" }}>
                              Active discussions
                            </Text>
                          </View>
                          <View style={{ flexDirection: "column" }}>
                            {[
                              {
                                title: "The Emotional Terror of Closing a Browser Tab",
                                comments: "44 comments",
                              },
                              {
                                title:
                                  "I Ran 500 More Agent Memory Experiments. The Real Problem Wasn't Recall. It Was Binding.",
                                comments: "15 comments",
                              },
                              {
                                title: "The Final 1% of Every GitHub Project: Sealing It Properly",
                                comments: "32 comments",
                              },
                              {
                                title: "I Couldn't Afford Earth, So I Built Something Better",
                                comments: "32 comments",
                              },
                              {
                                title: "You're a Real Software Developer Only If...",
                                comments: "149 comments",
                              },
                              { title: "I'm a bit lost.", comments: "28 comments" },
                              {
                                title: "AIMock: One Mock Server For Your Entire AI Stack",
                                comments: "30 comments",
                              },
                              {
                                title: "What Karpathy's LLM Wiki Is Missing (And How to Fix It)",
                                comments: "2 comments",
                              },
                            ].map((item, index) => (
                              <View
                                key={index}
                                style={({ hovered }) => ({
                                  padding: 16,
                                  backgroundColor: hovered ? "#ffffff" : "transparent",
                                  cursor: "pointer",
                                })}
                              >
                                {index !== 7 && (
                                  <View
                                    style={{
                                      position: "absolute",
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      height: 1,
                                      backgroundColor: "#e5e5e5",
                                    }}
                                  />
                                )}
                                <Text
                                  style={{
                                    fontSize: 16,
                                    color: "#404040",
                                    lineHeight: 1.4,
                                    marginBottom: 4,
                                  }}
                                >
                                  {item.title}
                                </Text>
                                <Text style={{ fontSize: 14, color: "#71717a" }}>
                                  {item.comments}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* #discuss */}
                        <View
                          style={{
                            backgroundColor: "#fafafa",
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: "#d4d4d4",
                            padding: 16,
                            flexDirection: "column",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: 700,
                              color: "#171717",
                              marginBottom: 8,
                            }}
                          >
                            #discuss
                          </Text>
                          <Text style={{ fontSize: 14, color: "#404040", lineHeight: 1.5 }}>
                            Discussion threads targeting the whole community!
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </Canvas>
          </div>
        );
      }}
    </CanvasProvider>
  );
};
