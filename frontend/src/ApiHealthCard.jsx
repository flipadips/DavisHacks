import React, { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ApiHealthCard() {
  const [health, setHealth] = useState({
    state: "checking",
    message: "Checking API..."
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiUrl}/api/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Health check failed");
        }

        const data = await response.json();
        setHealth({
          state: "online",
          message: `${data.service} is ${data.status}`
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;

        setHealth({
          state: "offline",
          message: "API is not reachable"
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <section className={`health-card health-card--${health.state}`}>
      <span className="health-card__label">Backend</span>
      <strong>{health.message}</strong>
    </section>
  );
}
