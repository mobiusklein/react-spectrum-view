import * as React from "react";
import ReactDOM from "react-dom";

import {
    SpectrumCanvas,
    convertScanToLayers,
    convertPROXIToLayers,
    convertMSDeisotopeToLayers,
    SpectrumData,
    DataLayer,
    LineArtist,
    ProfileLayer,
    PointLayer,
    LabeledPeakLayer,
    DeconvolutedLayer,
    PrecursorPeakLayer,
    IsolationWindowLayer,
    Spectrum,
    PrecursorInformation,
    SpectrumCanvasComponent
} from "./spectrum"

export function renderSpectrum(container, spectrumData, converter) {
  if (converter === undefined) {
    converter = convertScanToLayers
  }
  let spectrumDataConverted = converter(spectrumData);
  let component = (
    <SpectrumCanvasComponent spectrumData={spectrumDataConverted} config={{}} />
  );
  ReactDOM.render(component, container);
  return component;
}

export {
  SpectrumCanvasComponent,
  convertScanToLayers,
  SpectrumData,
  DataLayer,
  LineArtist,
  ProfileLayer,
  PointLayer,
  LabeledPeakLayer,
  DeconvolutedLayer,
  PrecursorPeakLayer,
  IsolationWindowLayer,
  SpectrumCanvas,
  Spectrum,
  PrecursorInformation,
  convertPROXIToLayers,
  convertMSDeisotopeToLayers
};
