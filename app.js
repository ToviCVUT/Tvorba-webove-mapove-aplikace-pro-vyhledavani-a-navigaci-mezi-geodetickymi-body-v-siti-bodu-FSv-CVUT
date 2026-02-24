// MAP //
let positionMarker = null;
let lastLatLng = null;
let centerDistance = null;

let allPoints = [];
let straightDistance = null;
let straightLine = null;
let selectedPointNav = null;
let selectedPointNavID = null;
const straightDistanceResult = document.getElementById("straightDistanceResult");

// inicializace mapy
const map = L.map("map", { maxZoom: 21}).setView([50.1040097, 14.3890886], 16); 

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


// funkce aktualizace přímé spojnice funkce
const updateStraightLine = (lastLatLng, selectedPointNav) => {
  if (!lastLatLng || !selectedPointNav) return
   let straightDistanceRound = straightDistance.toFixed(1).replace(".", ",") 
  straightDistanceResult.innerHTML = ""
  straightDistanceResult.innerHTML = `<p class="straightDistanceResultText"><em>Straight ${selectedPointNavID}<em>: <b>${straightDistanceRound} m</b></p>`

  const lastPosition = L.latLng(lastLatLng)

  if (!straightLine) {
    straightLine = L.polyline ([selectedPointNav, lastPosition]).addTo(map)
  } else {
    straightLine.setLatLngs([selectedPointNav, lastPosition])
  };
};

// poloha uživatele + GPS button

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

  updateStraightLine(lastLatLng, selectedPointNav);
});

// GPS button
positionBtn.addEventListener("click", () => {
  map.setView(lastLatLng)
});

 // odchylka centra mapy od polohy uživatele
  map.on("moveend", () => {
    if (lastLatLng){
    centerDistance = map.getCenter().distanceTo(lastLatLng);
    /*console.log(centerDistance)*/};

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
  /*map.on("zoomend", () => {
    console.log(map.getZoom())
  })*/


// DATA //


fetch("Data/points/Points_WGS84.geojson")
  .then(res => res.json())
  .then(data => {
    allPoints = data.features
    console.log(allPoints)
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
         Typ: ${p.typ} <br>
        <button class="straightNavigationBtn" type="button">Přímá vzdálenost</button>
          `
        )

        layer.on("popupopen", (e) => {
          const layerPopup = e.popup.getElement();
          const straightNavBtn = layerPopup.querySelector(".straightNavigationBtn");

          straightNavBtn.addEventListener("click", () => {
            selectedPointNav = e.target.getLatLng();
            selectedPointNavID = p.ID
            const lastPosition = L.latLng(lastLatLng);
            straightDistance = lastPosition.distanceTo(selectedPointNav)
            console.log(`Přímá vzdálenost: ${straightDistance}`)
            updateStraightLine(lastLatLng, selectedPointNav)
            console.log("klik")
          }, {once: true})
        })
      } 
    }).addTo(map)});
    
    
    // SEARCHING INPUT
    const searchingInput = document.getElementById("searchingInput")
    const searchingPointsList = document.getElementById("searchingPointsList")

    searchingInput.addEventListener("input", () => {
      const inputValue = searchingInput.value.toLowerCase();
      searchingPointsList.innerHTML = ""

      if(inputValue.length === 0) return

      const filteredPoints = allPoints.filter(point => 
        point.properties.ID.toString().toLowerCase().startsWith(inputValue))

      filteredPoints.forEach(point => {
       const filteredPoint = document.createElement("li")
        filteredPoint.textContent = point.properties.ID
        
        filteredPoint.addEventListener("click", () => {
          const [filteredPointLat, filteredPointLng] = point.geometry.coordinates;
        map.setView([filteredPointLng, filteredPointLat])
        searchingPointsList.innerHTML = ""}
        )

        searchingPointsList.appendChild(filteredPoint)
      })
    })
    

