// Leaflet World-Class Agriculture Wrapper
// Supports Livestock, Crops, and Soil GeoSpatial Analysis

let maps = {};
let markers = {};
let layerGroups = {};
let clickHandlers = {};

function resolveGroup(mapId, options) {
    if (!layerGroups[mapId]) {
        return null;
    }

    const groupName = options && options.group ? options.group : 'analysis';
    return layerGroups[mapId][groupName] || layerGroups[mapId].analysis;
}

/**
 * Initializes a new map instance
 * @param {string} elementId - The ID of the HTML element
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} zoom - Initial zoom level
 */
export function createMap(elementId, lat, lng, zoom) {
    if (maps[elementId]) {
        maps[elementId].remove();
    }

    const map = L.map(elementId).setView([lat, lng], zoom);

    // Base Layers
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri'
    });

    const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors'
    });

    osm.addTo(map);

    const baseMaps = {
        "Street Map": osm,
        "Satellite": satellite,
        "Terrain": terrain
    };

    maps[elementId] = map;
    layerGroups[elementId] = {
        livestock: L.layerGroup().addTo(map),
        crops: L.layerGroup().addTo(map),
        soil: L.layerGroup().addTo(map),
        infrastructure: L.layerGroup().addTo(map),
        analysis: L.layerGroup().addTo(map),
        selection: L.layerGroup().addTo(map)
    };

    L.control.layers(baseMaps, {
        "Livestock Analytics": layerGroups[elementId].livestock,
        "Crop Vegetation Index": layerGroups[elementId].crops,
        "Soil Health Mapping": layerGroups[elementId].soil,
        "Farm Infrastructure": layerGroups[elementId].infrastructure,
        "Spatial Analysis": layerGroups[elementId].analysis,
        "Selection": layerGroups[elementId].selection
    }).addTo(map);

    L.control.scale().addTo(map);
}

/**
 * Adds a livestock outbreak cluster or quarantine zone
 * @param {string} mapId 
 * @param {object} geoJson 
 * @param {string} disease 
 * @param {string} severity - High, Medium, Low
 */
export function addLivestockLayer(mapId, geoJson, disease, severity) {
    const map = maps[mapId];
    if (!map) return;

    const color = severity === 'High' ? '#ef4444' : severity === 'Medium' ? '#f59e0b' : '#3b82f6';
    
    L.geoJSON(geoJson, {
        style: {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2
        },
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            radius: 8,
            color: color,
            fillColor: color,
            fillOpacity: 0.85,
            weight: 2
        }),
        onEachFeature: (feature, layer) => {
            const cases = feature?.properties?.cases ?? feature?.properties?.affected ?? 'n/a';
            const district = feature?.properties?.district ?? feature?.properties?.location ?? 'Unknown';
            layer.bindPopup(`<b>Livestock Outbreak</b><br>Disease: ${disease}<br>Severity: ${severity}<br>Location: ${district}<br>Cases: ${cases}`);
        }
    }).addTo(layerGroups[mapId].livestock);
}

/**
 * Adds a crop NDVI heatmap
 * @param {string} mapId 
 * @param {object} geoJson 
 * @param {string} cropType 
 */
export function addCropNdviLayer(mapId, geoJson, cropType) {
    const map = maps[mapId];
    if (!map) return;

    L.geoJSON(geoJson, {
        style: (feature) => {
            const ndvi = feature.properties.ndvi || 0;
            return {
                fillColor: getNdviColor(ndvi),
                fillOpacity: 0.6,
                weight: 1,
                color: '#fff'
            };
        },
        onEachFeature: (feature, layer) => {
            const ndvi = feature?.properties?.ndvi ?? 'n/a';
            const fieldName = feature?.properties?.fieldName ?? feature?.properties?.name ?? 'Field';
            layer.bindPopup(`<b>Crop Health (NDVI)</b><br>Crop: ${cropType}<br>Field: ${fieldName}<br>Value: ${ndvi}`);
        }
    }).addTo(layerGroups[mapId].crops);
}

/**
 * Adds a soil nutrient heatmap
 * @param {string} mapId 
 * @param {object} geoJson 
 * @param {string} nutrient - N, P, K, pH
 */
