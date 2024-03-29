import * as d3 from "d3";

const defaultColor = "steelblue";


function diff(x) {
  const diffs = []
  for(let i = 1; i < x.length; i++ ) {
    diffs.push(x[i] - x[i - 1])
  }
  return diffs
}


const sum = (x) => x.reduce((a, v) => v + a, 0)

const mean = (x) => sum(x) / x.length

const subsampleResolutionSpacing = (x, desiredResolution) => {
  const keptIndices = [0]

  for(let i = 1; i < x.length; i++) {
    if ((x[i] - x[keptIndices[keptIndices.length - 1]]) > desiredResolution) {
      keptIndices.push(i)
    }
  }
  if (keptIndices[keptIndices.length - 1] != x.length - 1) {
    keptIndices.push(x.length - 1)
  }
  return keptIndices
}


const arrayMask = (x, ii) => ii.map(i => x[i])


function pointToProfile(points) {
  const result = [];
  for (const point of points) {
    const beforePoint = Object.assign({}, point);
    const afterPoint = Object.assign({}, point);
    beforePoint.mz -= 1e-6;
    beforePoint.intensity = -1;
    result.push(beforePoint);
    result.push(point);
    afterPoint.mz += 1e-6;
    afterPoint.intensity = -1;
    result.push(afterPoint);
  }
  return result;
}

export class SpectrumData {
  asArray() {
    return Array.from(this);
  }

  [Symbol.iterator]() {
    let self = this;
    let i = 0;
    const iterator = {
      next() {
        if (i >= self.length) {
          return { value: null, done: true };
        }
        const value = self.get(i);
        i++;
        return { value: value, done: false };
      },
    };
    return iterator;
  }

  maxMz() {
    if (this.length === 0) {
      return 0;
    }
    const point = this.get(this.length - 1);
    return point.mz;
  }

  minMz() {
    if (this.length === 0) {
      return 0;
    }
    const point = this.get(0);
    return point.mz;
  }

  minCoordinate() {
    return this.minMz()
  }

  maxCoordinate() {
    return this.maxMz()
  }

  maxIntensity() {
    let maxValue = 0;
    for (let point of this) {
      if (point.intensity > maxValue) {
        maxValue = point.intensity;
      }
    }
    return maxValue;
  }

  minIntensity() {
    return 0;
  }

  searchMz(mz) {
    if (mz > this.maxMz()) {
      return this.length - 1;
    } else if (mz < this.minMz()) {
      return 0;
    }
    let lo = 0;
    let hi = this.length - 1;

    while (hi !== lo) {
      let mid = Math.trunc((hi + lo) / 2);
      let value = this.get(mid).mz;
      let diff = value - mz;
      if (Math.abs(diff) < 1e-3) {
        let bestIndex = mid;
        let bestError = Math.abs(diff);
        let i = mid;
        while (i > -1) {
          value = this.get(i).mz;
          diff = Math.abs(value - mz);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i--;
        }
        i = mid + 1;
        while (i < this.length) {
          value = this.get(i).mz;
          diff = Math.abs(value - mz);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i++;
        }
        return bestIndex;
      } else if (hi - lo === 1) {
        let bestIndex = mid;
        let bestError = Math.abs(diff);
        let i = mid;
        while (i > -1) {
          value = this.get(i).mz;
          diff = Math.abs(value - mz);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i--;
        }
        i = mid + 1;
        while (i < this.length) {
          value = this.get(i).mz;
          diff = Math.abs(value - mz);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i++;
        }
        return bestIndex;
      } else if (diff > 0) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return 0;
  }

  matchMz(mz, errorTolerance) {
    let i = this.searchMz(mz)
    let pt = this.get(i)
    if (Math.abs(pt.mz - mz) / mz < errorTolerance) {
      return pt
    }
    return null
  }

  slice(begin, end) {
    throw new Error("Not Implemented");
  }

  between(beginMz, endMz) {
    return this.slice(this.searchMz(beginMz), this.searchMz(endMz));
  }
}

export class DataLayer extends SpectrumData {
  constructor(metadata) {
    super();
    this.metadata = metadata;
    this._color = null;
  }

