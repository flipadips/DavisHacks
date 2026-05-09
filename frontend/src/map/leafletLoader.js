const leafletScriptId = "leaflet-js";
const leafletStyleId = "leaflet-css";
const leafletVersion = "1.9.4";

let leafletPromise;

export function loadLeaflet() {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (leafletPromise) {
    return leafletPromise;
  }

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(leafletStyleId)) {
      const link = document.createElement("link");
      link.id = leafletStyleId;
      link.rel = "stylesheet";
      link.href = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.css`;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(leafletScriptId);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = leafletScriptId;
    script.src = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.js`;
    script.async = true;
    script.addEventListener("load", () => resolve(window.L));
    script.addEventListener("error", () => reject(new Error("Leaflet failed to load.")));

    document.head.appendChild(script);
  });

  return leafletPromise;
}
