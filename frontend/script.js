// Define API endpoint (the python flask backend)
const API_BASE_URL = 'http://127.0.0.1:5000/api/aqi';

// Tabs Logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');

        // If map tab, resize map (Leaflet bug fix)
        if (btn.dataset.tab === 'map-tab' && map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Leaflet Map Initialization
let map = L.map('map').setView([20.0, 0.0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

let currentMarker = null;

map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    currentMarker = L.marker([lat, lon]).addTo(map);
    
    fetchAQIData(`?lat=${lat}&lon=${lon}`);
});

// Search Box Logic
document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('locationInput').value.trim();
    if (city === "") {
        alert("Please enter a city name");
        return;
    }
    fetchAQIData(`?city=${city}`);
});

document.getElementById('locationInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
    }
});

// Fetch data from backend
async function fetchAQIData(queryString) {
    const loader = document.getElementById('loader');
    const resultsPanel = document.getElementById('resultsPanel');
    
    loader.style.display = 'block';
    resultsPanel.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE_URL}${queryString}`);
        const data = await response.json();

        loader.style.display = 'none';

        if (!response.ok) {
            alert(data.error || "An error occurred while fetching AQI data.");
            return;
        }

        updateUI(data);

    } catch (error) {
        console.error("Error fetching AQI:", error);
        loader.style.display = 'none';
        alert("Failed to connect to the backend server. Make sure it's running.");
    }
}

// Update UI with data
function updateUI(data) {
    document.getElementById('cityName').innerText = data.city || 'Unknown Location';
    
    const aqiCircle = document.getElementById('aqiCircle');
    const aqiValue = document.getElementById('aqiValue');
    const aqiStatus = document.getElementById('aqiStatus');
    const riskBadge = document.getElementById('riskBadge');
    
    aqiValue.innerText = data.aqi;
    aqiStatus.innerText = data.status;
    riskBadge.innerText = `Risk: ${data.risk}`;

    // Update colors based on AQI level
    let color = '';
    const aqi = data.aqi;
    if (aqi <= 50) color = 'var(--aqi-good)';
    else if (aqi <= 100) color = 'var(--aqi-moderate)';
    else if (aqi <= 150) color = 'var(--aqi-usg)';
    else if (aqi <= 200) color = 'var(--aqi-unhealthy)';
    else if (aqi <= 300) color = 'var(--aqi-very-unhealthy)';
    else color = 'var(--aqi-hazardous)';

    aqiCircle.style.borderColor = color;
    aqiStatus.style.color = color;
    riskBadge.style.color = color;
    riskBadge.style.borderColor = color;

    // Precautions
    const precautionsList = document.getElementById('aqiPrecautions');
    precautionsList.innerHTML = '';
    data.precautions.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p;
        precautionsList.appendChild(li);
    });

    // Pollutants
    document.getElementById('pm25').innerText = data.pollutants.pm25;
    document.getElementById('pm10').innerText = data.pollutants.pm10;
    document.getElementById('no2').innerText = data.pollutants.no2;
    document.getElementById('o3').innerText = data.pollutants.o3;
}