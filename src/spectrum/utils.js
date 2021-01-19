import {
  ProfileLayer,
  PointLayer,
  PrecursorPeakLayer,
  IsolationWindowLayer,
  DeconvolutedLayer,
} from "./spectrum_layers.js";

export function convertScanToLayers(data, config) {
  let layer;
  if (data.is_profile) {
    layer = new ProfileLayer(data.mz, data.intensity);
  } else {
    layer = new PointLayer(
      Array.from(new ProfileLayer(data.mz, data.intensity))
    );
  }

  const newState = Object.assign({});
  newState.layers = [layer];
  if (data.points && data.is_profile) {
    let pointLayer = new PointLayer(data.points);
    newState.layers.push(pointLayer);
  }
  if (data.precursor_information) {
    if (data.ms_level > 1) {
      let precursorLayer = new PrecursorPeakLayer({
        mz: data.precursor_information.mz,
        charge: data.precursor_information.charge,
        intensity: newState.layers[0].maxIntensity(),
      });
      newState.layers.push(precursorLayer);
    } else {
      let precursorLayer = new PointLayer(data.precursor_information);
      newState.layers.push(precursorLayer);
    }
  }
  if (data.isolation_window) {
    let isolationLayer;
    if (data.ms_level > 1) {
      isolationLayer = new IsolationWindowLayer(
        [data.isolation_window],
        newState.layers[0].maxIntensity()
      );
    } else {
      isolationLayer = new IsolationWindowLayer(
        data.isolation_window,
        newState.layers[0].maxIntensity()
      );
    }
    newState.layers.push(isolationLayer);
  }
  if (data.deconvoluted_points) {
    let deconvolutedPeaks = new DeconvolutedLayer(data.deconvoluted_points);
    newState.layers.push(deconvolutedPeaks);
  }
  newState.scanId = data.scan_id;
  newState.msLevel = data.ms_level;
  newState.scanTime = data.scan_time;
  newState.isProfile = data.is_profile;
  if (data.precursor_information) {
    newState.precursorInformation = {
      mz: data.precursor_information.mz,
      charge: data.precursor_information.charge,
      intensity: data.precursor_information.intensity,
      precursorId: data.precursor_information.scan_id,
    };
  }
  return newState;
}
