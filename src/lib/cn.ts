// Class-name joiner (M6.6). Serves three alias targets some vendored sources
// import ("cn" and "@/lib/utils" — see vite.config alias table). Keeping this
// app-owned shim avoids adding clsx/tailwind-merge to the runtime union: the
// vendored call sites only pass plain booleans/strings here.
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}

export default cn;