  sortMz() {
    return Array.from(this.points).sort((a, b) => {
      if (a.mz < b.mz) {
        return -1;
      } else if (a.mz > b.mz) {
        return 1;
      } else {
        return 0;
      }
    })
  }

  get color() {
    return this._color === null ? defaultColor : this._color;
  }

  set color(value) {
    this._color = value;
  }

  get layerType() {
    return "data";
  }

  onBrush(brush) {
    // console.log("onBrush", this)
    this.line.select(".brush").call(brush.move, null);
  }

  onHover(canvas, cursorInfo) {
    return;
  }

  redraw(canvas) {
    this.line
      .select(".line")
      .transition(100)
      .attr(
        "d",
        d3
          .line()
          .x((d) => canvas.xScale(d.mz))
          .y((d) => canvas.yScale(d.intensity))
      );
  }

  remove() {
    this.line.remove();
    this.path.remove();
  }

  buildPath(canvas) {
    const path = d3
      .line()
      .x((d) => canvas.xScale(d.mz))
      .y((d) => canvas.yScale(d.intensity));
    return path;
  }

  _makeData() {
    return this.asArray();
  }

  styleArtist(path) {
    return path
      .attr("stroke", this.color)
      .attr("stroke-width", 1.5)
      .attr("fill", "none");
  }

  initArtist(canvas) {
    this.line = canvas.container.append("g").attr("clip-path", "url(#clip)");
    this.color = canvas.colorCycle.nextColor();
    const points = this._makeData();

    this.path = this.styleArtist(
      this.line
        .append("path")
        .datum(points)
        .attr("class", `line ${this.layerType}`)
    );

    this.path.attr("d", this.buildPath(canvas));

    this.brushPatch = this.line
      .append("g")
      .attr("class", "brush")
      .call(canvas.brush);
  }
}

export class LineArtist extends SpectrumData {
  constructor(points, metadata) {
    super();
    this.points = points;
    this.points = this.sortMz()
    this.length = points.length;
    this.line = null;
    this.label = metadata.label ? metadata.label : "";
    this.color = metadata.color ? metadata.color : defaultColor;
  }

  sortMz() {
    return Array.from(this.points).sort((a, b) => {
      if (a.mz < b.mz) {
        return -1;
      } else if (a.mz > b.mz) {
        return 1;
      } else {
        return 0;
      }
    })
  }

  get(i) {
    return this.points[i];
  }

  remove() {
    this.line.remove();
    this.path.remove();
  }

  _makeData() {
    const result = pointToProfile(this.points);
    return result;
  }

  buildPath(canvas) {
    const path = d3
      .line()
      .x((d) => canvas.xScale(d.mz))
      .y((d) => canvas.yScale(d.intensity));
    return path;
  }

  styleArtist(path) {
    return path
      .attr("stroke", this.color)
      .attr("stroke-width", 2.5)
      .attr("fill", "none");
  }

  initArtist(canvas) {
    this.line = canvas.container.append("g").attr("clip-path", "url(#clip)");
    const points = this._makeData();

    this.path = this.styleArtist(
      this.line
        .append("path")
        .datum(points)
        .attr("class", `line ${this.layerType}`)
    );

    this.path.attr("d", this.buildPath(canvas));
  }
}

export class ProfileLayer extends DataLayer {
  constructor(mz, intensity, metadata) {
    super(metadata);
    this.subsample = false
    if(mz.length > 5e4) {
      this.subsample = true
    }
    this.length = mz.length;
    this.mz = mz;
    this.intensity = intensity;
    this.line = null;
    console.log(this)
  }

  _makeData() {
    if (this.subsample) {
      const spacing = subsampleResolutionSpacing(this.mz, 0.005)
      const subsampledMz = arrayMask(this.mz, spacing)
      const subsampledIntensity = arrayMask(this.intensity, spacing)
      console.log(`Subsampling ${this.length} to ${subsampledMz.length} (${subsampledMz.length / this.length})`)
      return subsampledMz.map((mz, i) => {
        return {"mz": mz, "intensity": subsampledIntensity[i]}
      })
    } else {
      return this.asArray();
    }
  }

