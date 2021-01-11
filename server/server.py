import os
import functools

from uuid import uuid4
from threading import RLock, Thread

from flask import Flask, g, request, abort, jsonify

import ms_deisotope
from ms_deisotope import MSFileLoader
from ms_deisotope.output import json as msjson
from ms_deisotope.feature_map import ExtendedScanIndex, quick_index


app = Flask(__name__)

averagine_map = {
    "peptide": ms_deisotope.peptide,
    "glycan": ms_deisotope.glycan,
    "glycopeptide": ms_deisotope.glycopeptide
}

key_index = {}
metadata_index = {}
reader_index = {}


def cors(func, *origins):
    if not origins:
        origins = '*'
    origins = ', '.join(origins)
    @functools.wraps(func)
    def cors_func(*args, **kwargs):
        response = func(*args, **kwargs)
        print("origins:", origins)
        response.headers.add('Access-Control-Allow-Origin', origins)
        return response
    return cors_func


def load_index_file(path):
    try:
        index = metadata_index[path]
    except KeyError:
        with open(path, 'rt') as fh:
            index = ExtendedScanIndex.load(fh)
        metadata_index[path] = index
        return index


def process_scan(scan, params):
    if scan.ms_level == 1:
        ms1_scan_averaging = int(params.get("ms1-averaging") or 0)
        if ms1_scan_averaging > 0:
            scan = scan.average(ms1_scan_averaging)
    scan.pick_peaks()
    if scan.ms_level > 1:
        averagine_type = averagine_map.get(
            params.get("msn-averagine", "glycopeptide"),
            ms_deisotope.glycopeptide)
        truncate_to = 0.8
    else:
        averagine_type = averagine_map.get(
            params.get("ms1-averagine", "glycopeptide"),
            ms_deisotope.glycopeptide)
        truncate_to = 0.95
    scan.deconvolute(averagine=averagine_type, truncate_to=0.999,
                     incremental_truncation=truncate_to)
    return scan


def scan_to_json(scan):
    mz_array = scan.arrays.mz
    intensity_array = scan.arrays.intensity

    if scan.ms_level > 1:
        precursor = scan.precursor_information
        isolation_window = None
        if precursor is not None:
            precursor = {
                "mz": precursor.mz,
                "charge": precursor.charge,
                "intensity": precursor.intensity,
                "scan_id": scan.id,
            }
    else:
        isolation_window = []
        precursor_ions = []
        bunch = next(reader.start_from_scan(scan.id))
        for product in bunch.products:
            window = product.isolation_window
            if window is not None:
                isolation_window.append({
                    "lower_bound": window.lower_bound,
                    "upper_bound": window.upper_bound
                })
            precursor = product.precursor_information
            if precursor is not None:
                precursor_ions.append({
                    "mz": precursor.mz,
                    "charge": precursor.charge,
                    "intensity": precursor.intensity,
                    "scan_id": precursor.precursor_scan_id,
                })
        precursor = precursor_ions

    points = []
    for peak in scan.peak_set:
        points.append({'mz': peak.mz, "intensity": peak.intensity})

    deconvoluted_points = []
    for peak in scan.deconvoluted_peak_set:
        deconvoluted_points.append({
            "mz": peak.mz,
            "charge": peak.charge,
            "intensity": peak.intensity,
            "envelope": [
                {'mz': e.mz, 'intensity': e.intensity} for e in peak.envelope
            ]
        })

    result = dict(
        scan_id=scan.id,
        mz=mz_array.tolist(),
        intensity=intensity_array.tolist(),
        points=points,
        deconvoluted_points=deconvoluted_points,
        scan_time=scan.scan_time,
        ms_level=scan.ms_level,
        is_profile=scan.is_profile,
        precursor_information=precursor,
        isolation_window=isolation_window,
    )
    return result


def format_scan(scan, params):
    scan = process_scan(scan, params)
    response = jsonify(**scan_to_json(scan))
    return response


@app.route("/index/<key>", methods=["GET", "POST"])
@cors
def get_index(key):
    path = key_index[key]
    index = metadata_index[(path)]
    if request.method == "GET":
        records = []
        for key, value in index.ms1_ids.items():
            rec = value.to_dict()
            rec['scan_id'] = key
            rec['ms_level'] = 1
            records.append(rec)
        for key, value in index.msn_ids.items():
            rec = value.to_dict()
            rec['scan_id'] = key
            rec.setdefault('ms_level', 2)
            records.append(rec)
        records.sort(key=lambda x: x.get('scan_time', x['scan_id']))
        return jsonify(records=records, scan_count=len(records))


@app.route("/scan_index_to_id/<key>/<int:scan_index>", methods=["GET", "POST"])
@cors
def get_scan_from_index(key, scan_index):
    path = key_index[key]
    reader, lock = reader_index[path]
    values = request.values
    print(values)
    with lock:
        scan = reader.get_scan_by_index(scan_index)
        response = format_scan(scan, values)
    return response


@app.route("/scan/<key>/<string:scan_id>", methods=["GET", "POST"])
@cors
def get_scan(key, scan_id):
    path = key_index[key]
    reader, lock = reader_index[path]
    values = request.values
    print(values)
    with lock:
        scan = reader.get_scan_by_id(scan_id)
        response = format_scan(scan, values)
    return response


if __name__ == "__main__":
    import sys
    for i, path in enumerate(sys.argv[1:]):
        print("Loading {0} with Key {1}".format(path, i))
        reader = MSFileLoader(path)
        index_path = ExtendedScanIndex.index_file_name(path)
        if os.path.exists(index_path):
            file_index = ExtendedScanIndex.load(open(index_path, 'rt'))
        else:
            print("Indexing {0}".format(path))
            reader.reset()
            file_index, scan_tree = quick_index.index(reader)
            reader.reset()
            with open(index_path, 'wt') as fh:
                file_index.dump(fh)
        print(file_index)
        metadata_index[path] = file_index
        reader_index[path] = reader, RLock()
        key_index[str(i)] = path

    app.run(threaded=True)
