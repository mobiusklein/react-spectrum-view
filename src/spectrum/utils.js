import {
  ProfileLayer,
  PointLayer,
  PrecursorPeakLayer,
  IsolationWindowLayer,
  DeconvolutedLayer,
  LabeledPeakLayer,
} from "./spectrum_layers.js";

export function convertPROXIToLayers(data, config) {
  const mzArray = data['m/z array'];
  const intensityArray = data['intensity array']
  let layer = new PointLayer(
    Array.from(new ProfileLayer(mzArray, intensityArray))
  );
  const newState = Object.assign({
    scanId: "",
    scanNumber: 0,
    precursorInformation: {},
    msLevel: 2,
    layers: [layer],
  });

  const attributes = data['attributes']
  if (attributes) {
    for(let attrib of attributes) {
      switch (attrib.name) {
        case "ms level":
          newState.msLevel = attrib.value
          break
        case "scan number":
          newState.scanNumber = attrib.value
          break
        case "spectrum name":
          newState.scanId = attrib.value
          break
        case "isolation window target m/z":
          newState.precursorInformation.mz = attrib.value
          break
        case "charge state":
          newState.precursorInformation.charge = attrib.value
          break
      }
    }
  }
  if (newState.precursorInformation.mz) {
    let precursorLayer = new PrecursorPeakLayer({
      mz: newState.precursorInformation.mz,
      charge: newState.precursorInformation.charge ? newState.precursorInformation.charge : 1,
      intensity: newState.layers[0].maxIntensity(),
    });
    newState.layers.push(precursorLayer);
  }
  return newState
}

export function convertMSDeisotopeToLayers(data, config) {
  const newState = Object.assign({});
  newState.layers = [];
  if (data.arrays !== undefined && data.arrays.mz !== undefined && data.arrays.mz.length > 0) {
    newState.layers.push(new ProfileLayer(data.arrays.mz, data.arrays.intensity));
  }
  if (!data.is_profile && data.peak_set === undefined && data.arrays !== undefined && data.arrays.mz.length > 0) {
    newState.layers.push(
      new PointLayer(Array.from(new ProfileLayer(data.arrays.mz, data.arrays.intensity))));
  }
  if (data.peak_set !== undefined && data.peak_set.length > 0) {
    let pointLayer = new PointLayer(data.peak_set);
    newState.layers.push(pointLayer);
  }
  if (data.deconvoluted_peak_set !== undefined && data.deconvoluted_peak_set.length > 0) {
    let deconvolutedPeaks = new DeconvolutedLayer(data.deconvoluted_peak_set);
    newState.layers.push(deconvolutedPeaks);
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
  newState.scanId = data.id;
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
