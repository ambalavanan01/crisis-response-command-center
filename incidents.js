
import { Utils } from './utils.js';

export class Incident {
    constructor(id, type, lat, lng, severity) {
        this.id = id;
        this.type = type; // fire, crash, medical, flood, hazardous
        this.lat = lat;
        this.lng = lng;
        this.severity = severity; // 1-5

        this.startTime = Date.now();
        this.assignedUnits = [];
        this.resolved = false;
        this.manualDispatchWaiting = false;

        // Severity growth rate (fires/floods grow)
        if (['fire', 'flood'].includes(type)) {
            this.growthRate = 0.005;
        } else if (['food_shortage', 'water_shortage'].includes(type)) {
            this.growthRate = 0.003;
        } else {
            this.growthRate = 0;
        }
    }
}

export class IncidentManager {
    constructor() {
        this.incidents = [];
        this.incidentCounter = 1;
        this.TYPES = ['fire', 'crash', 'medical', 'flood', 'hazardous', 'food_shortage', 'water_shortage', 'minor_injury'];

        // Restore state
        this.loadActiveIncidents();
    }

    generateIncident(centerLat, centerLng) {
        const id = `INC-${this.incidentCounter++}`;
        const type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
        const severity = Math.floor(Math.random() * 5) + 1;
        const coords = Utils.getRandomCoordinate(centerLat, centerLng, 20000); // 20km radius

        const incident = new Incident(id, type, coords.lat, coords.lng, severity);
        this.incidents.push(incident);

        Utils.Logger.log('SYSTEM', `New Incident: ${type.toUpperCase()} (Sev: ${severity}) at Sector ${Math.floor(coords.lat * 100) % 100}`);

        this.saveActiveIncidents();
        return incident;
    }

    getIncident(id) {
        return this.incidents.find(i => i.id === id);
    }

    update(deltaTime) {
        this.incidents.forEach(inc => {
            if (inc.resolved) return;

            // Grow severity if unchecked
            if (inc.assignedUnits.length === 0 && inc.growthRate > 0) {
                inc.severity = Math.min(10, inc.severity + inc.growthRate * deltaTime);
            }

            // Reduction if units present
            if (inc.assignedUnits.length > 0) {
                // Determine effective power
                const power = inc.assignedUnits.length * 0.002 * deltaTime;
                inc.severity -= power;

                if (inc.severity <= 0) {
                    this.resolveIncident(inc);
                }
            }
        });
    }

    resolveIncident(incident) {
        incident.resolved = true;
        incident.severity = 0;
        incident.endTime = Date.now(); // Record end time
        Utils.Logger.log('SYSTEM', `Incident ${incident.id} RESOLVED.`);

        this.saveResolvedIncident(incident);
        this.saveActiveIncidents(); // Update active list
    }

    createManualIncident(type, lat, lng) {
        const id = `INC-${this.incidentCounter++}`;
        const incident = new Incident(id, type, lat, lng, 3);
        this.incidents.push(incident);
        Utils.Logger.log('OPERATOR', `Manual Incident Created: ${type.toUpperCase()}`);
        this.saveActiveIncidents();
        return incident;
    }

    // --- Persistence ---
    saveResolvedIncident(incident) {
        try {
            const history = JSON.parse(localStorage.getItem('incident_history') || '[]');
            // Keep last 50
            if (history.length > 50) history.shift();

            history.push({
                id: incident.id,
                type: incident.type,
                startTime: incident.startTime,
                endTime: incident.endTime,
                severity: incident.originalSeverity || 3
            });

            localStorage.setItem('incident_history', JSON.stringify(history));
        } catch (e) {
            console.error("Storage Error:", e);
        }
    }

    loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('incident_history') || '[]');
            history.forEach(rec => {
                Utils.Logger.log('HISTORY', `Parsed: ${rec.id} (${rec.type}) - Resolved`);
            });
            return history;
        } catch (e) {
            console.error("Load History Error:", e);
            return [];
        }
    }

    saveActiveIncidents() {
        const active = this.incidents.filter(i => !i.resolved).map(i => ({
            id: i.id,
            type: i.type,
            lat: i.lat,
            lng: i.lng,
            severity: i.severity,
            startTime: i.startTime,
            growthRate: i.growthRate,
            manualDispatchWaiting: i.manualDispatchWaiting
        }));
        localStorage.setItem('active_incidents', JSON.stringify(active));
    }

    loadActiveIncidents() {
        try {
            const saved = JSON.parse(localStorage.getItem('active_incidents') || '[]');
            saved.forEach(data => {
                const inc = new Incident(data.id, data.type, data.lat, data.lng, data.severity);
                inc.startTime = data.startTime;
                inc.growthRate = data.growthRate;
                inc.manualDispatchWaiting = data.manualDispatchWaiting || false;
                this.incidents.push(inc);

                // Update counter to avoid ID collision
                const numId = parseInt(data.id.split('-')[1]);
                if (numId >= this.incidentCounter) {
                    this.incidentCounter = numId + 1;
                }
            });
            if (saved.length > 0) {
                Utils.Logger.log('SYSTEM', `Restored ${saved.length} active incidents.`);
            }
        } catch (e) {
            console.error("Failed to load incidents", e);
        }
    }
}

export const incidentManager = new IncidentManager();
