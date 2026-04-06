export default function IplFooter() {
  return (
    <footer
      className="mt-16 py-8 text-center text-xs"
      style={{
        background: "#061624",
        borderTop: "1px solid #0E2235",
        color: "#6B86A0",
        fontFamily: "var(--font-ipl-display, sans-serif)",
      }}
    >
      <p>© {new Date().getFullYear()} Rizz Jobs · Data sourced from Cricbuzz</p>
    </footer>
  );
}
