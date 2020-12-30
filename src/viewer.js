import * as React from "react";
import * as _ from "lodash";

import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import LinearProgress from "@material-ui/core/LinearProgress";

import SpectrumCanvasComponent from "./spectrum/component";
import { SpectrumGetter, SpectrumList } from "./scan_list/scan_list";
import { getScan } from "./util";

import "./App.css";
import { CircularProgress } from "@material-ui/core";
import { Label } from "@material-ui/icons";

function AveragineSelect({ name, options, currentAveragine, setAveragine }) {
  const useStyles = makeStyles((theme) => ({
    select: {
      margin: theme.spacing(1),
      // minWidth: 120,
    },
  }));
  const classes = useStyles();
  const optTags = options.map((opt) => {
    return (
      <MenuItem value={opt} key={`${name}-${opt}`} className="capitalized">
        {opt}
      </MenuItem>
    );
  });
  return (
    <FormControl>
      <InputLabel id={`${_.kebabCase(name)}-label`}>
        <span className="capitalized">
          {name.replace("ms", "MS").replace("-", " ")}
        </span>{" "}
        Model:{" "}
      </InputLabel>
      <Select
        labelId={`${_.kebabCase(name)}-label`}
        className="capitalized"
        name={_.kebabCase(name)}
        value={currentAveragine}
        classes={classes}
        onChange={(event) => {
          setAveragine(event.target.value);
        }}
      >
        {optTags}
      </Select>
    </FormControl>
  );
}

const AVERAGINE_CHOICES = ["peptide", "glycan", "glycopeptide"];

function MS1ScanAveragingInput({ currentValue, setValue }) {
  const useStyles = makeStyles((theme) => ({
    root: {
      width: "120px",
    },
  }));
  const classes = useStyles();
  return (
    <TextField
      name="ms1-averaging"
      label="MS1 Averaging"
      defaultValue={currentValue}
      size="small"
      margin="dense"
      classes={classes}
      inputProps={{ style: { height: "2.2em", width: "120px" } }}
      variant="outlined"
      onBlur={(event) => setValue(event.target.value)}
    />
  );
}

function SpectrumStatusDisplay({ ...props }) {
  const spinner = <LinearProgress />;
  return (
    <FormControl style={{ marginTop: "1.5em", textTransform: "capitalize" }}>
      <span style={{ marginBottom: "2px" }}>
        Spectrum Process: {props.value}
      </span>{" "}
      {props.value == "pending" && spinner}
    </FormControl>
  );
}

function SpectrumViewer({ ...props }) {
  const [ms1Averagine, setMS1Averagine] = React.useState("peptide");
  const [msnAveragine, setMSnAveragine] = React.useState("peptide");
  const [ms1ScanAveraging, setMS1ScanAveraging] = React.useState(0);
  const [dataFileKey, setDataFileKey] = React.useState(0);
  const [spectrumLoadingState, setSpectrumLoadingState] = React.useState(
    "idle"
  );
  const [dataHost, setDataHost] = React.useState("http://localhost:5000/");

  const config = {
    ms1Averagine,
    msnAveragine,
    dataFileKey,
    ms1ScanAveraging,
    dataHost,
  };

  const [spectrumData, setSpectrumData] = React.useState({
    // scanId: "controllerType=0 controllerNumber=1 scan=10032",
    scanId: null,
    layers: [],
  });

  React.useEffect(() => {
    if (spectrumData.scanId !== null) {
      console.log(
        "Re-processing spectrum with new config...",
        spectrumData.scanId
      );
      getScan(
        spectrumData.scanId,
        config,
        setSpectrumData,
        setSpectrumLoadingState
      );
    }
  }, [config.ms1Averagine, config.msnAveragine, config.ms1ScanAveraging]);

  return (
    <div className="App">
      <SpectrumCanvasComponent config={config} spectrumData={spectrumData} />
      <div className="spectrum-canvas-controls">
        <SpectrumStatusDisplay value={spectrumLoadingState} />
        <AveragineSelect
          name={"ms-averagine"}
          options={AVERAGINE_CHOICES}
          currentAveragine={ms1Averagine}
          setAveragine={setMS1Averagine}
        />
        <AveragineSelect
          name={"msn-averagine"}
          options={AVERAGINE_CHOICES}
          currentAveragine={msnAveragine}
          setAveragine={setMSnAveragine}
        />
        <MS1ScanAveragingInput
          currentValue={ms1ScanAveraging}
          setValue={setMS1ScanAveraging}
        />
      </div>
      <div style={{ marginBottom: "2em" }}>
        <SpectrumGetter
          config={config}
          dispatch={setSpectrumData}
          setProgress={setSpectrumLoadingState}
        />
      </div>
      <div>
        <SpectrumList
          config={config}
          setSpectrumData={setSpectrumData}
          spectrumLoadingProgress={setSpectrumLoadingState}
        />
      </div>
    </div>
  );
}

export { SpectrumViewer };
