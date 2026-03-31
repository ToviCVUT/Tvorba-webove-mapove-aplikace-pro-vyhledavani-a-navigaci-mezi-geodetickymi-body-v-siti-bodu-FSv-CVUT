// MAP //
let positionMarker = null;
let userLat = null
let userLng = null
let lastLatLng = null;
let centerDistance = null;
let userFollow = false;

let allPoints = [];
let layerID = {}
let selectedPointCoords = null;
let selectedPointCoordsID = null;

let straightLine = null;
let straightNavActive = false

let rasterLine = null;
let rasterNavActive = false

const currentZone = document.getElementById("currentZone")
const straightDistanceResult = document.getElementById("straightDistanceResult");
const rasterDistanceResult = document.getElementById("rasterDistanceResult");
const gpsAccuracy = document.getElementById("gpsAccuracy");


let zones = null
let activeZone = null;

let selectedPoints = new Set()
let onlySelected = false
const selectedPointsBtn = document.getElementById("selectedPointsBtn")



//----------------------------------------------------------------------------------------------------------------------------------------------------

// inicializace mapy
const map = L.map("map").setView([50.1040097, 14.3890886], 16); 

// vrstvy
map.createPane("linesPane"); 
map.getPane("linesPane").style.zIndex = 200;

// mapový podklad OSM-TOPO
const OSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 21,
  maxNativeZoom: 19,
})

 const ORTO = L.tileLayer(
  'https://ags.cuzk.gov.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '© ČÚZK',
    maxZoom: 17,
    maxNativeZoom: 17,
  }
)

let mapLayer = OSM
const osmBtn = document.getElementById("layerOSMBtn")
const ortoBtn = document.getElementById("layerOrtoBtn")






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
        const zonesLayer = L.geoJSON(zones, {
          opacity: 0,
          fillOpacity: 0,
        }).addTo(map)
      });

//----------------------------------------------------------------------------------------------------------------------------------------------------

 /* FLASK */
  // FUNKCE RASTROVÁ VZDÁLENOST
  async function getRoute(start, end) {
    try {
    const response = await fetch("https://tvorba-webove-mapove-aplikace-pro-1swy.onrender.com/route", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        start: start,
        end: end
      })
    });

    const data = await response.json();
     if (!response.ok) { if (data.message === "Start je mimo raster") { 
      throw new Error("Vaše aktuální poloha se nachází mimo podporované území aplikace."); 
    } 
    throw new Error(data.message || "Nepodařilo se vypočítat trasu."); 
  } 
  return data; 
} catch (err) {
   console.error("CHYBA:", err.message);
  alert(err.message); 

  return { 
    status: "error",
    message: err.message };
   } 
  }

  async function rasterRoute(start, end) {

    let startCoords;
    if (Array.isArray(start)) {
      startCoords = start;
    } else {
      startCoords = [start.lat, start.lng];
    }

    let endCoords;
    if (Array.isArray(end)) {
      endCoords = end;
    } else {
      endCoords = [end.lat, end.lng];
    }


    const data = await getRoute(startCoords, endCoords);
    console.log("raster:", data)


    if (data.status !== "ok") {
      console.error(data.message);
      rasterDistanceResult.innerHTML = `<p>Rastrová vzdálenost: <strong>chyba</strong></p>`;
      return;
    }
    

    const linePoints = [startCoords, ...data.path, endCoords];

    if (!rasterLine) {
      rasterLine = L.polyline(linePoints, {
        color: "rgba(0, 0, 0, 0.83)",
        interactive: false,
        pane: "linesPane",
      }).addTo(map);
    } else {
      rasterLine.setLatLngs(linePoints);
    }

    rasterDistanceResult.innerHTML =
      `<p>Rastrová vzdálenost <em>${selectedPointCoordsID}</em>: <b>${data.distance.toFixed(0)}&nbsp;m</b></p><button class="rasterDistanceResultEndBtn" id="rasterDistanceResultEndBtn">X</button>`;
      
    const rasterDistanceResultEndBtn = document.getElementById("rasterDistanceResultEndBtn")

    rasterDistanceResultEndBtn.addEventListener("click", ()=> {
      rasterDistanceResult.textContent = `Rastrová vzdálenost (bod): --`;
      rasterLine.remove();
      rasterLine = null
      rasterNavActive = false
      console.log(rasterNavActive)
  })
  };


  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// FUNKCE PŘÍMÁ VZDÁLENOST
