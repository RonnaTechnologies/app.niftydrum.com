from flask import Flask, jsonify, Response, stream_with_context, send_from_directory
import threading
import time
import json

app = Flask(__name__)

# Event to control the noise logger thread
stop_noise_event = threading.Event()
stop_noise_event.set()  # Initially set to indicate the logger is not running

# Event to control the response logger thread
stop_response_event = threading.Event()
stop_response_event.set()  # Initially set to indicate the logger is not running

# Data to be sent by the response logger
response_data = [28, 251, 236, 20, 55, 239, 68, 252, 75, 159, 90, 124, 86, 25, 169, 94, 21, 116, 82, 9, 29, 9, 4, 7, 21, 15, 0, 8, 40, 49, 45, 16, 1, 6, 34, 50, 22, 5, 6, 4, 32, 6, 16, 1, 22, 40, 5, 29, 2, 4, 30, 1, 15, 42, 13, 29, 9, 40, 2, 32, 0, 5, 33, 28, 12, 23, 0, 3, 8, 8, 10, 3, 28, 7, 17, 3, 8, 8, 21, 21, 7, 7, 6, 6, 10, 11, 4, 9, 0, 6, 1, 7, 0, 13, 5, 14, 0, 15, 3, 3, 0, 2, 8, 12, 3, 5, 3, 10, 1, 14, 8, 3, 6, 5, 6, 3, 6, 7, 3, 0, 1, 5, 5, 0, 6, 5, 4, 0, 3, 2, 0, 0, 4, 1, 0, 2, 3, 1, 2, 5, 0, 4, 2, 4, 1, 6, 0, 4, 1, 1, 2, 3, 0, 2, 0, 0, 1, 2, 0, 1, 0, 1, 1, 3, 0, 3, 2, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 2, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0]


# JSON object
config = {
    "kick":{"scan":3000, "mask":20000, "decay":130000, "threshold":50, "note":36, "gain":2, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "snare":{"scan":3100, "mask":21000, "decay":131000, "threshold":50, "note":38, "gain":3, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "hihat":{"scan":3200, "mask":22000, "decay":132000, "threshold":50, "note":26, "gain":3, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "crash1":{"scan":3300, "mask":23000, "decay":133000, "threshold":50, "note":49, "gain":5, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "tom1":{"scan":3400, "mask":24000, "decay":134000, "threshold":50, "note":50, "gain":2, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "tom3":{"scan":3500, "mask":25000, "decay":135000, "threshold":50, "note":41, "gain":4, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "ride":{"scan":3600, "mask":26000, "decay":136000, "threshold":50, "note":51, "gain":1, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "tom2":{"scan":3700, "mask":27000, "decay":137000, "threshold":1800, "note":47, "gain":3, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "crash2":{"scan":3800, "mask":28000, "decay":138000, "threshold":1800, "note":57, "gain":2, "curve":{"p":[[0,0],[192,192],[128,128],[256,256]]}},
    "hhc":{"timeout":9000, "threshold":30, "offset":105},
    "hhc_trig":{"threshold":400, "scan":15000, "vel_thresh":800}}

# Function to be run in the noise logger thread
def noise_logger():
    count = 0
    while not stop_noise_event.is_set():
        data = {"value": count}
        yield f"data: {json.dumps(data)}\n\n"
        count = (count + 1) % 8
        time.sleep(0.05)  # Sleep for 50ms

# Function to be run in the response logger thread
def response_logger():
    while not stop_response_event.is_set():
        data = {"type": "response", "data": response_data}
        yield data
        time.sleep(1)  # Sleep for 1 second

# Combined generator function
def combined_logger():
    noise_gen = noise_logger()
    response_gen = response_logger()

    while not stop_noise_event.is_set() or not stop_response_event.is_set():
        try:
            noise_data = next(noise_gen)
            yield f"data: {json.dumps(noise_data)}\n\n"
        except StopIteration:
            pass

        try:
            response_data = next(response_gen)
            yield f"data: {json.dumps(response_data)}\n\n"
        except StopIteration:
            pass

# Route to stream combined logger values as SSE
@app.route('/event')
def stream_events():
    return Response(combined_logger(), mimetype="text/event-stream")


# Route to start the noise logger
@app.route('/start_noise_logger', methods=['GET'])
def start_noise_logger():
    if not stop_noise_event.is_set():
        return jsonify({"status": "already running"}), 400

    stop_noise_event.clear()
    thread = threading.Thread(target=noise_logger)
    thread.start()
    return jsonify({"status": "started"})

# Route to stop the noise logger
@app.route('/stop_noise_logger', methods=['GET'])
def stop_noise_logger():
    if stop_noise_event.is_set():
        return jsonify({"status": "already stopped"}), 400

    stop_noise_event.set()
    return jsonify({"status": "stopped"})

# Route to start the response logger
@app.route('/start_response_logger', methods=['GET'])
def start_response_logger():
    if not stop_response_event.is_set():
        return jsonify({"status": "already running"}), 400

    stop_response_event.clear()
    return jsonify({"status": "started"})

# Route to stop the response logger
@app.route('/stop_response_logger', methods=['GET'])
def stop_response_logger():
    if stop_response_event.is_set():
        return jsonify({"status": "already stopped"}), 400

    stop_response_event.set()
    return jsonify({"status": "stopped"})

# Route to serve files from the web_resources directory
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory("web_resources", filename)

# Other routes remain the same
@app.route('/select/<int:instrument>', methods=['GET'])
def select_instrument(instrument):
    return jsonify({"selected": instrument})

@app.route('/curve', methods=['GET'])
def get_curve():
    return jsonify({"curve": "data"})

@app.route('/firmware', methods=['GET'])
def get_firmware():
    return jsonify({"firmware": "version"})

# Route to set a parameter for a sensor
@app.route('/set/<sensor>/<param>/<value>', methods=['GET'])
def set_sensor_param(sensor, param, value):
    if sensor in config and param in config[sensor]:
        # Convert value to the appropriate type
        if isinstance(config[sensor][param], float):
            config[sensor][param] = float(value)
        elif isinstance(config[sensor][param], list):
            config[sensor][param] = json.loads(value)
        else:
            config[sensor][param] = value
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "error", "message": "Sensor or parameter not found"}), 404

# Route to get a parameter from a sensor
@app.route('/get/<sensor>/<param>', methods=['GET'])
def get_sensor_param(sensor, param):
    if sensor in config and param in config[sensor]:
        return jsonify({param: config[sensor][param]})
    else:
        return jsonify({"status": "error", "message": "Sensor or parameter not found"}), 404

# Route to get all data
@app.route('/get_all', methods=['GET'])
def get_all():
    return jsonify(config)


if __name__ == '__main__':
    app.run(debug=True)
    
