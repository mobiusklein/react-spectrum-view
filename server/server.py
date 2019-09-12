import os
import functools

from uuid import uuid4
from threading import RLock, Thread

from flask import Flask, g, request, abort, jsonify


from ms_deisotope import MSFileLoader
from ms_deisotope.feature_map import ExtendedScanIndex, quick_index


app = Flask(__name__)

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
        print(origins)
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


@app.route("/index/<key>", methods=["GET", "POST"])
@cors
def get_index(key):
    path = key_index[key]
    index = metadata_index[(path)]
    if request.method == "GET":
        ms1_ids = tuple(index.ms1_ids)
        msn_ids = tuple(index.msn_ids)
        key_index = []
        for key in ms1_ids:
            scan_info = index[key_index]
            print(scan_info)
            break
        return jsonify(ms1_ids=ms1_ids, msn_ids=msn_ids)
    elif request.method == "POST":
        start_index = int(request.values['start'])
        end_index = int(request.values['end'])


@app.route("/scan/<key>/<string:scan_id>", methods=["GET", "POST"])
@cors
def get_scan(key, scan_id):
    path = key_index[key]
    reader, lock = reader_index[path]
    with lock:
        scan = reader.get_scan_by_id(scan_id)
        mz_array = scan.arrays.mz
        intensity_array = scan.arrays.intensity
        scan.pick_peaks()
        points = []
        for peak in scan.peak_set:
            points.append({'mz': peak.mz, "intensity": peak.intensity})
    response = jsonify(
        scan_id=scan_id,
        mz=mz_array.tolist(),
        intensity=intensity_array.tolist(),
        points=points,
        scan_time=scan.scan_time,
        ms_level=scan.ms_level,
        is_profile=scan.is_profile,
    )
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
