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
      <p>
        Cricket data provided by{" "}
        <a
          href="https://cricbuzz.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#D4AF37" }}
        >
          Cricbuzz
        </a>{" "}
        via RapidAPI.
      </p>
      <p className="mt-1">
        Fantasy affiliate links on this site are for informational purposes only. Play responsibly.
      </p>
      <p className="mt-2" style={{ color: "#3A5060" }}>
        © {new Date().getFullYear()} Rizz Jobs
      </p>
    </footer>
  );
}
