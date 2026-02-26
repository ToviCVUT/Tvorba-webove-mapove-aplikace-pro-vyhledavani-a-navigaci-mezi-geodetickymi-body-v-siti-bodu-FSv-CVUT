// MAP //
let positionMarker = null;
let userLat = null
let userLng = null
let lastLatLng = null;
let centerDistance = null;

let allPoints = [];
let straightLine = null;
let selectedPointNav = null;
let selectedPointNavID = null;
const straightDistanceResult = document.getElementById("straightDistanceResult");

let zones = null
let activeZone = null;

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


// funkce AKTUALIZACE PŘÍMÉ SPOJNICE
const updateStraightLine = (lastLatLng, selectedPointNav) => {
  if (!lastLatLng || !selectedPointNav) return

  const lastPosition = L.latLng(lastLatLng);
  const straightDistance = lastPosition.distanceTo(selectedPointNav);
  console.log(straightDistance)

   let straightDistanceRound = straightDistance.toFixed(0).replace(".", ",")

  straightDistanceResult.innerHTML = "";
  straightDistanceResult.innerHTML = `<button id="straightDistanceResultEndBtn">X</button><p class="straightDistanceResultText"><em>SD ${selectedPointNavID}</em>: <b>${straightDistanceRound} m</b></p>`
  
  if (!straightLine) {
    straightLine = L.polyline ([selectedPointNav, lastPosition]).addTo(map)
  } else {
    straightLine.setLatLngs([selectedPointNav, lastPosition])
  };

  const straightDistanceResultEndBtn = document.getElementById("straightDistanceResultEndBtn")
  straightDistanceResultEndBtn.addEventListener("click", ()=> {
    straightDistanceResult.innerHTML = "";
    straightLine.remove();
    straightLine = null
  })
};


// funkce jestli je BOD V OBLASTI
    const georeference = () => {
      if (!zones || userLng == null || userLat == null) return;

      const lastPosition = turf.point([userLng, userLat]);


      zones.features.forEach(zone => {
        if (turf.booleanPointInPolygon(lastPosition, zone)){
          activeZone = zone;
        }
      })

      const panoramaBtn = document.getElementById("panoramaBtn");

      if (activeZone) {
        panoramaBtn.disabled = false;
        console.log(activeZone.properties.location);
      } else {
        panoramaBtn.disabled = true;
        console.log("Mimo oblasti.");
      }

      const currentZone = document.getElementById("currentZone");
      if (activeZone) {
      currentZone.textContent = `current zone: ${activeZone.properties.location}`}
      else {currentZone.textContent = `current zone: Out of any zones`}
      
    }

// SLEDOVÁNÍ POLOHY UŽIVATELE
const positionBtn = document.getElementById("gpsBtn");

navigator.geolocation.watchPosition(position => {
  console.log(position.coords.accuracy); // přesnost

  userLat = position.coords.latitude;
  userLng = position.coords.longitude;

  // poslední poloha
  lastLatLng = [userLat, userLng];

  // vykreslení polohy
  if (positionMarker === null) {
    positionMarker = L.marker(lastLatLng).addTo(map)
  } else {
    positionMarker.setLatLng(lastLatLng)
  };

  updateStraightLine(lastLatLng, selectedPointNav);
  georeference();
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
            updateStraightLine(lastLatLng, selectedPointNav)
            console.log("klik")
          }, {once: true})
        })
      } 
    }).addTo(map)});
    
    
    // SEARCHING INPUT
    const searchingPanel = document.getElementById("searchingPanel")
    const searchingInput = document.getElementById("searchingInput")
    const searchingPointsList = document.getElementById("searchingPointsList")

    document.addEventListener("click", (e) => {
      if(!searchingPanel.contains(e.target)) {
        searchingPointsList.innerHTML = ""
        searchingInput.value = ""

      }
    })

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


    // OBLASTI pomocí knihovny Turf
    fetch("Data/zones/Zones_WGS84.geojson")
      .then(res => res.json())
      .then(data => {
        zones = data
        console.log(zones)
        L.geoJSON(zones).addTo(map)});

    
    

