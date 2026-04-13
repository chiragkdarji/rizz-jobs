export default function IplFooter() {
  return (
    <footer
      className="mt-16 py-8 text-center text-xs"
      style={{
        background: "#0A0A0F",
        borderTop: "1px solid #2A2A3A",
        color: "#5A566A",
        fontFamily: "var(--font-ipl-display, sans-serif)",
      }}
    >
      <p>© {new Date().getFullYear()} Rizz Jobs · Data sourced from Cricbuzz</p>
    </footer>
  );
}
