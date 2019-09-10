import React, {Component} from "react"
import SpectrumCanvas from "./spectrum_canvas"


export default class SpectrumCanvasComponent extends Component {
    constructor(props) {
        super(props)
        this.state = {
            "canvas": new SpectrumCanvas("#spectrum-canvas-container"),
        }
    }

    componentDidMount() {
        console.log("componentDidMount", this.props.layers)
        this.state.canvas.addLayers(this.props.layers)
        this.state.canvas.render()
    }

    componentDidUpdate(prevProps) {
        console.log("componentDidUpdate", prevProps)
        if(this.props.layers !== prevProps.layers){
            this.state.canvas.clear()
            this.state.canvas.addLayers(this.props.layers)
            this.state.canvas.render()
        }
    }

    render() {
        return (
            <div className="spectrum-canvas" id="spectrum-canvas-container">
            </div>
        )
    }
}