import * as React from "react";
import SpectrumCanvas from "./spectrum_canvas";

import "./spectrum_canvas.css";

//https://stackoverflow.com/a/2117523/1137920
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

export default function SpectrumCanvasComponent({ config, spectrumData }) {
  const canvasHolder = React.useRef(null);
  const [canvas, setCanvas] = React.useState(null);
  const [canvasId] = React.useState(() => uuidv4());
  React.useLayoutEffect(() => {
    if (canvasHolder.current) {
      setCanvas(new SpectrumCanvas(`#${canvasHolder.current.id}`));
    }
  }, [canvasHolder]);

  React.useEffect(() => {
    if (canvas === null) return;
    if (canvas.layers !== spectrumData.layers) {
      let extent = canvas.extentCoordinateInterval;
      if (canvas.layers.length) {
        canvas.clear();
      }
      canvas.addLayers(spectrumData.layers);
      canvas.render();
      if (extent !== undefined){
        if (!(extent[0] === 0 && extent[1] === 0)) {
          canvas.setExtentByCoordinate(...extent);
        }
      }
    }
  }, [spectrumData, canvas]);
  return (
    <div className="spectrum-view-container">
      <h3>{spectrumData.scanId || "Select a Scan"}</h3>
      <div
        className="spectrum-canvas"
        id={`spectrum-canvas-container-${canvasId}`}
        ref={canvasHolder}
      />
    </div>
  );
}