const updateUserPosition = (lastLatLng, selectedPointCoords) => {
  if (!lastLatLng || !selectedPointCoords) return

  const lastPosition = L.latLng(lastLatLng);
  const straightDistance = lastPosition.distanceTo(selectedPointCoords);
  console.log(straightDistance)

   let straightDistanceRound = straightDistance.toFixed(0).replace(".", ",")
  
  if (!straightLine) {
    straightLine = L.polyline ([selectedPointCoords, lastPosition], {
      color: "rgba(96, 155, 237, 0.94)",
      interactive: false,
      pane: "linesPane",
    }).addTo(map)
  } else {
    straightLine.setLatLngs([selectedPointCoords, lastPosition])
  };


    straightDistanceResult.innerHTML = "";
    straightDistanceResult.innerHTML = `<p class="straightDistanceResultText">Přímá vzdálenost <em>${selectedPointCoordsID}</em>: <b>${straightDistanceRound}&nbsp;m</b></p><button class="straightDistanceResultEndBtn" id="straightDistanceResultEndBtn">X</button>`

    const straightDistanceResultEndBtn = document.getElementById("straightDistanceResultEndBtn")
    straightDistanceResultEndBtn.addEventListener("click", ()=> {
      straightDistanceResult.textContent = `Přímá vzdálenost (bod): --`;
      straightLine.remove();
      straightLine = null
      straightNavActive = false
      console.log(straightNavActive)
  })
};


//----------------------------------------------------------------------------------------------------------------------------------------------------
// FUNKCE ZMĚNA PODKLADU
const switchLayers = () =>{
  mapLayer.addTo(map)
  if(osmBtn){
    osmBtn.addEventListener("click", () => {
      map.removeLayer(mapLayer)
      mapLayer = OSM
      mapLayer.addTo(map)
      osmBtn.classList.add("select")
      ortoBtn.classList.remove("select")
    })
  }

  if(ortoBtn){
    ortoBtn.addEventListener("click", () => {
      
      map.removeLayer(mapLayer)
      mapLayer = ORTO
      mapLayer.addTo(map)
      ortoBtn.classList.add("select")
      osmBtn.classList.remove("select")

    })
  }
}


switchLayers()


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

      const situationBtn = document.getElementById("situationBtn");

      if (activeZone) {
        situationBtn.disabled = false;
        console.log(activeZone.properties.Location);
      } else {
        situationBtn.disabled = true;
      }

      if (activeZone) {
      currentZone.innerHTML = `<p>Zóna: <strong>${activeZone.properties.Location}</strong></p>`}
      else {currentZone.innerHTML = `<p>Zóna: <strong>mimo oblast</strong></p>`}
      
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
    if(positionAccuracy <= 5) {
      return "rgb(15, 113, 15)"
    } else if (positionAccuracy <= 10){
      return "rgb(255, 255, 0)"
    } else if (positionAccuracy <= 25){
      return "rgb(255, 157, 0)"
    } else {
      return "rgb(255, 0, 0)"
    }
  }

//-----------------------------------------------------------------------------------------------------------------------------------------------------

// SLEDOVÁNÍ POLOHY UŽIVATELE
const positionBtn = document.getElementById("gpsBtn");

