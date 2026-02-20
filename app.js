// MAP //

// inicializace mapy
const map = L.map("map", { maxZoom: 21, minZoom: 15}).setView([50.1040097, 14.3890886], 16); 

// mapový podklad OSM-TOPO
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 21,
  maxNativeZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map) 


// UI //
//grafické měřítko
L.control.scale({
  position: "bottomright",
  metric: true,
  imperial: false,
}).addTo(map); // měřítko

// poloha uživatele + GPS button
let positionMarker = null
let lastLatLng = null
let centerDistance = null
const positionBtn = document.getElementById("gpsBtn")

navigator.geolocation.watchPosition(position => {
  console.log(position.coords.accuracy); // přesnost

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  // poslední poloha
  lastLatLng = [lat, lng];

  // vykreslení polohy
  if (positionMarker === null) {
    positionMarker = L.marker(lastLatLng).addTo(map)
  } else {
    positionMarker.setLatLng(lastLatLng)
  };

  // odchylka centra mapy od polohy uživatele
  map.on("moveend", () => {
    if (lastLatLng){
    centerDistance = map.getCenter().distanceTo(lastLatLng);
    console.log(centerDistance)};

  if (centerDistance <= 0.5 && map.getZoom() >= 20){
    positionBtn.style.background = "rgba(0, 166, 255, 0.8)";
    positionBtn.style.color = "white"
  } 
  else if (centerDistance <= 1.5 && map.getZoom() >= 17 && map.getZoom() < 20) {
    positionBtn.style.background = "rgba(0, 166, 255, 0.8)";
    positionBtn.style.color = "white"
  } 
  else if (centerDistance <= 5 && map.getZoom() < 17) {
    positionBtn.style.background = "rgba(0, 166, 255, 0.8)";
    positionBtn.style.color = "white"
  } else {
    positionBtn.style.background = "";
    positionBtn.style.color = "";
  }});

  // sledování zoomu mapy
  map.on("zoomend", () => {
    console.log(map.getZoom())
  })
  
});

// GPS button
positionBtn.addEventListener("click", () => {
  map.setView(lastLatLng)
});

// DATA //
fetch("Data/points/Points_WGS84.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {

        // popUp bodu
        const p = feature.properties;
        const Y = p.Y * -1
        const X = p.X * -1

        layer.bindPopup(`
         Číslo bodu: ${p.ID}<br>
         X: <em>${X}</em> m<br>
         Y: <em>${Y}</em> m<br>
         Z: <em>${p.Z}</em> m<br>
         Typ: ${p.typ}
          `
        )
      } 

    }).addTo(map)});


