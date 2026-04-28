/**
 * Re-mounts on every segment navigation under `[adminSlug]`, so we get a light
 * enter animation without re-running the parent layout (sidebar stays put).
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="admin-page-enter">{children}</div>;
}
