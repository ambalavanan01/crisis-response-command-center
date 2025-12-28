import { Utils } from './utils.js';

export class Unit {
    constructor(type, id, centerLat, centerLng) {
        this.id = id;
        this.type = type; // 'Fire', 'Ambulance'

        // Random start position near center (Vellore: ~15km radius)
        const startPos = Utils.getRandomCoordinate(centerLat, centerLng, 15000);
        this.lat = startPos.lat;
        this.lng = startPos.lng;

        this.status = 'available'; // available, en-route, busy, out-of-service
        this.targetIncidentId = null;
        this.targetLat = null;
        this.targetLng = null;

        this.fuel = 100;
        this.fatigue = 0; // 0-100
        this.supplies = 100;

        // Simulation stats
        this.speed = type === 'Fire' ? 0.00015 : 0.00020; // roughly degrees per tick
    }
}

export class UnitManager {
    constructor() {
        this.units = [];
    }

    init(centerLat, centerLng) {
        // Create 5 Fire Trucks
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('Fire', `F-${i}`, centerLat, centerLng));
        }
        // Create 5 Ambulances
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('Ambulance', `A-${i}`, centerLat, centerLng));
        }

        // Create 5 Shelters
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('Shelters', `S-${i}`, centerLat, centerLng));
        }

        // Create 5 FirstAid Units
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('FirstAid', `FA-${i}`, centerLat, centerLng));
        }

        // Create 5 FoodSupply Units
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('FoodSupply', `FS-${i}`, centerLat, centerLng));
        }

        // Create 5 WaterTanker Units
        for (let i = 1; i <= 5; i++) {
            this.units.push(new Unit('WaterTanker', `WT-${i}`, centerLat, centerLng));
        }
    }

    getUnit(id) {
        return this.units.find(u => u.id === id);
    }

    getAvailableUnits(type = null) {
        return this.units.filter(u =>
            u.status === 'available' &&
            (type ? u.type === type : true) &&
            u.fuel > 10 // Min fuel check
        );
    }

    update(deltaTime) {
        this.units.forEach(unit => {
            if (unit.status === 'out-of-service') return;

            // Fuel decay - DISABLED for infinite uptime
            // if (unit.status !== 'available') {
            //     unit.fuel -= 0.005 * deltaTime;
            // } else {
            //     unit.fuel -= 0.001 * deltaTime; // Idling
            // }

            // Fatigue - DISABLED for infinite uptime
            // if (unit.status === 'busy') {
            //     unit.fatigue += 0.01 * deltaTime;
            // } else {
            //     unit.fatigue = Math.max(0, unit.fatigue - 0.02 * deltaTime);
            // }

            // Auto-out-of-service if fuel low or fatigue high - DISABLED
            // if (unit.fuel <= 0 || unit.fatigue >= 100) {
            //     unit.status = 'out-of-service';
            //     Utils.Logger.log('SYSTEM', `Unit ${unit.id} out of service (Fuel/Fatigue).`);
            // }

            // Movement logic
            if (unit.status === 'en-route' && unit.targetLat && unit.targetLng) {
                this.moveUnit(unit);
            }
        });
    }

    moveUnit(unit) {
        const dLat = unit.targetLat - unit.lat;
        const dLng = unit.targetLng - unit.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.0005) { // Arrived (approx 50m)
            unit.lat = unit.targetLat;
            unit.lng = unit.targetLng;
            unit.status = 'busy';
            Utils.Logger.log('UNIT', `${unit.id} arrived at incident.`);
            // Note: Incident logic handles the 'busy' duration
        } else {
            const ratio = unit.speed / dist;
            unit.lat += dLat * ratio;
            unit.lng += dLng * ratio;
        }
    }
}

export const unitManager = new UnitManager();