navigator.geolocation.watchPosition(position => {


  userLat = position.coords.latitude;
  userLng = position.coords.longitude;
  const positionAccuracy = position.coords.accuracy; //přesnost
  const positionAccuracyRound = positionAccuracy.toFixed(0);

  // poslední poloha
  lastLatLng = [userLat, userLng];

  // sledování polohy uživatele
  if(userFollow){
    map.panTo(lastLatLng, {animate: true})
  }


  // vykreslení polohy
  if (positionMarker === null) {
    positionMarker = L.circleMarker(lastLatLng, {
      radius: 9,
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
  updateUserPosition(lastLatLng, selectedPointCoords)};

  if (rasterNavActive) {
  rasterRoute(lastLatLng, selectedPointCoords);
}


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
  if(lastLatLng){
  map.setView(lastLatLng)
  userFollow = true;
  } else {
    alert("Ještě nemám polohu.")
  }
});

// ZRUŠENÍ SLEDOVÁNÍ POLOHY UŽIVATELE
map.on("dragstart", () =>{
  userFollow = false
})

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
          radius: 8,
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
         <span class="pointNumber">Číslo bodu: ${p.ID}</span><br>
         <div class="pointInfo">X: ${X} m<br>
         Y: ${Y} m<br>
         Z: ${p.Z} m<br>
         Typ: ${p.typ} <br></div>
        <button class="straightNavigationBtn" type="button">Přímá vzdálenost</button><br>
        <button class="rasterNavigationBtn" type="button">Rastrová vzdálenost</button><br>
        <label class="selectCheckbox">Vybrat bod: <input type="checkbox" class="selectChecked" onchange="pointSelect(${p.ID}, this.checked)"></input></label>
          `, { autoPan: false }
        )

        layer.on("click", () => {
          map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]])
        })

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
            radius: 8,
          fillColor: "#0d4a87",   
          color: "#ffffff"
            })
          }})


          const straightNavBtn = layerPopup.querySelector(".straightNavigationBtn");

          straightNavBtn.addEventListener("click", () => {
            selectedPointCoords = e.target.getLatLng();
            selectedPointCoordsID = p.ID
            straightNavActive = true
            updateUserPosition(lastLatLng, selectedPointCoords)
            console.log(straightNavActive)
          }, {once: true});

  
          const rasterNavBtn = layerPopup.querySelector(".rasterNavigationBtn");

          rasterNavBtn.addEventListener("click", () => {
            selectedPointCoords = e.target.getLatLng();
            selectedPointCoordsID = p.ID
            rasterNavActive = true

            if (lastLatLng) {
              rasterRoute(lastLatLng, selectedPointCoords);
              }

            console.log(rasterNavActive)
          }, {once: true});


          console.log(selectedPoints);



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
    const infBtn = document.getElementById("infBtn")
    const infPanel = document.getElementById("infPanel")

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
        

  // MENU
  // NAVIGACE LAYERS
  const navLayersBtn = document.getElementById("navLayersBtn")
  const navLayers = document.getElementById("navLayers")
  const navLayersEndBtn = document.getElementById("navLayersEndBtn")

  navLayersBtn.addEventListener("click", () => {
    navLayers.classList.toggle("open")
    navSupport.classList.remove("open")
    navAboutApp.classList.remove("open")
  })

  navLayersEndBtn.addEventListener("click", ()=> {
    navLayers.classList.remove("open")
  })

  // NAVIGACE NÁPOVĚDA
  const navSupportBtn = document.getElementById("navSupportBtn")
  const navSupport = document.getElementById("navSupport")
  const navSupportEndBtn = document.getElementById("navSupportEndBtn")

  navSupportBtn.addEventListener("click", () => {
    navSupport.classList.toggle("open")
    navSupport.scrollTo({
      top: 0,
    })
    navLayers.classList.remove("open")
    navAboutApp.classList.remove("open")
  })

  navSupportEndBtn.addEventListener("click", ()=> {
    navSupport.classList.remove("open")
  })


  // NAVIGACE O APLIKACI
  const navAboutAppBtn = document.getElementById("navAboutAppBtn")
  const navAboutApp = document.getElementById("navAboutApp")
  const navAboutAppEndBtn = document.getElementById("navAboutAppEndBtn")

  navAboutAppBtn.addEventListener("click", () => {
    navAboutApp.classList.toggle("open")
    navLayers.classList.remove("open")
    navSupport.classList.remove("open")
  })

  navAboutAppEndBtn.addEventListener("click", ()=> {
    navAboutApp.classList.remove("open")
  })



 


    
    

