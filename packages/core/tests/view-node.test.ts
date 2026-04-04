import { expect, test } from "vite-plus/test";
import { ViewNode } from "../src/index.ts";

test("C1: create ViewNode", () => {
  const node = new ViewNode();
  expect(node.type).toBe("View");
  expect(node.children).toEqual([]);
});

test("C2: appendChild", () => {
  const parent = new ViewNode();
  const child = new ViewNode({ style: { backgroundColor: "red" } });
  parent.appendChild(child);
  expect(parent.children).toEqual([child]);
});

test("C3: removeChild", () => {
  const parent = new ViewNode();
  const a = new ViewNode();
  const b = new ViewNode();
  parent.appendChild(a);
  parent.appendChild(b);
  parent.removeChild(a);
  expect(parent.children).toEqual([b]);
});

test("C4: insertBefore", () => {
  const parent = new ViewNode();
  const a = new ViewNode();
  const b = new ViewNode();
  const c = new ViewNode();
  parent.appendChild(a);
  parent.appendChild(c);
  parent.insertBefore(b, c);
  expect(parent.children).toEqual([a, b, c]);
});
