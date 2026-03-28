"use client";

import { useEffect, useRef } from "react";

export function ViewTracker({ notificationId }: { notificationId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Only fire for real users — document.referrer or direct navigation
    // navigator.webdriver is set by headless browsers (Puppeteer, Playwright, Selenium)
    if (navigator.webdriver) return;

    fetch(`/api/notifications/${notificationId}/view`, {
      method: "POST",
      // Include credentials so Sec-Fetch-Mode is "cors" (real browser signal)
      credentials: "same-origin",
    }).catch(() => {
      // Ignore errors — view tracking is non-critical
    });
  }, [notificationId]);

  return null;
}
