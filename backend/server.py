from flask import Flask, request, jsonify
from flask_cors import CORS
import rasterio
import numpy as np
#import matplotlib.pyplot as plt
from pyproj import Transformer, Geod
from skimage.graph import route_through_array
import os

app = Flask(__name__)
CORS(app)

# RASTER
BASE_DIR =
os.path.dirname(os.path(__file__))
raster_path = os.path.join(BASE_DIR, "CostRaster.tif")
raster = rasterio.open(raster_path)
#print("CRS:", raster.crs)
#print("Width:", raster.width)
#print("Height:", raster.height)
#print("Bands:", raster.count)
#print("Transform:", raster.transform)

# 2D matice raster
raster_array = raster.read(1, masked=True)
raster_array[raster_array == 0] = 9990

#print(type(raster_array))
#print(raster_array.shape)
#print(raster_array.min())
#print(raster_array.max())
#print(raster_array[:500,:500])
#print("NoData value:", raster.nodata)
#print("Počet nul:", np.sum(raster_array == 0))
#print("Počet bariér:", np.sum(raster_array == 9990))


# zobrazení pole rastru
#plt.imshow(raster_array)
#plt.colorbar()
#plt.title("Cost rastr")
#plt.show()

# GPS -> pixel
transformer = Transformer.from_crs("EPSG:4326", "EPSG:5514", always_xy=True)

def gps_to_pixel(lat, lon):
    x, y = transformer.transform(lon, lat)
    row, col = raster.index(x, y)
    return row, col


# převod zpět do WGS84
transformer_back = Transformer.from_crs("EPSG:5514", "EPSG:4326", always_xy=True)

def pixel_to_gps(row, col):
    x, y = raster.xy(row, col)
    lon, lat = transformer_back.transform(x, y)
    return [lat, lon]

# krotrola zda je pixel v rastru
def is_inside_raster(row, col):
    return 0 <= row < raster_array.shape[0] and 0 <= col < raster_array.shape[1]


# výpočet délky trasy v metrech
geod = Geod(ellps="WGS84")

def path_length(coords):
    length = 0.0

    for i in range(len(coords) - 1):
        lat1, lon1 = coords[i]
        lat2, lon2 = coords[i + 1]

        _, _, dist = geod.inv(lon1, lat1, lon2, lat2)
        length += dist

    return length

#-------------------------------------------------------------------------------------------------------------------------------------------------------------

# výpočet
@app.route("/route",  methods=["POST"])
def route():
    data = request.get_json()

    start = data.get("start")
    end = data.get("end")

    if not start or not end:
        return jsonify({"status": "error", "message": "Chybí start nebo end"}), 400

    start_px = gps_to_pixel(start[0], start[1])
    end_px = gps_to_pixel(end[0], end[1])

    if not is_inside_raster(*start_px):
        return jsonify({"status": "error", "message": "Start je mimo raster"}), 400

    if not is_inside_raster(*end_px):
        return jsonify({"status": "error", "message": "Cíl je mimo raster"}), 400
    
    print("Start:", start, "Pixel:", start_px, "Cost:", raster_array[start_px[0], start_px[1]])
    print("End:", end, "Pixel:", end_px, "Cost:", raster_array[end_px[0], end_px[1]])

    path, total_cost = route_through_array(
        raster_array,
        start_px,
        end_px,
        fully_connected= True
    )

    path_gps = [pixel_to_gps(row, col) for row, col in path]
    distance = path_length(path_gps)

    print("Počet pixelů v trase:", len(path))
    print("Celkový cost:", total_cost)
    print("Prvních 10 pixelů array:", path[:5])
    print("Prvních 5 bodů trasy GPS:", path_gps[:5])



    response = {
        "status": "ok",
        "path": path_gps,
        "distance": float(distance),
    }

    return jsonify(response)





if __name__ == "__main__":
    port = int(os.environ.get("PORT",5000))
    app.run(host="0.0.0.0", port=port, debug=True)