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

// Theme Toggle Logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        if (newTheme === 'light') {
            root.classList.add('light-theme');
        } else {
            root.classList.remove('light-theme');
        }
        
        localStorage.setItem('theme', newTheme);
        
        // Re-draw the risk chart with updated grid/label theme colors
        if (riskChart && currentChartData) {
            updateChart(currentChartData);
        }
    });
}

// Global variables for Chart.js risk visualization
let riskChart = null;
let currentChartData = null;

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
    // Cache data for instant theme-switch redrawing
    currentChartData = data;

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

    // Dynamically calculate progress percentages
    const getPercent = (value, maxVal) => {
        const val = parseFloat(value);
        if (isNaN(val)) return 0;
        return Math.min(100, Math.max(0, (val / maxVal) * 100));
    };

    const setBarStatus = (barId, value, maxVal) => {
        const bar = document.getElementById(barId);
        const percent = getPercent(value, maxVal);
        bar.style.width = `${percent}%`;
        
        // Match progress bar colors to standard environmental threat metrics
        if (percent <= 25) {
            bar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        } else if (percent <= 50) {
            bar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else if (percent <= 75) {
            bar.style.background = 'linear-gradient(90deg, #f97316, #ea580c)';
        } else {
            bar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        }
    };

    setBarStatus('pm25Bar', data.pollutants.pm25, 150);
    setBarStatus('pm10Bar', data.pollutants.pm10, 200);
    setBarStatus('no2Bar', data.pollutants.no2, 100);
    setBarStatus('o3Bar', data.pollutants.o3, 150);

    // Render / Update the Dynamic Threat Analysis Bar Chart
    updateChart(data);
}

// Render or Update the visual AQI Risk Chart using Chart.js
function updateChart(data) {
    const ctx = document.getElementById('riskChart').getContext('2d');
    
    // Extract numerical concentrations
    const aqi = parseFloat(data.aqi) || 0;
    const pm25 = parseFloat(data.pollutants.pm25) || 0;
    const pm10 = parseFloat(data.pollutants.pm10) || 0;
    const no2 = parseFloat(data.pollutants.no2) || 0;
    const o3 = parseFloat(data.pollutants.o3) || 0;
    
    // Normalize concentrations to visual risk percentages (0-100%)
    const aqiRisk = Math.min(100, (aqi / 300) * 100);
    const pm25Risk = Math.min(100, (pm25 / 150) * 100);
    const pm10Risk = Math.min(100, (pm10 / 200) * 100);
    const no2Risk = Math.min(100, (no2 / 100) * 100);
    const o3Risk = Math.min(100, (o3 / 150) * 100);
    
    const chartLabels = ['Overall AQI', 'PM2.5', 'PM10', 'NO₂', 'O₃'];
    const chartData = [aqiRisk, pm25Risk, pm10Risk, no2Risk, o3Risk];
    
    // Color coding bars dynamically based on calculated threat percentages
    const getBarColor = (percentage) => {
        if (percentage <= 25) return '#10b981'; // Emerald Good
        if (percentage <= 50) return '#f59e0b'; // Amber Moderate
        if (percentage <= 75) return '#f97316'; // Orange Unhealthy
        return '#ef4444'; // Red Hazardous
    };
    
    const barColors = chartData.map(val => getBarColor(val));
    const isDark = !document.documentElement.classList.contains('light-theme');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
    const textColor = isDark ? '#94a3b8' : '#334155';

    if (riskChart) {
        // Update data values and color mappings dynamically
        riskChart.data.datasets[0].data = chartData;
        riskChart.data.datasets[0].backgroundColor = barColors;
        riskChart.data.datasets[0].borderColor = barColors;
        
        // Update theme grids and tick text colors dynamically
        riskChart.options.scales.x.grid.color = gridColor;
        riskChart.options.scales.y.grid.color = gridColor;
        riskChart.options.scales.x.ticks.color = textColor;
        riskChart.options.scales.y.ticks.color = textColor;
        riskChart.update();
    } else {
        // Initialize a beautiful horizontal visual comparison bar chart
        riskChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Threat / Risk Index (%)',
                    data: chartData,
                    backgroundColor: barColors,
                    borderColor: barColors,
                    borderWidth: 0,
                    borderRadius: 6,
                    barThickness: 14
                }]
            },
            options: {
                indexAxis: 'y', // Renders bar chart horizontally
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#0d1227' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#94a3b8' : '#334155',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return ` Threat level: ${context.parsed.x.toFixed(0)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor
                        }
                    }
                }
            }
        });
    }
}