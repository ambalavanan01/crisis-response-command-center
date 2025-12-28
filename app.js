import { Utils } from './utils.js';
import { mapManager } from './map.js';
import { unitManager } from './units.js';
import { incidentManager } from './incidents.js';
import { simulationEngine } from './simulation.js';
import { CommandSystem } from './commands.js';

class App {
    constructor() {
        this.commandSystem = null;
    }

    init() {
        try {
            // 1. Init Map
            mapManager.init();

            // 2. Init Units
            unitManager.init(mapManager.center[0], mapManager.center[1]);

            // 3. Init Command System
            this.commandSystem = new CommandSystem(simulationEngine);

            // 4. Bind UI
            this.bindEvents();

            // 5. Start Simulation
            simulationEngine.start();

            // Load History
            incidentManager.loadHistory();

            // 6. Start UI Loop
            requestAnimationFrame((t) => this.uiLoop(t));

            Utils.Logger.log('SYSTEM', 'Command Center Online. Systems Nominal.');
        } catch (e) {
            console.error("App Init Error:", e);
            // Fallback log if Logger works, else alert
            if (Utils && Utils.Logger) {
                Utils.Logger.log('SYSTEM', `CRITICAL ERROR: ${e.message}`);
            } else {
                alert(`App Init Error: ${e.message}`);
            }
        }
    }

    bindEvents() {
        // Command Input
        const input = document.getElementById('command-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.commandSystem.parseAndExecute(input.value);
                input.value = '';
            }
        });

        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.addEventListener('click', () => {
                this.commandSystem.toggleMic();
            });
        }

        // Chaos Button
        const chaosBtn = document.getElementById('chaos-btn');
        if (chaosBtn) {
            chaosBtn.addEventListener('click', () => {
                const active = simulationEngine.toggleChaos();
                chaosBtn.style.background = active ? 'var(--accent-red)' : 'transparent';
                chaosBtn.style.color = active ? '#000' : 'var(--accent-red)';
            });
        }

        // Cluster Button
        const clusterBtn = document.getElementById('cluster-btn');
        if (clusterBtn) {
            clusterBtn.addEventListener('click', () => {
                Utils.Logger.log('OPERATOR', 'Spawning Incident Cluster (5)...');
                for (let i = 0; i < 5; i++) {
                    simulationEngine.manualCreateIncident();
                }
            });
        }
    }

    uiLoop(timestamp) {
        try {
            // Update Time
            const timeEl = document.getElementById('system-time');
            if (timeEl) timeEl.textContent = Utils.formatTime();

            // Update Stats
            const incStat = document.getElementById('stat-incidents');
            if (incStat) incStat.textContent = incidentManager.incidents.filter(i => !i.resolved).length;

            const unitStat = document.getElementById('stat-units');
            if (unitStat) unitStat.textContent = unitManager.getAvailableUnits().length;

            // Render Lists
            this.renderIncidentList();
            this.renderUnitList();
        } catch (e) {
            console.error("UI Loop Error:", e);
        }

        requestAnimationFrame((t) => this.uiLoop(t));
    }

    renderIncidentList() {
        const container = document.getElementById('incident-list');
        // Simple DOM Diff or Clear/Redraw. For vanilla JS & small lists, clear/redraw is easiest.
        container.innerHTML = '';

        const active = incidentManager.incidents.filter(i => !i.resolved);
        if (active.length === 0) {
            container.innerHTML = '<div style="color:var(--text-secondary); padding:10px;">No Active Incidents</div>';
            return;
        }

        active.forEach(inc => {
            const div = document.createElement('div');
            div.className = 'incident-item';
            div.innerHTML = `
                <div class="incident-header">
                    <span>${inc.type.toUpperCase()}</span>
                    <span>${inc.id}</span>
                </div>
                <div class="incident-details">
                    Severity: ${inc.severity.toFixed(1)} | Units: ${inc.assignedUnits.length}
                </div>
            `;
            container.appendChild(div);
        });
    }

    renderUnitList() {
        const container = document.getElementById('unit-list');
        container.innerHTML = '';

        unitManager.units.forEach(u => {
            const div = document.createElement('div');
            div.className = 'unit-item';

            let statusClass = 'status-available';
            if (u.status === 'busy') statusClass = 'status-busy';
            if (u.status === 'en-route') statusClass = 'status-en-route';
            if (u.status === 'out-of-service') statusClass = 'status-out';

            div.innerHTML = `
                <div class="unit-info">${u.id} <span style="font-size:0.8em; color:var(--text-secondary)">(${u.type})</span></div>
                <div class="unit-status ${statusClass}">${u.status.toUpperCase()}</div>
            `;
            container.appendChild(div);
        });
    }
}

// Start App
const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
