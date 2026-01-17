export const HOSTNAME = process.env.NODE_ENV === "development"
  ? "http://localhost:3000"
  : "https://recruitify.tech/";

export const protectedPaths = [
  "/dashboard",
  "/profile",
  "/newdash",
  "/dash",
  "/anonymous",
  "/pages/anonymous/[slug].tsx",
  "/anonymous/[slug]",
  "/anonymous/58uvre?slug=58uvre",
  "/app/anonymous",
  "/build",
  "/app/build",
  "/cc",
  "/app/cc",
  "/feedback",
];
export const authPaths = ["/register", "/signin", "/auth"];
