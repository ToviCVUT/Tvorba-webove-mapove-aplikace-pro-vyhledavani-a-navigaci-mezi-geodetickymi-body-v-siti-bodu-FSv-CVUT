// MAP //
// inicializace mapy
const map = L.map("map").setView([50.1040097, 14.3890886], 16); 

// mapový podklad OSM-TOPO
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map) 


// UI //
//grafické měřítko
L.control.scale({
  position: "bottomright",
  metric: true,
  imperial: false,
}).addTo(map) // měřítko

/*// poloha uživatele
let positionMarker = null
let lastLatLng = null

navigator.geolocation.watchPosition(position => {
  console.log(position.coords.latitude);
  console.log(position.coords.longitude);
  console.log(position.coords.accuracy);

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  lastLatLng = [lat, lng];

  if (positionMarker === null) {
    positionMarker = L.marker(lastLatLng).addTo(map)
  } else {
    positionMarker.setLatLng(lastLatLng)
  };
});*/

// DATA //
fetch("Data/points/Points_WGS84.geojson")
  .then(res => res.json())
  .then(data => {L.geoJSON(data).addTo(map)})


