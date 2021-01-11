import { convertScanToLayers } from "./spectrum/utils";

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
