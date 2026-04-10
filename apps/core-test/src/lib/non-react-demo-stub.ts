/**
 * `standalone` / `package`：spec 约定不提供 React 画布对照；仅清空容器并给出极简占位。
 */
export function mountNonReactDemoStub(container: HTMLElement): () => void {
  container.replaceChildren();
  const p = document.createElement("p");
  p.className = "impl-react-stub";
  p.textContent = "本项无 React 对照（见 design spec 第 2.1 节）。";
  container.appendChild(p);
  return () => {
    container.replaceChildren();
  };
}
