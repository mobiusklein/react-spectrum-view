import {PrecursorPeakLayer} from "./spectrum_layers.js"


export class PrecursorInformation {
    constructor(mz, charge, intensity, precursorId) {
        this.mz = mz
        this.charge = charge
        this.intensity = intensity
        this.precursorId = precursorId
    }

    static fromObject(obj) {
        return new PrecursorInformation(obj.mz, obj.charge, obj.intensity, obj.precursorId)
    }
}


export class Spectrum {
    constructor(layers, scanId, msLevel, scanTime, isProfile, precursorInformation) {
        super()
        this.layers = layers
        this.scanId = scanId
        this.msLevel = msLevel
        this.scanTime = scanTime
        this.isProfile = isProfile
        this.precursorInformation = precursorInformation
    }

    toLayers() {
        const layers = []
        layers.push(...this.layers)
        if(this.precursorInformation) {
            layers.push(
                new PrecursorPeakLayer({...this.precursorInformation}))
        }
        return layers
    }
}