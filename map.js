export class MapManager {
    constructor() {
        // Vellore, Tamil Nadu Center
        this.center = [12.9165, 79.1325];
        this.zoom = 12; // City view
        this.map = null;
        this.unitMarkers = new Map();
        this.unitPaths = new Map(); // Store Polylines
        this.incidentMarkers = new Map();
        this.zones = [];
    }

    init() {
        if (typeof L === 'undefined') {
            throw new Error("Leaflet (L) is not loaded. Check internet connection or CDN.");
        }
        this.map = L.map('map', {
            zoomControl: false, // Custom look
            attributionControl: false
        }).setView(this.center, this.zoom);

        // Dark Matter tiles for that "Command Center" look
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(this.map);

        // Add Scale
        L.control.scale({ position: 'bottomright' }).addTo(this.map);

        // Simulate Weather Layer (wind overlay) - Covering Vellore Region
        this.weatherLayer = L.rectangle(
            [[12.8, 79.0], [13.0, 79.3]],
            { color: "#304050", weight: 0, fillOpacity: 0.1, className: 'weather-overlay' }
        ).addTo(this.map);
    }

    // --- Unit Markers ---
    updateUnitMarker(unit) {
        if (!this.map) return;

        let marker = this.unitMarkers.get(unit.id);

        // Color based on status
        let color = '#3fb950'; // Available (Green)
        if (unit.status === 'busy') color = '#d29922'; // Amber
        if (unit.status === 'en-route') color = '#58a6ff'; // Blue
        if (unit.status === 'out-of-service') color = '#f85149'; // Red

        const iconHtml = `
            <div style="
                background-color: ${color};
                width: 12px;
                height: 12px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 0 10px ${color};
            "></div>
        `;

        const customIcon = L.divIcon({
            className: 'custom-unit-marker',
            html: iconHtml,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        if (!marker) {
            marker = L.marker([unit.lat, unit.lng], { icon: customIcon }).addTo(this.map);
            marker.bindPopup(`<b>${unit.type} ${unit.id}</b><br>Status: ${unit.status}`);
            this.unitMarkers.set(unit.id, marker);
        } else {
            marker.setLatLng([unit.lat, unit.lng]);
            marker.setIcon(customIcon);
            marker.getPopup().setContent(`<b>${unit.type} ${unit.id}</b><br>Status: ${unit.status}`);
        }
    }

    updateUnitPath(unit) {
        if (!this.map) return;

        // Only draw if en-route and has target
        if (unit.status !== 'en-route' || !unit.targetLat || !unit.targetLng) {
            this.removeUnitPath(unit.id);
            return;
        }

        let polyline = this.unitPaths.get(unit.id);
        const latlngs = [
            [unit.lat, unit.lng],
            [unit.targetLat, unit.targetLng]
        ];

        if (!polyline) {
            polyline = L.polyline(latlngs, {
                color: '#00f3ff', // Neon Blue
                weight: 2,
                opacity: 0.7,
                dashArray: '5, 10',
                className: 'anim-dash' // We can animate this in CSS
            }).addTo(this.map);
            this.unitPaths.set(unit.id, polyline);
        } else {
            polyline.setLatLngs(latlngs);
        }
    }

    removeUnitPath(unitId) {
        const polyline = this.unitPaths.get(unitId);
        if (polyline) {
            this.map.removeLayer(polyline);
            this.unitPaths.delete(unitId);
        }
    }

    // --- Incident Markers ---
    addIncidentMarker(incident) {
        if (!this.map) return;

        // Incident Type Colors
        const colors = {
            'fire': '#ff4444',
            'medical': '#33b5e5',
            'crash': '#ffbb33',
            'flood': '#00C851',
            'hazardous': '#aa66cc'
        };

        const color = colors[incident.type] || '#fff';
        const radius = 100 + (incident.severity * 50); // Size based on severity

        const circle = L.circle([incident.lat, incident.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            radius: radius
        }).addTo(this.map);

        circle.bindPopup(`
            <b>${incident.type.toUpperCase()}</b><br>
            Severity: ${incident.severity}<br>
            ID: ${incident.id}
        `);

        // Pulsing animation handled by CSS on the path if possible, 
        // or just re-rendering radius for "spread" effect
        this.incidentMarkers.set(incident.id, circle);
    }

    updateIncidentMarker(incident) {
        const marker = this.incidentMarkers.get(incident.id);
        if (marker) {
            // Update size based on spread/severity
            const newRadius = 100 + (incident.severity * 50); // visual representation
            marker.setRadius(newRadius);
        }
    }

    removeIncidentMarker(incidentId) {
        const marker = this.incidentMarkers.get(incidentId);
        if (marker) {
            this.map.removeLayer(marker);
            this.incidentMarkers.delete(incidentId);
        }
    }

    // --- Overlay ---
    createZone(points) {
        // Points: [[lat,lng], [lat,lng], ...]
        L.polygon(points, {
            color: '#f85149',
            fillColor: '#f85149',
            fillOpacity: 0.2,
            dashArray: '5, 10'
        }).addTo(this.map).bindPopup("EVACUATION ZONE");
    }
}

export const mapManager = new MapManager();
