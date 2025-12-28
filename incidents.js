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

        // Severity growth rate (fires/floods grow)
        this.growthRate = (type === 'fire' || type === 'flood') ? 0.005 : 0;
    }
}

export class IncidentManager {
    constructor() {
        this.incidents = [];
        this.incidentCounter = 1;
        this.TYPES = ['fire', 'crash', 'medical', 'flood', 'hazardous'];
    }

    generateIncident(centerLat, centerLng) {
        const id = `INC-${this.incidentCounter++}`;
        const type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
        const severity = Math.floor(Math.random() * 5) + 1;
        const coords = Utils.getRandomCoordinate(centerLat, centerLng, 20000); // 20km radius

        const incident = new Incident(id, type, coords.lat, coords.lng, severity);
        this.incidents.push(incident);

        Utils.Logger.log('SYSTEM', `New Incident: ${type.toUpperCase()} (Sev: ${severity}) at Sector ${Math.floor(coords.lat * 100) % 100}`);

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
                // Slower resolution: 0.002 per unit per ms (was 0.02)
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
    }

    createManualIncident(type, lat, lng) {
        const id = `INC-${this.incidentCounter++}`;
        const incident = new Incident(id, type, lat, lng, 3);
        this.incidents.push(incident);
        Utils.Logger.log('OPERATOR', `Manual Incident Created: ${type.toUpperCase()}`);
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
                severity: incident.originalSeverity || 3 // Store original if available, else default
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
}

export const incidentManager = new IncidentManager();
