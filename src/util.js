import {
  ProfileLayer,
  PointLayer,
  PrecursorPeakLayer,
  IsolationWindowLayer,
  DeconvolutedLayer,
} from "./spectrum/spectrum_layers.js";

const makeWeakScanId = (index) =>
  `controllerType=0 controllerNumber=1 scan=${index + 1}`;

function getScan(scanId, config, dispatch, setProgress) {
  let formData = new FormData();
  formData.set("ms1-averagine", config.ms1Averagine);
  formData.set("msn-averagine", config.msnAveragine);
  if (setProgress) {
    setProgress("pending");
  }
  let request = fetch(
    `http://localhost:5000/scan/${config.dataFileKey}/${scanId}`,
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
      console.log(data);
      let layer;
      if (data.is_profile) {
        layer = new ProfileLayer(data.mz, data.intensity);
      } else {
        layer = new PointLayer(
          Array.from(new ProfileLayer(data.mz, data.intensity))
        );
      }
      console.log(layer);
      let newState = Object.assign({});
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
      newState.scanId = scanId;
      if (setProgress) {
        setProgress("done");
      }
      dispatch(newState);
    });
}

export { getScan, makeWeakScanId };
