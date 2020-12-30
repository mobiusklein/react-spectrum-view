import * as d3 from "d3";
import _ from "lodash";

let defaultMargins = {
  top: 10,
  right: 30,
  bottom: 50,
  left: 90,
};

let defaultWidth = 1200 - defaultMargins.left - defaultMargins.right;
let defaultHeight = 500 - defaultMargins.top - defaultMargins.bottom;

let DEFAULT_COLOR_CYCLE = [
  "steelblue",
  "blueviolet",
  "midnightblue",
  "lightseagreen",
  "limegreen",
  "goldenrod",
  "firebrick",
  "crimson",
];

class ColorCycle {
  constructor(colors) {
    if (colors === undefined) {
      colors = Array.from(DEFAULT_COLOR_CYCLE);
    }
    this.colors = colors;
    this.index = 0;
    this.length = this.colors.length;
  }

  nextColor() {
    if (this.index >= this.length) {
      this.index = 0;
    }
    let color = this.colors[this.index];
    this.index++;
    return color;
  }

  reset() {
    this.index = 0;
  }
}

export default class SpectrumCanvas {
  constructor(containerSelector, width, height, margins) {
    console.log("Creating a Canvas");
    this.containerSelector = containerSelector;

    this.width = width || defaultWidth;
    this.height = height || defaultHeight;
    this.margins = margins;

    if (this.margins === undefined) {
      this.margins = defaultMargins;
    }

    this.container = null;
    this.xScale = null;
    this.yScale = null;
    this.xAxis = null;
    this.yAxis = null;

    this.xLabel = null;
    this.yLabel = null;

    this.pointerMZLabel = null;
    this.pointerIntensityLabel = null;

    this.clip = null;

    this.brush = null;

    this.idledTimeout = null;

    this.layers = [];
    this.colorCycle = new ColorCycle();

    this.extentMzInterval = [this.minMz(), this.maxMz()];
  }

  addLayer(layer) {
    this.layers.push(layer);
    if (this.container) {
      layer.initArtist(this);
      this.render();
    }
  }

  addLayers(layers) {
    for (let layer of layers) {
      this.layers.push(layer);
      if (this.container) {
        layer.initArtist(this);
      }
    }
    this.extentMzInterval = [this.minMz(), this.maxMz()];
    if (this.container) {
      this.render();
    }
  }

  clear() {
    this.remove();
    this.layers = [];
    this.extentMzInterval = [0, 0];
  }

  minMz() {
    if (this.layers.length === 0) {
      return 0;
    }
    return Math.max(
      0,
      Math.min.apply(
        null,
        this.layers.map((d) => d.minMz())
      ) - 50
    );
  }

  maxMz() {
    if (this.layers.length === 0) {
      return 0;
    }
    return Math.max.apply(
      null,
      this.layers.map((d) => d.maxMz())
    );
  }

  minIntensity() {
    if (this.layers.length === 0) {
      return 0;
    }
    return Math.min.apply(
      null,
      this.layers.map((d) => d.minIntensity())
    );
  }

  maxIntensity() {
    if (this.layers.length === 0) {
      return 0;
    }
    return Math.max.apply(
      null,
      this.layers.map((d) => d.maxIntensity())
    );
  }

  maxIntensityBetween(lowMz, highMz) {
    return Math.max.apply(
      null,
      this.layers.map((layer) => layer.between(lowMz, highMz).maxIntensity())
    );
  }

