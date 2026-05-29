import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

# Serve static files from the frontend directory
app = Flask(__name__, static_folder='../frontend', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

API_KEY = os.getenv("AQI_API_KEY", "")
# Defaulting to WAQI (World Air Quality Index) API format
# If the user has a different API, they may need to update the URL and parsing logic below
API_URL_LAT_LON = "https://api.waqi.info/feed/geo:{lat};{lon}/?token={key}"
API_URL_CITY = "https://api.waqi.info/feed/{city}/?token={key}"

def get_risk_and_precautions(aqi):
    aqi = int(aqi)
    if aqi <= 50:
        return {
            "status": "Good",
            "risk": "Minimal",
            "precautions": ["Enjoy the outdoor activities.", "Open windows to bring in fresh air."]
        }
    elif aqi <= 100:
        return {
            "status": "Moderate",
            "risk": "Low",
            "precautions": ["Unusually sensitive individuals should consider limiting prolonged outdoor exertion.", "Keep indoor air clean."]
        }
    elif aqi <= 150:
        return {
            "status": "Unhealthy for Sensitive Groups",
            "risk": "Moderate",
            "precautions": ["Sensitive groups should reduce prolonged outdoor exertion.", "Keep windows closed if prone to allergies."]
        }
    elif aqi <= 200:
        return {
            "status": "Unhealthy",
            "risk": "High",
            "precautions": ["Everyone should reduce prolonged outdoor exertion.", "Sensitive groups should avoid all outdoor exertion.", "Wear a mask if you need to go outside."]
        }
    elif aqi <= 300:
        return {
            "status": "Very Unhealthy",
            "risk": "Very High",
            "precautions": ["Everyone should avoid prolonged outdoor exertion.", "Stay indoors and keep windows closed.", "Use air purifiers.", "Wear a high-quality N95 mask outdoors."]
        }
    else:
        return {
            "status": "Hazardous",
            "risk": "Extreme",
            "precautions": ["Everyone should avoid all outdoor exertion.", "Remain indoors and keep activity levels low.", "Use air purifiers and seal windows/doors.", "Always wear an N95 or better mask if going outside is strictly necessary."]
        }

@app.route('/api/aqi', methods=['GET'])
def get_aqi():
    if not API_KEY:
        return jsonify({"error": "API key is missing on the server. Please add it to backend/.env"}), 500

    lat = request.args.get('lat')
    lon = request.args.get('lon')
    city = request.args.get('city')

    if lat and lon:
        url = API_URL_LAT_LON.format(lat=lat, lon=lon, key=API_KEY)
    elif city:
        url = API_URL_CITY.format(city=city, key=API_KEY)
    else:
        return jsonify({"error": "Please provide either city or lat/lon"}), 400

    try:
        response = requests.get(url)
        data = response.json()
        
        if data.get('status') != 'ok':
            import sys
            print("WAQI API Response:", data, file=sys.stderr)
            sys.stderr.flush()
            return jsonify({"error": "Failed to fetch AQI data from provider. Check location or API key."}), 400
        
        # WAQI specific response parsing
        api_data = data.get('data', {})
        aqi = api_data.get('aqi', 0)
        
        if aqi == '-': # Sometimes WAQI returns '-'
            aqi = 0
            
        iaqi = api_data.get('iaqi', {})
        
        pm25 = iaqi.get('pm25', {}).get('v', '--')
        pm10 = iaqi.get('pm10', {}).get('v', '--')
        no2 = iaqi.get('no2', {}).get('v', '--')
        o3 = iaqi.get('o3', {}).get('v', '--')
        
        city_name = api_data.get('city', {}).get('name', city if city else "Selected Location")

        health_data = get_risk_and_precautions(aqi)

        return jsonify({
            "city": city_name,
            "aqi": aqi,
            "status": health_data["status"],
            "risk": health_data["risk"],
            "precautions": health_data["precautions"],
            "pollutants": {
                "pm25": pm25,
                "pm10": pm10,
                "no2": no2,
                "o3": o3
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
