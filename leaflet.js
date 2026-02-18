const map = L.map("map").setView([50.1040097, 14.3890886], 16); // inicializace mapy

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map) // mapový podklad OSM-TOPO
