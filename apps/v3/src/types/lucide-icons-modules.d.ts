declare module "@lucide/icons/icons/*" {
  const icon: {
    readonly name: string;
    readonly size?: number;
    readonly node: readonly (readonly [string, Record<string, string | number | undefined>])[];
  };
  export default icon;
}