  get(i) {
    return {
      mz: this.mz[i],
      intensity: this.intensity[i],
    };
  }

  get basePeak() {
    let bestIndex = 0
    let bestValue = -1
    for(let i = 0; i < this.length; i++) {
      let val = this.intensity[i]
      if (val > bestValue) {
        bestValue = val
        bestIndex = i
      }
    }
    return {mz: this.mz[bestIndex], intensity: this.intensity[bestIndex]}
  }

  slice(begin, end) {
    return new ProfileLayer(
      this.mz.slice(begin, end),
      this.intensity.slice(begin, end)
    );
  }

  get layerType() {
    return "profile-layer";
  }
}

export class PointLayer extends DataLayer {
  constructor(points, metadata) {
    super(metadata);
    this.points = points;
    this.points.sort((a, b) => {
      if (a.mz < b.mz) {
        return -1;
      } else if (a.mz > b.mz) {
        return 1;
      } else {
        return 0;
      }
    });
    this.length = points.length;
    this.line = null;
    this.label = null;
  }

  get basePeak() {
    return this.points.reduce((a, b) => (a.intensity > b.intensity) ? a : b)
  }

  get(i) {
    return this.points[i];
  }

  get layerType() {
    return "centroid-layer";
  }

  slice(begin, end) {
    return new PointLayer(this.points.slice(begin, end));
  }

  _makeData() {
    const result = pointToProfile(this);
    return result;
  }

  onHover(canvas, cursorInfo) {
    let mz = cursorInfo.mz;
    let index = this.searchMz(mz);
    let peak = this.get(index);
    if (peak === undefined) {
      return;
    }
    if (Math.abs(peak.mz - mz) > 0.3) {
      if (this.label !== null) {
        this.label.remove();
        this.label = null;
      }
      return;
    }
    let mzPosition = canvas.xScale(peak.mz);
    let intensityPosition = canvas.yScale(peak.intensity);
    if (this.label !== null) {
      this.label.remove();
    }
    this.label = canvas.container
      .append("g")
      .attr("transform", `translate(${mzPosition},${intensityPosition - 10})`);
    this.label
      .append("text")
      .text(peak.mz.toFixed(3))
      .style("text-anchor", "middle")
      .attr("class", "cursor-label");
  }

  remove() {
    super.remove();
    if (this.label !== null) {
      this.label.remove();
    }
  }
}

const neutralMass = (mz, charge) => {
  return mz * Math.abs(charge) - charge * 1.007;
};

const pointNeutralMass = (point) => {
  neutralMass(point.mz, point.charge)
}

export class NeutralMassPointLayer extends PointLayer {
  constructor(points, metadata) {
    super(points, metadata)
    this.pointsByMass = this.sortMass()
  }

  sortMass() {
    return Array.from(this.points).sort((a, b) => {
      if (pointNeutralMass(a) < pointNeutralMass(b)) {
        return -1;
      } else if (pointNeutralMass(a) > pointNeutralMass(b)) {
        return 1;
      } else {
        return 0;
      }
    })
  }

  maxMass() {
    return pointNeutralMass(this.pointsByMass[this.pointsByMass.length - 1])
  }

  minMass() {
    return pointNeutralMass(this.pointsByMass[0])
  }

  getOverMass(i) {
    return this.pointsByMass[i]
  }

