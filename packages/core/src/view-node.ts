import type { ViewProps } from "./types.ts";

export class ViewNode {
  readonly type = "View" as const;
  props: ViewProps;
  children: ViewNode[] = [];

  constructor(props: ViewProps = {}) {
    this.props = { ...props };
  }

  appendChild(child: ViewNode): void {
    this.children.push(child);
  }

  removeChild(child: ViewNode): void {
    const i = this.children.indexOf(child);
    if (i !== -1) {
      this.children.splice(i, 1);
    }
  }

  insertBefore(child: ViewNode, before: ViewNode): void {
    const i = this.children.indexOf(before);
    if (i === -1) {
      this.children.push(child);
    } else {
      this.children.splice(i, 0, child);
    }
  }
}
