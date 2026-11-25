import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import { BikeGeometry, createDefaultGeometry } from "@/lib/types";
import { runKinematicAnalysis } from "@/lib/kinematics";
import { AnimationView } from "@/components/Visualization";
import "./styles.css";

/**
 * MCP App viewer. The tool result carries only the resolved geometry (+ a small
 * summary); the full ~260 KB analysis is recomputed here (~1 ms) so the sliders
 * work without server round-trips.
 */
function Viewer() {
  const [geometry, setGeometry] = useState<BikeGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shock, setShock] = useState(30);
  const [fork, setFork] = useState(30);
  const [coupled, setCoupled] = useState(true);

  useEffect(() => {
    // Standalone (not inside a host iframe): show the default bike for dev/testing.
    if (window.parent === window) {
      setGeometry(createDefaultGeometry());
      return;
    }
    const app = new App({ name: "MTB suspension viewer", version: "0.1.0" });
    app.ontoolresult = (result) => {
      const sc = result.structuredContent as { geometry?: BikeGeometry } | undefined;
      if (result.isError || !sc?.geometry) {
        setError(
          (result.content?.[0] as { text?: string } | undefined)?.text ??
            "No geometry in tool result.",
        );
        return;
      }
      setError(null);
      setGeometry(sc.geometry);
    };
    app.connect().catch((e) => setError(String(e)));
  }, []);

  const analysisResults = useMemo(
    () => (geometry ? runKinematicAnalysis(geometry) : null),
    [geometry],
  );

  if (error) return <p className="p-4 text-sm text-red-600">{error}</p>;
  if (!geometry || !analysisResults)
    return <p className="p-4 text-sm text-gray-500">Waiting for analysis…</p>;

  return (
    // Definite height, scaled with the (host-controlled) iframe width, because the
    // host sizes the iframe from this document's height.
    <div style={{ height: "clamp(440px, 72vw, 680px)" }}>
      <AnimationView
        geometry={geometry}
        analysisResults={analysisResults}
        isAnimating={false}
        animationSpeed={1}
        shockPercent={shock}
        forkCompressionPercent={fork}
        coupled={coupled}
        onShockPercentChange={setShock}
        onForkCompressionChange={setFork}
        onCoupledChange={setCoupled}
        showCalculations={false}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Viewer />);
