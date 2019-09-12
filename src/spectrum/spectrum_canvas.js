import * as d3 from "d3"
import * as _ from "lodash"


let defaultMargins = {
    top: 10,
    right: 30,
    bottom: 50,
    left: 90
}

let defaultWidth = 860 - defaultMargins.left - defaultMargins.right
let defaultHeight = 400 - defaultMargins.top - defaultMargins.bottom


let DEFAULT_COLOR_CYCLE = [
    "steelblue",
    "crimson",
    "lightseagreen",
    "blueviolet",
    "midnightblue",
    "limegreen",
    "firebrick",
    "goldenrod"
]


class ColorCycle {
    constructor(colors) {
        if(colors === undefined) {
            colors = Array.from(DEFAULT_COLOR_CYCLE)
        }
        this.colors = colors
        this.index = 0
        this.length = this.colors.length
    }

    nextColor() {
        if(this.index >= this.length){
            this.index = 0
        }
        let color = this.colors[this.index]
        this.index++
        return color
    }

    reset() {
        this.index = 0
    }
}


export default class SpectrumCanvas {
    constructor(containerSelector, width, height, margins) {
        console.log("Creating a Canvas")
        this.containerSelector = containerSelector

        this.width = width || defaultWidth
        this.height = height || defaultHeight
        this.margins = margins

        if (this.margins === undefined) {
            this.margins = defaultMargins
        }

        this.container = null
        this.xScale = null
        this.yScale = null
        this.xAxis = null
        this.yAxis = null

        this.clip = null

        this.brush = null

        this.idledTimeout = null

        this.layers = []
        this.colorCycle = new ColorCycle()
    }

    addLayer(layer) {
        this.layers.push(layer)
        if (this.container) {
            layer.initArtist(this)
            this.render()
        }
    }

    addLayers(layers){
        for(let layer of layers){
            this.layers.push(layer)
            if(this.container){
                layer.initArtist(this)
            }
        }
        if(this.container){
            this.render()
        }
    }

    clear() {
        this.remove()
        this.layers = []
    }

    minMz() {
        if (this.layers.length === 0) {
            return 0
        }
        return Math.max(0, Math.min.apply(null, this.layers.map(d => d.minMz())) - 50)
    }

    maxMz() {
        if (this.layers.length === 0) {
            return 0
        }
        return Math.max.apply(null, this.layers.map(d => d.maxMz()))
    }

    minIntensity() {
        if(this.layers.length === 0){
            return 0
        }
        return Math.min.apply(null, this.layers.map(d => d.minIntensity()))
    }

    maxIntensity() {
        if (this.layers.length === 0) {
            return 0
        }
        return Math.max.apply(null, this.layers.map(d => d.maxIntensity()))
    }

    maxIntensityBetween(lowMz, highMz) {
        return Math.max.apply(null, this.layers.map(layer => layer.between(lowMz, highMz).maxIntensity()))
    }

    initContainer() {
        if(!this.container){
            // Initialize the SVG container for the first time. Do not do this again because this element is
            // not removed by its own .remove()
            this.container = d3.select(this.containerSelector).append('svg')
                .attr("width", this.width + this.margins.left + this.margins.right).attr(
                    "height", this.height + this.margins.top + this.margins.bottom).append("g").attr(
                        "transform", `translate(${this.margins.left}, ${this.margins.right})`)
        }
        // Initialize the supporting properties
        this.xScale = d3.scaleLinear()
            .domain([this.minMz(), this.maxMz()])
            .range([0, this.width])
        this.yScale = d3.scaleLinear()
            .domain([this.minIntensity(), this.maxIntensity()])
            .range([this.height, 0])
        this.xAxis = this.container.append("g")
            .attr('transform', `translate(0, ${this.height})`)
            .call(d3.axisBottom(this.xScale))


        this.yAxis = this.container.append("g").call(d3.axisLeft(this.yScale))

        this.clip = this.container.append("defs").append("svg:clipPath")
            .attr('id', "clip")
            .append('svg:rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('x', 0).attr('y', 0)

        this.brush = d3.brushX()
            .extent([
                [0, 0],
                [this.width, this.height]
            ])
            // throttle this call to avoid one call to updateChart per layer
            .on("end", _.throttle(() => this.updateChart(), 200, {trailing: false}))


        this.container.on("dblclick", () => {
            console.log("Resetting Canvas...")
            this.xScale.domain([this.minMz(), this.maxMz()])
            this.xAxis.transition().call(d3.axisBottom(this.xScale))
            this.yScale.domain([this.minIntensity(), this.maxIntensity()])
            this.yAxis.transition().call(d3.axisLeft(this.yScale))
            this.layers.map(layer => layer.redraw(this))
        })

        this.yLabel = this.container.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - this.margins.left)
            .attr("x", 0 - (this.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Relative Intensity");

        this.xLabel = this.container.append("text")
            .attr("transform",
                "translate(" + (this.width / 2) + " ," +
                (this.height + this.margins.top + 20) + ")")
            .style("text-anchor", "middle")
            .text("m/z");
    }

    remove() {
        // Remove all elements from the DOM
        this.yAxis.remove()
        this.xAxis.remove()
        this.xLabel.remove()
        this.yLabel.remove()
        this.layers.map((layer) => layer.remove())
        this.container.exit().remove()
    }

    render() {
        // If this object has been initialized already, remove the existing
        // elements from the DOM before re-initializing and drawing.
        if (this.container) {
            this.remove()
        }

        this.initContainer()
        if(this.layers.length > 0){
            this.draw()
        }
    }

    _idled() {
        this.idleTimeout = null
    }

    updateChart() {
        let extent = d3.event.selection
        console.log(extent, this.idleTimeout)
        if (!extent) {
            if (!this.idleTimeout) {
                this.idleTimeout = setTimeout(() => this._idled(), 350)
                return this.idleTimeout
            }
            console.log("In updateChart without extent")
            this.xScale.domain([this.minMz(), this.maxMz()])
            this.yScale.domain([this.minIntensity(), this.maxIntensity()])
        } else {
            let minMz = this.xScale.invert(extent[0])
            let maxMz = this.xScale.invert(extent[1])
            let maxIntensity = this.maxIntensityBetween(minMz, maxMz) + 100.0
            console.log("In updateChart with extent", minMz, maxMz, maxIntensity)
            this.xScale.domain([minMz, maxMz])
            this.yScale.domain([0, maxIntensity])
            // This remove the grey brush area as soon as the selection has been done
            this.layers.map(layer => layer.onBrush(this.brush))
        }
        this.xAxis.transition().duration(100).call(d3.axisBottom(this.xScale))
        this.yAxis.transition().duration(100).call(d3.axisLeft(this.yScale))
        this.layers.map(layer => layer.redraw(this))
    }

    draw() {
        // this.colorCycle.reset()
        this.layers.map(layer => layer.initArtist(this))
    }


}
