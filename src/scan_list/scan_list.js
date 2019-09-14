import React, { Component } from "react"


// Layout based upon https://stackoverflow.com/questions/48749090/fixed-header-flex-table-header-vertical-align

export default class ScanList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dataFileKey: props.dataFileKey,
            getScan: props.getScan,
            records: [],
            checksum: -1
        }
    }

    fetchRecords() {
        let request = fetch(`http://localhost:5000/index/${this.state.dataFileKey}`)
        request.then(response => response.json()).then(data => {
            console.log("Fetched Records", data)
            let newState = Object.assign({}, this.state)
            newState.records = data.records
            newState.checksum = data.records.length
            this.setState(newState)
        })
        this.handleClick = this.handleClick.bind(this)
    }

    handleClick(e) {
        e.preventDefault()
        let element = e.target
        while(!element.classList.contains("scan-record")) {
            element = element.parentElement
            if(element === null || element === undefined) {
                return
            }
        }
        if (element.classList.contains("scan-record")) {
            this.state.getScan(undefined, element.dataset.scanId)
        }
    }

    makeRow(record) {
        return <tr className={`scan-record ms-level-${record.ms_level > 1 ? 'n' : '1'}`} key={record.scan_id} data-scan-id={record.scan_id} onClick={this.handleClick}>
            <td className="scan-attrib">{record.scan_id}</td>
            <td className="scan-attrib">{record.scan_time.toFixed(3)}</td>
            <td className="scan-attrib">{record.ms_level}</td>
            <td className="scan-attrib">{record.mz !== undefined ? record.mz.toFixed(3) : '\u00A0'}</td>
            <td className="scan-attrib">{record.charge !== undefined ? record.charge : '\u00A0'}</td>
            <td className="scan-attrib">{record.activation !== undefined ? record.activation.method : '\u00A0'}</td>
        </tr>
    }

    componentDidMount() {
        this.fetchRecords()
    }

    shouldComponentUpdate(nextProps, nextState){
        if(nextState.checksum === this.state.checksum){
            return false
        }
        return true
    }

    componentDidUpdate(prevProps) {
        console.log("Updated", this)
    }

    render() {
        let rows = this.state.records.map(this.makeRow.bind(this))
        console.log("Render", rows)
        return(
            <table className='scan-list-container'>
                <thead className="scan-record-header">
                    <tr>
                        <th className="scan-attrib">Scan ID</th>
                        <th className="scan-attrib">Scan Time</th>
                        <th className="scan-attrib">MS Level</th>
                        <th className="scan-attrib">Precursor m/z</th>
                        <th className="scan-attrib">Precursor Charge</th>
                        <th className="scan-attrib">Activation</th>
                    </tr>
                </thead>
                <tbody className="scan-record-body">
                    {rows}
                </tbody>
            </table>
        )
    }
}