  initContainer() {
    if (!this.container) {
      // Initialize the SVG container for the first time. Do not do this again because this element is
      // not removed by its own .remove()
      this.container = d3
        .select(this.containerSelector)
        .append("svg")
        .attr("width", this.width + this.margins.left + this.margins.right)
        .attr("height", this.height + this.margins.top + this.margins.bottom)
        .append("g")
        .attr(
          "transform",
          `translate(${this.margins.left}, ${this.margins.right})`
        );
    }
    // Initialize the supporting properties
    this.xScale = d3
      .scaleLinear()
      .domain([this.minMz(), this.maxMz()])
      .range([0, this.width]);
    this.yScale = d3
      .scaleLinear()
      .domain([this.minIntensity(), this.maxIntensity() * 1.05])
      .range([this.height, 0]);
    this.xAxis = this.container
      .append("g")
      .attr("transform", `translate(0, ${this.height})`)
      .call(d3.axisBottom(this.xScale));

    this.yAxis = this.container.append("g").call(d3.axisLeft(this.yScale));

    this.clip = this.container
      .append("defs")
      .append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("x", 0)
      .attr("y", 0);

    this.brush = d3
      .brushX()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      // throttle this call to avoid one call to updateChart per layer
      .on(
        "end",
        _.throttle(() => this.updateChart(), 200, { trailing: false })
      );

    this.container.on("dblclick", () => {
      console.log("Resetting Canvas...");
      this.xScale.domain([this.minMz(), this.maxMz()]);
      this.xAxis.transition().call(d3.axisBottom(this.xScale));
      this.yScale.domain([this.minIntensity(), this.maxIntensity() * 1.05]);
      this.yAxis.transition().call(d3.axisLeft(this.yScale));
      this.layers.map((layer) => layer.redraw(this));
    });

    this.yLabel = this.container
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - this.margins.left)
      .attr("x", 0 - this.height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Relative Intensity");

    this.xLabel = this.container
      .append("text")
      .attr(
        "transform",
        "translate(" +
          this.width / 2 +
          " ," +
          (this.height + this.margins.top + 20) +
          ")"
      )
      .style("text-anchor", "middle")
      .text("m/z");

    this.pointerMZLabel = this.container
      .append("text")
      .attr(
        "transform",
        `translate(${this.width * 0.01},${this.height * 0.02})`
      )
      .style("text-anchor", "left")
      .attr("class", "cursor-label")
      .text("");

    this.pointerIntensityLabel = this.container
      .append("text")
      .attr(
        "transform",
        `translate(${this.width * 0.01},${this.height * 0.06})`
      )
      .style("text-anchor", "left")
      .attr("class", "cursor-label")
      .text("");

    let self = this;
    this.container.on("mousemove", function () {
      // Binds the coordinates within `this`, the component containing the event
      let mouse = d3.mouse(this);
      requestAnimationFrame((timestamp) => {
        let mzLabel = self.xScale.invert(mouse[0]);
        let intensityLabel = self.yScale.invert(mouse[1]);
        self.pointerMZLabel.text(
          `m/z = ${mzLabel > 0 ? mzLabel.toFixed(3) : "-"}`
        );
        self.pointerIntensityLabel.text(
          `Int. = ${intensityLabel > 0 ? intensityLabel.toExponential(2) : "-"}`
        );
        for (let layer of self.layers) {
          layer.onHover(self, { mz: mzLabel, intensity: intensityLabel });
        }
      });
    });
  }

  remove() {
    // Remove all elements from the DOM
    this.yAxis.remove();
    this.xAxis.remove();
    this.xLabel.remove();
    this.yLabel.remove();
    this.pointerMZLabel.remove();
    this.pointerIntensityLabel.remove();
    this.layers.map((layer) => layer.remove());
    this.container.exit().remove();
  }

  render() {
    // If this object has been initialized already, remove the existing
    // elements from the DOM before re-initializing and drawing.
    if (this.container) {
      this.remove();
    }

    this.initContainer();
    if (this.layers.length > 0) {
      this.draw();
    }
  }

  _idled() {
    this.idleTimeout = null;
  }

  setExtentByMz(minMz, maxMz) {
    if (minMz === undefined) {
      minMz = this.minMz();
    }
    if (maxMz === undefined) {
      maxMz = this.maxMz();
    }
    const maxIntensity = this.maxIntensityBetween(minMz, maxMz) + 100.0;
    this.extentMzInterval = [minMz, maxMz];
    this.xScale.domain([minMz, maxMz]);
    this.yScale.domain([0, maxIntensity * 1.05]);
    this.xAxis.transition().duration(100).call(d3.axisBottom(this.xScale));
    this.yAxis.transition().duration(100).call(d3.axisLeft(this.yScale));
    this.layers.map((layer) => layer.onBrush(this.brush));
    this.layers.map((layer) => layer.redraw(this));
  }

  updateChart() {
    let extent = d3.event.selection;
    if (!extent) {
      if (!this.idleTimeout) {
        this.idleTimeout = setTimeout(() => this._idled(), 350);
        return this.idleTimeout;
      }
      this.setExtentByMz(this.minMz(), this.maxMz());
    } else {
      const minMz = this.xScale.invert(extent[0]);
      const maxMz = this.xScale.invert(extent[1]);
      this.setExtentByMz(minMz, maxMz);
    }
  }

  draw() {
    this.colorCycle.reset();
    this.layers.map((layer) => layer.initArtist(this));
  }
}
