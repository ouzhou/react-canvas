/**
 * 优先级栈式光标，与 `core-design.md` §15 一致。
 * `node` 层由指针管线通过 {@link setFromNode} 写入；`plugin` / `system` 通过 {@link set} 压栈，释放函数弹栈。
 */
export type CursorPriority = "node" | "plugin" | "system";

export class CursorManager {
  private nodeCursor = "default";
  private readonly pluginStack: string[] = [];
  private readonly systemStack: string[] = [];

  /**
   * 由指针宿主在 hover / 命中链更新时调用，写入 **node** 优先级（覆盖上一次，非栈）。
   */
  setFromNode(cursor: string): void {
    this.nodeCursor = typeof cursor === "string" && cursor.length > 0 ? cursor : "default";
  }

  /**
   * 压入 `plugin` 或 `system` 栈；返回释放函数。**node** 级请用 {@link setFromNode}。
   */
  set(cursor: string, priority: Exclude<CursorPriority, "node">): () => void {
    const stack = priority === "plugin" ? this.pluginStack : this.systemStack;
    stack.push(cursor);
    return () => {
      const i = stack.lastIndexOf(cursor);
      if (i >= 0) stack.splice(i, 1);
    };
  }

  /** `system` > `plugin` > `node`，每档取栈顶；皆空时为 `default`。 */
  resolve(): string {
    if (this.systemStack.length > 0) {
      return this.systemStack[this.systemStack.length - 1]!;
    }
    if (this.pluginStack.length > 0) {
      return this.pluginStack[this.pluginStack.length - 1]!;
    }
    return this.nodeCursor;
  }

  /** 解除画布指针监听或销毁 Stage 时调用，清空各栈与 node 层。 */
  reset(): void {
    this.nodeCursor = "default";
    this.pluginStack.length = 0;
    this.systemStack.length = 0;
  }
}
