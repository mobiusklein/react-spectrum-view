import {
  ProfileLayer,
  PointLayer,
  PrecursorPeakLayer,
  IsolationWindowLayer,
  DeconvolutedLayer,
} from "./spectrum/spectrum_layers.js";

function getScanByIndex(scanIndex, config, dispatch, setProgress) {
  const formData = configToFormData(config);
  if (setProgress) {
    setProgress("pending");
  }
  const request = fetch(
    `http://localhost:5000/scan_index_to_id/${config.dataFileKey}/${scanIndex}`,
    {
      method: "POST",
      body: formData,
    }
  );
  request
    .then(
      (response) => {
        if (!response.ok) {
          console.log(response);
          throw Error(response.statusText);
        }
        return response.json();
      },
      (error) => {
        setProgress("error: " + error.message);
      }
    )
    .catch((error) => {
      setProgress("error: " + error.message);
    })
    .then((data) => {
      if (setProgress) {
        setProgress("loading");
        if (!data) {
          setProgress("error");
          return;
        }
      }
      const newState = convertScanToLayers(data, config);
      if (setProgress) {
        setProgress("done");
      }
      dispatch(newState);
    });
}

function configToFormData(config) {
  const formData = new FormData();
  formData.set("ms1-averagine", config.ms1Averagine);
  formData.set("msn-averagine", config.msnAveragine);
  formData.set("ms1-averaging", config.ms1ScanAveraging);
  formData.set("scan-filters", config.scanFilters || []);
  console.log(config);
  return formData;
}

function convertScanToLayers(data, config) {
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
  if (data.points !== undefined && data.is_profile) {
    let pointLayer = new PointLayer(data.points);
    newState.layers.push(pointLayer);
  }
  if (data.precursor_information !== null) {
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
  if (data.isolation_window !== null) {
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
  if (data.deconvoluted_points !== null) {
    let deconvolutedPeaks = new DeconvolutedLayer(data.deconvoluted_points);
    newState.layers.push(deconvolutedPeaks);
  }
  newState.scanId = data.scan_id;
  newState.msLevel = data.ms_level;
  newState.scanTime = data.scan_time;
  newState.isProfile = data.is_profile;
  newState.precursorInformation = {
    mz: data.precursor_information.mz,
    charge: data.precursor_information.charge,
    intensity: data.precursor_information.intensity,
    precursorId: data.precursor_information.scan_id,
  };
  return newState;
}

function getScan(scanId, config, dispatch, setProgress) {
  const formData = configToFormData(config);
  if (setProgress) {
    setProgress("pending");
  }
  const request = fetch(
    `${config.dataHost}/scan/${config.dataFileKey}/${scanId}`,
    {
      method: "POST",
      body: formData,
    }
  );
  request
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (setProgress) {
        setProgress("loading");
      }
      const newState = convertScanToLayers(data, config);
      if (setProgress) {
        setProgress("done");
      }
      dispatch(newState);
    });
}

export { getScan, getScanByIndex };
