import React, { Component } from 'react';
import './App.css';
import {ProfileLayer} from './spectrum/spectrum_layers.js'
import SpectrumCanvasComponent from "./spectrum/component.js"

import * as ExampleData from "./example_data.js"


class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      layers: []
    }
    this.makeLayer = this.makeLayer.bind(this)
  }

  makeLayer() {
    let exampleSpectrum = new ProfileLayer(ExampleData.PROFILE.mz, ExampleData.PROFILE.intensity)
    return exampleSpectrum
  }

  render() {
    const {layers} = this.state
    return (
      <div className="App">
        <h1>Hello, React</h1>
        <SpectrumCanvasComponent layers={layers}/>
        <button onClick={() => this.setState({layers: [this.makeLayer()]})}>
          Foo
        </button>
      </div>
    );
  }
}

export default App;
