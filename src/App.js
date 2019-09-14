import React, { Component } from 'react';
import './App.css';
import {ProfileLayer, PointLayer, PrecursorPeakLayer, IsolationWindowLayer} from './spectrum/spectrum_layers.js'
import SpectrumCanvasComponent from "./spectrum/component.js"
import ScanList from "./scan_list/scan_list"


class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      layers: [],
      dataFileKey: 0,
      scanId: null
    }
  }

  getScan(scanIndex, scanId) {
    if(scanIndex !== undefined){
      if(isNaN(scanIndex)) {
        return
      }
      scanId = `controllerType=0 controllerNumber=1 scan=${scanIndex + 1}`
    }
    let request = fetch(`http://localhost:5000/scan/${this.state.dataFileKey}/${scanId}`)
    request.then(response => {
      return response.json()
    }).then(data => {
      console.log(data)
      let layer
      if(data.is_profile){
        layer = new ProfileLayer(data.mz, data.intensity)
      } else {
        layer = new PointLayer(Array.from(new ProfileLayer(data.mz, data.intensity)))
      }
      console.log(layer)
      let newState = Object.assign({}, this.state)
      newState.layers = [layer]
      if(data.points !== undefined && data.is_profile){
        let pointLayer = new PointLayer(data.points)
        newState.layers.push(pointLayer)
      }
      if(data.precursor_information !== null) {
        if(data.ms_level > 1){
          let precursorLayer = new PrecursorPeakLayer(
            {
              mz: data.precursor_information.mz,
              charge: data.precursor_information.charge,
              intensity: newState.layers[0].maxIntensity()
            })
          newState.layers.push(precursorLayer)
        } else {
          let precursorLayer = new PointLayer(data.precursor_information)
          newState.layers.push(precursorLayer)
        }

      }
      if(data.isolation_window !== null){
        let isolationLayer
        if(data.ms_level > 1){
          isolationLayer = new IsolationWindowLayer([data.isolation_window], newState.layers[0].maxIntensity())
        } else {
          isolationLayer = new IsolationWindowLayer(data.isolation_window, newState.layers[0].maxIntensity())
        }
        newState.layers.push(isolationLayer)
      }
      newState.scanId = scanId
      console.log("newState", newState)
      this.setState(newState)
    })
  }

  render() {
    const {layers} = this.state
    return (
      <div className="App">
        <h3>{this.state.scanId === null ? "Hello, React" : this.state.scanId}</h3>
        <SpectrumCanvasComponent layers={layers}/>
        <div>
          <button onClick={() => this.getScan(12679 + 1)}>
            Load Test Scan
          </button>
        </div>
        <div>
          <input type="text" name='scan-index' placeholder="Scan Index"
                 onBlur={(event) => this.getScan(parseInt(event.target.value, 10))}/>
        </div>
        <div>
          <ScanList dataFileKey={this.state.dataFileKey} getScan={this.getScan.bind(this)}/>
        </div>
      </div>
    );
  }
}

export default App;
