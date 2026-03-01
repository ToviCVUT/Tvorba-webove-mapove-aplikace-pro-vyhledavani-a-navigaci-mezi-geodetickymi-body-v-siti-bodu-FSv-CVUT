
// MAP //
let positionMarker = null;
let userLat = null
let userLng = null
let lastLatLng = null;
let centerDistance = null;

let allPoints = {};
let layerID = {}
let straightLine = null;
let selectedPointNav = null;
let selectedPointNavID = null;
let straightNavActive = false

const currentZone = document.getElementById("currentZone")
const straightDistanceResult = document.getElementById("straightDistanceResult");
const rasterDistanceResult = document.getElementById("rasterDistanceResult");
const gpsAccuracy = document.getElementById("gpsAccuracy");
infBtn = document.getElementById("infBtn")
infPanel = document.getElementById("infPanel")


let zones = null
let activeZone = null;

let selectedPoints = new Set()
let selectedPointsSize = null
let onlySelected = false
const selectedPointsBtn = document.getElementById("selectedPointsBtn")



//----------------------------------------------------------------------------------------------------------------------------------------------------

// inicializace mapy
const map = L.map("map", { maxZoom: 21}).setView([50.1040097, 14.3890886], 16); 

// mapový podklad OSM-TOPO
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 21,
  maxNativeZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map) 

//----------------------------------------------------------------------------------------------------------------------------------------------------

// UI //
//grafické měřítko
L.control.scale({
  position: "bottomright",
  metric: true,
  imperial: false,
}).addTo(map); // měřítko

//-----------------------------------------------------------------------------------------------------------------------------------------------------

// Data
// OBLASTI pomocí knihovny Turf
    fetch("Data/zones/Zones_WGS84.geojson")
      .then(res => res.json())
      .then(data => {
        zones = data
        console.log(zones)
        L.geoJSON(zones).addTo(map)});

//----------------------------------------------------------------------------------------------------------------------------------------------------

// FUNKCE AKTUALIZACE POLOHY UŽIVATELE
const updateUserPosition = (lastLatLng, selectedPointNav) => {
  if (!lastLatLng || !selectedPointNav) return

  const lastPosition = L.latLng(lastLatLng);
  const straightDistance = lastPosition.distanceTo(selectedPointNav);
  console.log(straightDistance)

   let straightDistanceRound = straightDistance.toFixed(0).replace(".", ",")
  
  if (!straightLine) {
    straightLine = L.polyline ([selectedPointNav, lastPosition]).addTo(map)
  } else {
    straightLine.setLatLngs([selectedPointNav, lastPosition])
  };


    straightDistanceResult.innerHTML = "";
    straightDistanceResult.innerHTML = `<p class="straightDistanceResultText">Přímá vzdálenost <em>${selectedPointNavID}</em>: <b>${straightDistanceRound} m</b></p><button class="straightDistanceResultEndBtn" id="straightDistanceResultEndBtn">X</button>`

    const straightDistanceResultEndBtn = document.getElementById("straightDistanceResultEndBtn")
    straightDistanceResultEndBtn.addEventListener("click", ()=> {
      straightDistanceResult.textContent = `Přímá vzdálenost (bod): --`;
      straightLine.remove();
      straightLine = null
      straightNavActive = false
      console.log(straightNavActive)
  })
};

//-------------------------------------------------------------------------------------------------------------------------------------------------------

// FUNKCE - BOD V OBLASTI
    const georeference = () => {
      if (!zones || userLng == null || userLat == null) return;

      const lastPosition = turf.point([userLng, userLat]);

      activeZone = null; //reset zóny

      zones.features.forEach(zone => {
        if (turf.booleanPointInPolygon(lastPosition, zone)){
          activeZone = zone;
        }
      })

      const panoramaBtn = document.getElementById("panoramaBtn");

      if (activeZone) {
        panoramaBtn.disabled = false;
        console.log(activeZone.properties.Location);
      } else {
        panoramaBtn.disabled = true;
        console.log("Mimo oblasti.");
      }

      if (activeZone) {
      currentZone.innerHTML = `<p>Aktuální zóna: <strong>${activeZone.properties.Location}</strong></p>`}
      else {currentZone.innerHTML = `<p>Aktuální zóna: <strong>mimo oblast</strong></p>`}
      
    }

//------------------------------------------------------------------------------------------------------------------------------------------------
// FUNKCE PRO AKTULIZACI VYKRESLENÝCH BODŮ
const renderOnlySelectedPoints = () => {
  for(const id in layerID){
    const layer = layerID[id]

    if(onlySelected){
      if (selectedPoints.has(Number(id))){
        layer.addTo(map)
       /*layer.setStyle({
          radius: 6,
          fillColor: "rgb(38, 242, 11)",
          color:"#fff"})*/

      
    } else {layer.remove()}
  } else {
    layer.addTo(map)
    /*layer.setStyle({radius: 6,
          fillColor: "#0d4a87",   
          color: "#ffffff",
    })*/
  }
  };
};

// FUNKCE PRO PŘIDÁNÍ DO SEZNAMU VYBRANÝCH BODŮ PO ZAŠKRTNUTÍ V POPUPU A NÁSLEDNÉ VYKRESLENÍ POMOCÍ FUNKCE
const pointSelect = (ID, isChecked) => {
  if (isChecked == true){
    selectedPoints.add(ID)
  } else {
    selectedPoints.delete(ID)
  };

  renderOnlySelectedPoints(); // aktualizování vykreslených bodů
  selectedPointsBtn.textContent = selectedPoints.size
};


