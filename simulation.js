import { Utils } from './utils.js';
import { unitManager } from './units.js';
import { incidentManager } from './incidents.js';
import { mapManager } from './map.js';

export class SimulationEngine {
    constructor() {
        this.running = false;
        this.lastTime = 0;
        this.incidentTimer = 0;
        this.chaosMode = false;
    }

    toggleChaos() {
        this.chaosMode = !this.chaosMode;
        Utils.Logger.log('SYSTEM', `CHAOS MODE: ${this.chaosMode ? 'ENGAGED' : 'DISENGAGED'}`);
        return this.chaosMode;
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();

        // Force immediate incidents on start so list isn't empty
        Utils.Logger.log('SYSTEM', 'Initializing Simulation... Spawning initial incidents.');
        for (let i = 0; i < 3; i++) {
            this.manualCreateIncident();
        }

        requestAnimationFrame((t) => this.loop(t));
        Utils.Logger.log('SYSTEM', 'Simulation Started.');
    }

    loop(timestamp) {
        if (!this.running) return;

        try {
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            // Skip huge jumps (tab inactive)
            if (deltaTime > 1000) {
                requestAnimationFrame((t) => this.loop(t));
                return;
            }

            this.update(deltaTime);
            this.render();
        } catch (e) {
            console.error("Simulation Loop Error:", e);
            Utils.Logger.log('SYSTEM', `Error: ${e.message}`);
            // Don't stop running on error, try to recover
        }

        if (this.running) {
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    update(deltaTime) {
        // 1. Incident Generation
        this.incidentTimer += deltaTime;

        // Base Spawn Rate: Every 3s (was 5s), guarantee spawn if no incidents
        const activeCount = incidentManager.incidents.filter(i => !i.resolved).length;

        // If 0 active incidents, spawn faster
        const spawnThreshold = (activeCount === 0) ? 1000 : (this.chaosMode ? 500 : 3000);
        const chance = (activeCount === 0) ? 1.0 : (this.chaosMode ? 0.8 : 0.6);

        if (this.incidentTimer > spawnThreshold) {
            if (Math.random() < chance) {
                const inc = incidentManager.generateIncident(mapManager.center[0], mapManager.center[1]);
                mapManager.addIncidentMarker(inc);
                this.autoDispatch(inc);
            }
            this.incidentTimer = 0;
        }

        // 2. Incident Logic
        incidentManager.update(deltaTime);
        // Check for resolved incidents to clean up
        incidentManager.incidents.forEach(inc => {
            if (inc.resolved && mapManager.incidentMarkers.has(inc.id)) {
                // Keep marker for a bit or turn green?
                // Current logic: remove after short delay or change color
                // For now, let's remove it from map immediately or mark resolved visual
                mapManager.removeIncidentMarker(inc.id);

                // Free units
                inc.assignedUnits.forEach(u => {
                    u.targetIncidentId = null;
                    u.status = 'available';
                    u.targetLat = null;
                    u.targetLng = null;
                    Utils.Logger.log('DISPATCH', `Unit ${u.id} returning to Available.`);
                });
                inc.assignedUnits = [];
            } else if (!inc.resolved) {
                mapManager.updateIncidentMarker(inc);
            }
        });

        // 3. Unit Logic
        unitManager.update(deltaTime);
        unitManager.units.forEach(u => {
            mapManager.updateUnitMarker(u);
            // Update visual path if moving
            if (u.status === 'en-route') {
                mapManager.updateUnitPath(u);
            } else {
                mapManager.removeUnitPath(u.id);
            }
        });
    }

    render() {
        // UI updates handled via DOM manipulation in App or Managers
        // Ideally, we emit events, but direct DOM update is fine for this scale
        // We will do high-freq DOM updates in App.js or here
    }

    // --- Dispatch Logic ---
    autoDispatch(incident) {
        // Simple logic: Find 1 nearest appropriate unit
        // Fire -> Fire Truck, Medical -> Ambulance
        let requiredType = 'Fire';
        if (incident.type === 'medical' || incident.type === 'crash') requiredType = 'Ambulance';

        const available = unitManager.getAvailableUnits(requiredType);

        if (available.length === 0) {
            Utils.Logger.log('DISPATCH', `WARNING: No units available for ${incident.id}`);
            return;
        }

        // Find nearest
        let nearest = null;
        let minDist = Infinity;

        available.forEach(u => {
            const d = Utils.distance(u.lat, u.lng, incident.lat, incident.lng);
            if (d < minDist) {
                minDist = d;
                nearest = u;
            }
        });

        if (nearest) {
            this.assignUnit(nearest, incident);
        }
    }

    manualDispatch(unitId, incidentId) {
        // Handle "F-1" vs "1"
        const unit = unitManager.getUnit(unitId) || unitManager.getUnit('F-' + unitId) || unitManager.getUnit('A-' + unitId);
        const incident = incidentManager.getIncident(incidentId) || incidentManager.getIncident('INC-' + incidentId);

        if (!unit) {
            Utils.Logger.log('ERROR', `Unit ${unitId} not found.`);
            return;
        }
        if (!incident) {
            Utils.Logger.log('ERROR', `Incident ${incidentId} not found.`);
            return;
        }

        if (unit.status !== 'available') {
            Utils.Logger.log('DISPATCH', `Unit ${unit.id} is ${unit.status}. Cannot deploy.`);
            return;
        }

        this.assignUnit(unit, incident);
    }

    assignUnit(unit, incident) {
        unit.status = 'en-route';
        unit.targetIncidentId = incident.id;
        unit.targetLat = incident.lat;
        unit.targetLng = incident.lng;

        incident.assignedUnits.push(unit);

        Utils.Logger.log('DISPATCH', `Assigned ${unit.id} to ${incident.id}`);
    }

    manualCreateIncident(type) {
        const inc = incidentManager.generateIncident(mapManager.center[0], mapManager.center[1]);
        // Override type if specified
        if (type) inc.type = type;
        mapManager.addIncidentMarker(inc);
        this.autoDispatch(inc);
    }

    setUnitStatus(unitId, status) {
        const unit = unitManager.getUnit(unitId) || unitManager.getUnit('F-' + unitId) || unitManager.getUnit('A-' + unitId);
        if (unit) {
            unit.status = status;
            Utils.Logger.log('OPERATOR', `Set ${unit.id} to ${status}`);
        } else {
            Utils.Logger.log('ERROR', `Unit ${unitId} not found`);
        }
    }
}

export const simulationEngine = new SimulationEngine();
