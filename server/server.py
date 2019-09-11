from uuid import uuid4
from threading import RLock, Thread

from flask import Flask, g, request, abort, jsonify


from ms_deisotope import MSFileLoader
from ms_deisotope.feature_map import ExtendedScanIndex


app = Flask(__name__)

key_index = {}
metadata_index = {}
reader_index = {}


def load_index_file(path):
    try:
        index = metadata_index[path]
    except KeyError:
        with open(path, 'rt') as fh:
            index = ExtendedScanIndex.load(fh)
        metadata_index[path] = index
        return index


@app.route("/index/<key>", methods=["GET", "POST"])
def get_index(key):
    path = key_index[key]
    metadata_index = load_index_file(path)
    if request.method == "GET":
        ms1_ids = tuple(metadata_index.ms1_ids)
        msn_ids = tuple(metadata_index.msn_ids)
        return jsonify(ms1_ids=ms1_ids, msn_ids=msn_ids)


@app.route("/scan/<key>/<string:scan_id>", methods=["GET", "POST"])
def get_scan(key, scan_id):
    path = key_index[key]
    reader, lock = reader_index[path]
    with lock:
        scan = reader.get_scan_by_id(scan_id)
        mz_array = scan.arrays.mz
        intensity_array = scan.arrays.intensity
    response = jsonify(scan_id=scan_id, mz=mz_array.tolist(), intensity=intensity_array.tolist())
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == "__main__":
    import sys
    for i, path in enumerate(sys.argv[1:]):
        print("Loading {0} with Key {1}".format(path, i))
        reader = MSFileLoader(path)
        reader_index[path] = reader, RLock()
        key_index[str(i)] = path

    app.run(threaded=True)
