import * as React from "react";
import ReactDOM from "react-dom";
// import { SpectrumViewer } from "./viewer";
import SpectrumCanvasComponent from "./spectrum/component";
import { convertScanToLayers } from "./spectrum/utils";
import { SpectrumData, DataLayer, LineArtist, ProfileLayer, PointLayer,
         LabeledPeakLayer, DeconvolutedLayer, PrecursorPeakLayer, IsolationWindowLayer,
  } from "./spectrum/spectrum_layers"
import * as App from "./viewer"

export function renderSpectrum(container, spectrumData, converter) {
  if (converter === undefined) {
    converter = convertScanToLayers
  }
  let spectrumDataConverted = renderSpectrum(spectrumData);
  let component = (
    <SpectrumCanvasComponent spectrumData={spectrumDataConverted} config={{}} />
  );
  ReactDOM.render(component, container);
  return component;
}

export {
  SpectrumCanvasComponent, convertScanToLayers, SpectrumData, DataLayer, LineArtist, ProfileLayer, PointLayer,
  LabeledPeakLayer, DeconvolutedLayer, PrecursorPeakLayer, IsolationWindowLayer, App};
