import React, { Component } from 'react';
import './App.css';
import {ProfileLayer} from './spectrum/spectrum_layers.js'
import SpectrumCanvasComponent from "./spectrum/component.js"


class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      layers: [],
      dataFileKey: 0,
      scanId: null
    }
  }

  getScan(scanIndex) {
    let scanId = `controllerType=0 controllerNumber=1 scan=${scanIndex + 1}`
    let request = fetch(`http://localhost:5000/scan/${this.state.dataFileKey}/${scanId}`)
    request.then(response => {
      return response.json()
    }).then(data => {
      let layer = new ProfileLayer(data.mz, data.intensity)
      console.log(layer)
      let newState = Object.assign({}, this.state)
      newState.layers = [layer]
      newState.scanId = scanId
      console.log("newState", newState)
      this.setState(newState)
    })
  }

  render() {
    const {layers} = this.state
    const self = this
    return (
      <div className="App">
        <h1>Hello, React</h1>
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
      </div>
    );
  }
}

export default App;
