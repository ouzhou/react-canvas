import { Modal, Text, View } from "@react-canvas/react-v2";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";

import { DEMO_PAGE_BG, DEMO_PAGE_PADDING_X, demoPageContentWidth } from "../constants.ts";

export function ModalDemoInCanvas(props: {
  W: number;
  H: number;
  viewportW: number;
  viewportH: number;
  onLog: (msg: string) => void;
}) {
  const { t } = useLingui();
  const { W, H, viewportW, viewportH, onLog } = props;
  const [open, setOpen] = useState(false);

  const cardW = 312;
  const cardH = 176;
  const cardLeft = Math.max(0, Math.round((viewportW - cardW) / 2));
  const cardTop = Math.max(0, Math.round((viewportH - cardH) / 2));
  const contentW = demoPageContentWidth(W);
  const pagePad = DEMO_PAGE_PADDING_X;

  return (
    <>
      <View
        id="modal-page"
        style={{
          width: W,
          height: H,
          position: "relative",
          backgroundColor: DEMO_PAGE_BG,
        }}
      >
        <View
          id="modal-open-btn"
          style={{
            position: "absolute",
            left: pagePad,
            top: 16,
            width: 148,
            height: 40,
            borderRadius: 8,
            backgroundColor: "#1677ff",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => {
            setOpen(true);
            onLog(t`已打开 Modal`);
          }}
        >
          <Text
            id="modal-open-btn-label"
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            {t`打开弹窗`}
          </Text>
        </View>
        <View
          id="modal-main-block"
          style={{
            position: "absolute",
            left: pagePad,
            top: 72,
            width: contentW,
            height: H - 88,
            backgroundColor: "#ffffff",
          }}
          onClick={() => onLog(t`主内容区收到点击（仅 Modal 关闭时）`)}
        />
      </View>
      <Modal
        visible={open}
        backdropId="modal-backdrop"
        onRequestClose={() => {
          setOpen(false);
          onLog(t`onRequestClose（点遮罩关闭）`);
        }}
      >
        <View
          id="modal-card"
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop,
            width: cardW,
            height: cardH,
            borderRadius: 12,
            backgroundColor: "#ffffff",
          }}
        >
          <Text
            id="modal-card-title"
            style={{
              position: "absolute",
              left: 20,
              top: 16,
              width: cardW - 40,
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(0,0,0,0.88)",
              lineHeight: 1.35,
            }}
          >
            {t`确认操作`}
          </Text>
          <View
            id="modal-inner-strip"
            style={{
              position: "absolute",
              left: 20,
              top: 48,
              width: cardW - 40,
              height: 36,
              borderRadius: 6,
              backgroundColor: "#d9f7be",
            }}
            onClick={() => onLog(t`弹窗内绿条（不关闭 Modal）`)}
          >
            <Text
              id="modal-strip-label"
              style={{
                position: "absolute",
                left: 12,
                top: 8,
                width: cardW - 64,
                fontSize: 13,
                fontWeight: "bold",
                color: "#389e0d",
                lineHeight: 1.25,
              }}
            >
              {t`点我 · 不关窗`}
            </Text>
          </View>
          <Text
            id="modal-card-help"
            style={{
              position: "absolute",
              left: 20,
              top: 92,
              width: cardW - 40,
              fontSize: 13,
              color: "rgba(0,0,0,0.65)",
              lineHeight: 1.45,
            }}
          >
            {t`遮罩覆盖整块画布（含侧栏），贴近业务全屏 Modal。\n点外侧深色区域关闭；绿条仅消费点击不关窗。`}
          </Text>
        </View>
      </Modal>
    </>
  );
}
