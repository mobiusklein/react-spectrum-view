import * as d3 from "d3";


export class DataLayer {
    constructor(length) {
        this.length = length
    }

    [Symbol.iterator]() {
        let self = this
        let i = 0
        const iterator = {
            next() {
                if (i >= self.length) {
                    return { value: null, done: true }
                }
                const value = self.get(i)
                i++
                return { "value": value, done: false }
            }
        }
        return iterator
    }

    asArray() {
        return Array.from(this)
    }

    maxMz() {
        const point = this.get(this.length - 1)
        return point.mz
    }

    minMz() {
        const point = this.get(0)
        return point.mz
    }

    maxIntensity() {
        let maxValue = 0
        for (let point of this) {
            if (point.intensity > maxValue) {
                maxValue = point.intensity
            }
        }
        return maxValue
    }

    minIntensity() {
        return 0
    }

    searchMz(mz) {
        if (mz > this.maxMz()) {
            return this.length - 1
        }
        else if (mz < this.minMz()) {
            return 0
        }
        let lo = 0
        let hi = this.length - 1

        while (hi !== lo) {
            let mid = Math.trunc((hi + lo) / 2)
            let value = this.get(mid).mz
            let diff = value - mz
            if (Math.abs(diff) < 1e-3) {
                return mid
            }
            else if (hi - lo === 1) {
                return mid
            }
            else if (diff > 0) {
                hi = mid
            } else {
                lo = mid
            }
        }
        return 0
    }

    slice(begin, end) {
        throw new Error("Not Implemented");
    }

    between(beginMz, endMz) {
        return this.slice(this.searchMz(beginMz), this.searchMz(endMz))
    }

    onBrush(brush) {
        this.line.select(".brush").call(brush.move, null)
    }

    redraw(canvas) {
        this.line.select(".line").transition(100)
            .attr("d", d3.line().x(d => canvas.xScale(d.mz)).y(d => canvas.yScale(d.intensity)))
    }

    remove() {
        this.line.remove()
        this.path.remove()
    }

    initArtist(canvas) {
        this.line = canvas.container.append("g").attr("clip-path", "url(#clip)")
        let points = this.asArray()

        this.path = this.line.append("path").datum(points).attr("class", "line").attr("fill", "none")
            .attr("stroke", "steelblue").attr("stroke-width", 1.5)

        let path = d3.line().x(
            d => canvas.xScale(d.mz)).y(
                d => canvas.yScale(d.intensity))

        this.path.attr("d", path)

        this.line.append("g")
            .attr("class", "brush")
            .call(canvas.brush);
    }
}


export class ProfileLayer extends DataLayer {
    constructor(mz, intensity) {
        super(mz.length)
        this.mz = mz
        this.intensity = intensity
        this.line = null
    }

    get(i) {
        return {
            mz: this.mz[i],
            intensity: this.intensity[i]
        }
    }

    slice(begin, end) {
        return new ProfileLayer(this.mz.slice(begin, end), this.intensity.slice(begin, end))
    }
}


export class PointLayer extends DataLayer {
    constructor(points) {
        super(points.length)
        this.points = points
        this.line = null
    }

    get(i) {
        return this.points[i]
    }

    slice(begin, end) {
        return new PointLayer(this.points.slice(begin, end))
    }
}
