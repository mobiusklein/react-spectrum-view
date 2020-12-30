import * as React from "react";

import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import InputLabel from "@material-ui/core/InputLabel";
import FormControl from "@material-ui/core/FormControl";
import { getScan, getScanByIndex } from "../util";

import "./scan-list.css";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    "& > * + *": {
      marginLeft: theme.spacing(2),
    },
  },
}));

// Layout based upon https://stackoverflow.com/questions/48749090/fixed-header-flex-table-header-vertical-align

function SpectrumGetter({ scanIndex, config, dispatch, setProgress }) {
  return (
    <FormControl>
      <TextField
        placeholder="Scan Index"
        id="scan-index-fetch"
        label="Load Scan by Index"
        variant="outlined"
        onBlur={(event) => {
          getScanByIndex(
            parseInt(event.target.value),
            config,
            dispatch,
            setProgress
          );
        }}
      />
    </FormControl>
  );
}

function makeSpectrumListRow(record, onClickHandler) {
  return (
    <tr
      className={`scan-record ms-level-${record.ms_level > 1 ? "n" : "1"}`}
      key={record.scan_id}
      data-scan-id={record.scan_id}
      onClick={onClickHandler}
    >
      <td className="scan-attrib">{record.scan_id}</td>
      <td className="scan-attrib">{record.scan_time.toFixed(3)}</td>
      <td className="scan-attrib narrow">{record.ms_level}</td>
      <td className="scan-attrib narrow">
        {record.mz !== undefined ? record.mz.toFixed(3) : "\u00A0"}
      </td>
      <td className="scan-attrib narrow">
        {record.charge !== undefined ? record.charge : "\u00A0"}
      </td>
      <td className="scan-attrib">
        {record.activation !== undefined ? record.activation.method : "\u00A0"}
      </td>
    </tr>
  );
}

function makeSpectrumListRowClickHandler(config, setSpectrumData, setProgress) {
  const onClickHandler = (e) => {
    e.preventDefault();
    let element = e.target;
    while (!element.classList.contains("scan-record")) {
      element = element.parentElement;
      if (element === null || element === undefined) {
        return;
      }
    }
    if (element.classList.contains("scan-record")) {
      getScan(element.dataset.scanId, config, setSpectrumData, setProgress);
    }
  };
  return onClickHandler;
}

const SpectrumListRows = React.memo(
  (props) => {
    const { listState, onClickHandler } = props;
    const rows = listState.records.map((record) =>
      makeSpectrumListRow(record, onClickHandler)
    );
    console.log("Rendering", rows.length, "rows");
    return <tbody className="scan-record-body">{rows}</tbody>;
  },
  (prevProps, nextProps) =>
    prevProps.listState.checksum === nextProps.listState.checksum
);

function SpectrumList({ config, setSpectrumData, spectrumLoadingProgress }) {
  const [listState, setListState] = React.useState({
    records: [],
    checksum: -1,
  });

  const [loadStatus, setLoadStatus] = React.useState("idle");

  React.useEffect(() => {
    const request = fetch(`${config.dataHost}index/${config.dataFileKey}`);
    setLoadStatus("pending");
    request
      .then((response) => {
        setLoadStatus("parsing");
        return response.json();
      })
      .then((data) => {
        console.log("Fetched Records", data);
        const newState = {
          records: data.records,
          checksum: data.records.length,
        };
        setLoadStatus("done");
        setListState(newState);
      });
  }, [config.dataFileKey]);

  const clickHandler = makeSpectrumListRowClickHandler(
    config,
    setSpectrumData,
    spectrumLoadingProgress
  );
  switch (loadStatus) {
    case "done": {
      return (
        <table className="scan-list-container">
          <thead className="scan-record-header">
            <tr>
              <th className="scan-attrib">Scan ID</th>
              <th className="scan-attrib">Scan Time</th>
              <th className="scan-attrib narrow">MS Level</th>
              <th className="scan-attrib narrow">Precursor m/z</th>
              <th className="scan-attrib narrow">Precursor Charge</th>
              <th className="scan-attrib">Activation</th>
            </tr>
          </thead>
          <SpectrumListRows
            listState={listState}
            onClickHandler={clickHandler}
          />
        </table>
      );
    }
    case "pending": {
      return (
        <div>
          <h3 role="alert">Loading Spectra...</h3>
          <CircularProgress />
        </div>
      );
    }
    case "parsing": {
      return (
        <div>
          <h3 role="alert">Building List...</h3>
          <CircularProgress />
        </div>
      );
    }
    default: {
      return <h3 role="alert">Loading... {loadStatus}</h3>;
    }
  }
}

export { SpectrumGetter, SpectrumList };