  searchMass(mass) {
    if (mass > this.maxMass()) {
      return this.length - 1;
    } else if (mass < this.minMass()) {
      return 0;
    }
    let lo = 0;
    let hi = this.length - 1;

    while (hi !== lo) {
      let mid = Math.trunc((hi + lo) / 2);
      let value = pointNeutralMass(this.getOverMass(mid));
      let diff = value - mass;
      if (Math.abs(diff) < 1e-3) {
        let bestIndex = mid;
        let bestError = Math.abs(diff);
        let i = mid;
        while (i > -1) {
          value = pointNeutralMass(this.getOverMass(i));
          diff = Math.abs(value - mass);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i--;
        }
        i = mid + 1;
        while (i < this.length) {
          value = pointNeutralMass(this.getOverMass(i));
          diff = Math.abs(value - mass);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i++;
        }
        return bestIndex;
      } else if (hi - lo === 1) {
        let bestIndex = mid;
        let bestError = Math.abs(diff);
        let i = mid;
        while (i > -1) {
          value = pointNeutralMass(this.getOverMass(i));
          diff = Math.abs(value - mass);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i--;
        }
        i = mid + 1;
        while (i < this.length) {
          value = pointNeutralMass(this.getOverMass(i));
          diff = Math.abs(value - mass);
          if (diff < bestError) {
            bestIndex = i;
            bestError = diff;
          } else {
            break;
          }
          i++;
        }
        return bestIndex;
      } else if (diff > 0) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    return 0;
  }

  matchMass(mass, errorTolerance) {
    let i = this.searchMass(mass)
    let pt = this.getOverMass(i)
    if (Math.abs(pointNeutralMass(pt) - mass) / mass < errorTolerance) {
      return pt
    }
    return null
  }
}

export class LabeledPeakLayer extends NeutralMassPointLayer {
  constructor(points, metadata){
    super(points, metadata)
    this._color = this.metadata.color
    this.seriesLabel = this.metadata.seriesLabel || 'labeled-peaks-' + Math.floor(Math.random() * 1e16)
  }

  initArtist(canvas) {
    this.line = canvas.container.append("g").attr("clip-path", "url(#clip)");
    const points = this._makeData();

    this.path = this.styleArtist(
      this.line
        .append("path")
        .datum(points)
        .attr("class", `line ${this.layerType}`)
    );

    this.path.attr("d", this.buildPath(canvas));
    this._drawLabels(canvas)
  }

  _drawLabels(canvas) {
    if(this.labels) {
      this.labels.remove()
    }
    this.labels = canvas.container.selectAll(
      `text.peak-label.${this.seriesLabel}`).data(
        this.points).enter().append('g').attr("class", `label-${this.seriesLabel}`).attr(
          "transform", (d) => `translate(${canvas.xScale(d.mz)},${canvas.yScale(d.intensity) - 10})`)
      .append("text").text(d => d.label).attr("text-anchor", 'middle')
  }

  redraw(canvas) {
    super.redraw(canvas)
    this._drawLabels(canvas)
  }

  remove() {
    super.remove()
    if(this.labels){
      this.labels.remove()
    }
  }
}

export class DeconvolutedLayer extends NeutralMassPointLayer {
  constructor(points, metadata) {
    super(points, metadata);
    this.patternContainer = null;
    this.patternLine = null;
    this.patternColor = null;
  }

  get layerType() {
    return "deconvoluted-layer";
  }

