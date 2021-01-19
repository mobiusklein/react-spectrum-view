import * as React from "react";
import ReactDOM from "react-dom";
// import { SpectrumViewer } from "./viewer";
import SpectrumCanvasComponent from "./spectrum/component";
import { convertScanToLayers } from "./spectrum/utils";

export function renderSpectrum(container, spectrumData) {
  let spectrumDataConverted = convertScanToLayers(spectrumData);
  let component = (
    <SpectrumCanvasComponent spectrumData={spectrumDataConverted} config={{}} />
  );
  ReactDOM.render(component, container);
  return component;
}

export { SpectrumCanvasComponent, convertScanToLayers };
