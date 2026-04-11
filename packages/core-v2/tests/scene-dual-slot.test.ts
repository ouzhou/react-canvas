import { expect, test } from "vite-plus/test";
import {
  createSceneRuntime,
  SCENE_CONTENT_ID,
  SCENE_MODAL_ID,
} from "../src/runtime/scene-runtime.ts";

test("root has scene-content then scene-modal as children", async () => {
  const rt = await createSceneRuntime({ width: 320, height: 240 });
  expect(rt.getContentRootId()).toBe(SCENE_CONTENT_ID);
  expect(rt.getModalRootId()).toBe(SCENE_MODAL_ID);
  const g = rt.getSceneGraphSnapshot();
  expect(g.nodes[rt.getRootId()]?.children).toEqual([SCENE_CONTENT_ID, SCENE_MODAL_ID]);
});

test("removeView rejects scene slot ids", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  expect(() => rt.removeView(SCENE_CONTENT_ID)).toThrow(/cannot remove scene slot/);
  expect(() => rt.removeView(SCENE_MODAL_ID)).toThrow(/cannot remove scene slot/);
});