// FUNKCE - změna barvy markeru polohy uživatele podle přesnosti GPS
  const markerColorByAccuracy = (positionAccuracy) =>{
    if(positionAccuracy <= 10) {
      return "rgb(2, 131, 2)"
    } else if (positionAccuracy <= 25){
      return "rgb(54, 140, 197)"
    } else if (positionAccuracy <= 50){
      return "rgb(255, 157, 0)"
    } else {
      return "rgb(255, 0, 0)"
    }
  }

//-----------------------------------------------------------------------------------------------------------------------------------------------------

// SLEDOVÁNÍ POLOHY UŽIVATELE
const positionBtn = document.getElementById("gpsBtn");

navigator.geolocation.watchPosition(position => {
  console.log(position.coords.accuracy); // přesnost

  userLat = position.coords.latitude;
  userLng = position.coords.longitude;
  positionAccuracy = position.coords.accuracy; //přesnost
  positionAccuracyRound = positionAccuracy.toFixed(0);

  // poslední poloha
  lastLatLng = [userLat, userLng];


  // vykreslení polohy
  if (positionMarker === null) {
    positionMarker = L.circleMarker(lastLatLng, {
      radius: 8,
      fillColor: markerColorByAccuracy(positionAccuracy),
      color: "#fff",
      weight: 4,
      opacity: 0.8,
      fillOpacity: 1,
    }).addTo(map)
  } else {
    positionMarker.setLatLng(lastLatLng).setStyle({fillColor: markerColorByAccuracy(positionAccuracy)})
  };


  // infPanel - kontrola oblasti
  georeference();

  // infPanel - přímá vzdálenost
  if(straightNavActive){
  updateUserPosition(lastLatLng, selectedPointNav)};

  // infPanel - GPS přesnost
  gpsAccuracy.innerHTML = `<p>GPS přesnost: <strong>± ${positionAccuracyRound} m</strong></p>`
    },

    (err) =>{
    if(err.code === 1){
      alert("Není povolena poloha uživatele")
    }},

    {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 30000
    }
);

//-------------------------------------------------------------------------------------------------------------------------------------------------------

// GPS BUTTON
positionBtn.addEventListener("click", () => {
  map.setView(lastLatLng)
});

//------------------------------------------------------------------------------------------------------------------------------------------------------

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

//-----------------------------------------------------------------------------------------------------------------------------------------------------

// DATA //
fetch("Data/points/Points_WGS84.geojson")
  .then(res => res.json())
  .then(data => {
    allPoints = data.features
    console.log(allPoints)
    const Points = L.geoJSON(data, {

      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: "#0d4a87",   // modrá výplň
          color: "#ffffff",       // tmavší okraj
          weight: 1,              // tloušťka okraje
          opacity: 1,
          fillOpacity: 0.9 
        });
      },

      onEachFeature: (feature, layer) => {

        // popUp bodu
        const p = feature.properties;
        const Y = p.Y * -1;
        const X = p.X * -1;
        layerID[p.ID] = layer;
      


        layer.bindPopup(`
         Číslo bodu: ${p.ID}<br>
         X: <em>${X}</em> m<br>
         Y: <em>${Y}</em> m<br>
         Z: <em>${p.Z}</em> m<br>
         Typ: ${p.typ} <br>
        <button class="straightNavigationBtn" type="button">Přímá vzdálenost</button><br>
        Vybrat bod: <input type="checkbox" class="selectChecked" onchange="pointSelect(${p.ID}, this.checked)"></input>
          `, { autoPan: false }
        )

        layer.on("popupopen", (e) => {
          const layerPopup = e.popup.getElement();

          // checkbox pro výběr bodu zůstane v Popup zaškrtnutý
          const checkBox = layerPopup.querySelector(".selectChecked"); 
          checkBox.checked = selectedPoints.has(Number(p.ID));

          checkBox.addEventListener("change", ()=> {
          if(checkBox.checked){
            layer.setStyle({
              radius: 8,
          fillColor: "rgb(0, 254, 4)",
          color:"#0d4a87"
            })
          } else {
            layer.setStyle({
            radius: 6,
          fillColor: "#0d4a87",   
          color: "#ffffff"
            })
          }})
  
          const straightNavBtn = layerPopup.querySelector(".straightNavigationBtn");

          straightNavBtn.addEventListener("click", () => {
            selectedPointNav = e.target.getLatLng();
            selectedPointNavID = p.ID
            straightNavActive = true
            updateUserPosition(lastLatLng, selectedPointNav)
            console.log(straightNavActive)
          }, {once: true})
          console.log(selectedPoints)
        })
      } 
    }) 
    Points.addTo(map)
  });
    
//---------------------------------------------------------------------------------------------------------------------------------------------------    

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
        map.setView([filteredPointLng, filteredPointLat], 20)
        searchingPointsList.innerHTML = ""
        layerID[point.properties.ID].openPopup();
        
      }
        )

        searchingPointsList.appendChild(filteredPoint)
      })
    })


    // INFO BUTTON
    infBtn = document.getElementById("infBtn")
    infPanel = document.getElementById("infPanel")

    infBtn.addEventListener("click", ()=> {
      infPanel.classList.toggle("active");
  })


  // SELECTED POINTS BTN
  selectedPointsBtn.addEventListener("click", () =>{
    onlySelected = !onlySelected;
    renderOnlySelectedPoints();
    selectedPointsBtn.classList.toggle("active");
  });
  selectedPointsBtn.textContent = "0";
        

    
    

