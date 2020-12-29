import * as React from "react";
import SpectrumCanvas from "./spectrum_canvas";

import "./spectrum_canvas.css";

export default function SpectrumCanvasComponent({ config, spectrumData }) {
  const canvasHolder = React.useRef(null);
  const [canvas, setCanvas] = React.useState(null);

  React.useLayoutEffect(() => {
    if (canvasHolder.current) {
      setCanvas(new SpectrumCanvas(`#${canvasHolder.current.id}`));
    }
  }, [canvasHolder]);

  React.useEffect(() => {
    if (canvas === null) return;
    if (canvas.layers !== spectrumData.layers) {
      if (canvas.layers.length) {
        canvas.clear();
      }
      canvas.addLayers(spectrumData.layers);
      canvas.render();
    }
  }, [spectrumData, canvas]);
  return (
    <div className="spectrum-view-container">
      <h3>{spectrumData.scanId || "Select a Scan"}</h3>
      <div
        className="spectrum-canvas"
        id="spectrum-canvas-container"
        ref={canvasHolder}
      ></div>
    </div>
  );
}