export function addSoilHeatmap(mapId, geoJson, nutrient) {
    const map = maps[mapId];
    if (!map) return;

    L.geoJSON(geoJson, {
        style: (feature) => {
            const val = feature.properties.value || 0;
            return {
                fillColor: getNutrientColor(nutrient, val),
                fillOpacity: 0.5,
                weight: 0,
            };
        },
        onEachFeature: (feature, layer) => {
            const val = feature?.properties?.value ?? 'n/a';
            const zone = feature?.properties?.zone ?? feature?.properties?.name ?? 'Zone';
            layer.bindPopup(`<b>Soil Analysis: ${nutrient}</b><br>Zone: ${zone}<br>Value: ${val}`);
        }
    }).addTo(layerGroups[mapId].soil);
}

// --- Helper Functions ---

function getNdviColor(d) {
    return d > 0.8 ? '#00441b' :
           d > 0.6 ? '#1b7837' :
           d > 0.4 ? '#5aae61' :
           d > 0.2 ? '#a6dba0' :
           d > 0   ? '#d9f0d3' : '#f7f7f7';
}

function getNutrientColor(nutrient, d) {
    if (nutrient === 'pH') {
        return d < 5.5 ? '#b2182b' :
               d < 6.5 ? '#f4a582' :
               d < 7.5 ? '#92c5de' : '#2166ac';
    }
    // Generic for N, P, K
    return d > 80 ? '#2d004b' :
           d > 60 ? '#542788' :
           d > 40 ? '#8073ac' :
           d > 20 ? '#b2abd2' : '#d8daeb';
}

// --- Standard Leaflet Operations ---

export function setView(mapId, lat, lng, zoom) {
    if (maps[mapId]) maps[mapId].setView([lat, lng], zoom);
}

export function clearMap(mapId) {
    const groups = layerGroups[mapId];
    if (groups) {
        Object.values(groups).forEach(g => g.clearLayers());
    }
}

export function addMarker(mapId, lat, lng, popupText) {
    if (maps[mapId]) {
        const marker = L.marker([lat, lng]).addTo(layerGroups[mapId].infrastructure);
        if (popupText) marker.bindPopup(popupText);
    }
}

export function addSelectionMarker(mapId, lat, lng, popupText) {
    if (maps[mapId]) {
        const marker = L.circleMarker([lat, lng], {
            radius: 9,
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.9,
            weight: 3
        }).addTo(layerGroups[mapId].selection);
        if (popupText) marker.bindPopup(popupText);
    }
}

export function clearSelectionLayer(mapId) {
    const groups = layerGroups[mapId];
    if (groups && groups.selection) {
        groups.selection.clearLayers();
    }
}

export function attachMapClickHandler(mapId, dotNetRef, methodName) {
    const map = maps[mapId];
    if (!map) return;

    if (clickHandlers[mapId]) {
        map.off('click', clickHandlers[mapId]);
    }

    const handler = (e) => {
        if (dotNetRef && methodName) {
            dotNetRef.invokeMethodAsync(methodName, e.latlng.lat, e.latlng.lng);
        }
    };

    clickHandlers[mapId] = handler;
    map.on('click', handler);
}

export function addCircle(mapId, lat, lng, radius, options) {
    if (!maps[mapId]) return;
    const group = resolveGroup(mapId, options);
    if (!group) return;

    const circle = L.circle([lat, lng], {
        radius,
        color: options?.color || '#2563eb',
        fillColor: options?.fillColor || options?.color || '#2563eb',
        fillOpacity: options?.fillOpacity ?? 0.15,
        weight: options?.weight ?? 2,
        dashArray: options?.dashArray || null
    }).addTo(group);

    if (options?.popupText) {
        circle.bindPopup(options.popupText);
    }
}

export function addPolyline(mapId, coordinates, options) {
    if (!maps[mapId]) return;
    const group = resolveGroup(mapId, options);
    if (!group) return;

    const polyline = L.polyline(coordinates, {
        color: options?.color || '#2563eb',
        weight: options?.weight ?? 4,
        opacity: options?.opacity ?? 0.8,
        dashArray: options?.dashArray || null
    }).addTo(group);

    if (options?.popupText) {
        polyline.bindPopup(options.popupText);
    }
}

export function fitBounds(mapId, bounds) {
    if (maps[mapId]) maps[mapId].fitBounds(bounds);
}