  onHover(canvas, cursorInfo) {
    super.onHover(canvas, cursorInfo);
    const mz = cursorInfo.mz;
    let index = this.searchMz(mz);
    const peak = this.get(index);
    if (peak === undefined) {
      return;
    }
    if (Math.abs(peak.mz - mz) > 1.5) {
      if (this.patternContainer) {
        this.patternContainer.remove();
        this.patternContainer = null;
      }
      if (this.patternLine) {
        this.patternLine.remove();
        this.patternLine = null;
      }
      return;
    }
    if (!this.patternColor) {
      const patternColor = d3.rgb(this.color);
      const totalChannels =
        ((patternColor.r + patternColor.g + patternColor.b) * 1.0) / (125 * 3);
      console.log(this.color, totalChannels);
      if (totalChannels < 0.5) {
        this.patternColor = patternColor.brighter(2);
      } else {
        this.patternColor = patternColor.darker(1);
      }
    }
    let averageMz = 0;
    let totalIntensity = 0;
    // let apexPosition = 0;
    let apexIntensity = 0;
    // let i = 0;
    for (let envelopePoint of peak.envelope) {
      averageMz += envelopePoint.mz * envelopePoint.intensity;
      totalIntensity += envelopePoint.intensity;
      if (envelopePoint.intensity > apexIntensity) {
        apexIntensity = envelopePoint.intensity;
        // apexPosition = i;
      }
      // i++;
    }
    const apexMz = averageMz / totalIntensity;
    const apexMzPosition = canvas.xScale(apexMz);
    const apexIntensityPosition = canvas.yScale(apexIntensity * 1.2);
    if (this.patternContainer) {
      this.patternContainer.remove();
    }
    this.patternContainer = canvas.container
      .append("g")
      .attr(
        "transform",
        `translate(${apexMzPosition},${apexIntensityPosition - 10})`
      );
    this.patternContainer
      .append("text")
      .text(neutralMass(peak.mz, peak.charge).toFixed(3) + `, z=${peak.charge}`)
      .style("text-anchor", "middle")
      .attr("class", "cursor-label envelope-label");

    if (this.patternLine) {
      this.patternLine.remove();
    }
    this.patternLine = new LineArtist(peak.envelope, {
      color: this.patternColor,
    });
    this.patternLine.initArtist(canvas);
  }

  remove() {
    super.remove();
    if (this.patternContainer) {
      this.patternContainer.remove();
      this.patternContainer = null;
    }
    if (this.patternLine) {
      this.patternLine.remove();
    }
  }
}

class AbstractPointLayer extends PointLayer {
  slice(begin, end) {
    return new PointLayer([]);
  }
}

export class PrecursorPeakLayer extends AbstractPointLayer {
  constructor(peak, metadata) {
    super([peak], metadata);
    this.mz = peak.mz;
    this.intensity = peak.intensity;
    this.charge = peak.charge;
    this.precursorLabel = null;
  }

  maxIntensity() {
    return 1;
  }

  get layerType() {
    return "precursor-layer";
  }

  addLabel(canvas) {
    const lines = [
      `Prec. m/z: ${this.mz.toFixed(3)}`,
      `Prec. z: ${this.charge}`,
      `Prec. mass: ${neutralMass(this.mz, this.charge).toFixed(3)}`,
    ];

    this.precursorLabel = canvas.container
      .append("text")
      .attr(
        "transform",
        `translate(${canvas.width * 0.85},${canvas.height * 0.02})`
      )
      .style("text-anchor", "left")
      .attr("class", "precursor-label");
    this.precursorLabel
      .selectAll("tspan.precursor-label-row")
      .data(lines)
      .enter()
      .append("tspan")
      .attr("dx", 10)
      .attr("dy", 16)
      .attr("x", 0)
      .text((d) => d);
  }

  initArtist(canvas) {
    super.initArtist(canvas);
    this.addLabel(canvas);
  }

  styleArtist(path) {
    let gapSize = 10;
    let dashSize = 5;
    return super
      .styleArtist(path)
      .attr("stroke-dasharray", `${dashSize} 1 ${gapSize}`);
  }

  remove() {
    super.remove();
    if (this.precursorLabel) {
      this.precursorLabel.remove();
    }
  }
}

export class IsolationWindowLayer extends AbstractPointLayer {
  constructor(windows, height, metadata) {
    super(IsolationWindowLayer._splitWindows(windows, height), metadata);
    this.windows = windows;
    this.height = height;
  }

  maxIntensity() {
    return 1;
  }

  get layerType() {
    return "isolation-window-layer";
  }

  onHover(canvas, cursorInfo) {
    return;
  }

  static _splitWindows(windows, height) {
    let points = [];
    for (let window of windows) {
      points.push({ mz: window.lower_bound, intensity: height });
      points.push({ mz: window.upper_bound, intensity: height });
    }
    return points;
  }

  styleArtist(path) {
    let gapSize = 5;
    let dashSize = 5;
    return super
      .styleArtist(path)
      .attr("stroke-dasharray", `${dashSize} ${gapSize}`);
  }
}
