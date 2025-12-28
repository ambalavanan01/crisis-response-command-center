import { Utils } from './utils.js';

export class CommandSystem {
    constructor(simulationEngine) {
        this.sim = simulationEngine;
        this.recognition = null;
        this.isListening = false;

        this.initVoice();
    }

    initVoice() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateMicStatus('Listening...');
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateMicStatus('');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                Utils.Logger.log('VOICE', `Unknown: "${transcript}"`);
                this.parseAndExecute(transcript);
                document.getElementById('command-input').value = transcript;
            };
        } else {
            Utils.Logger.log('SYSTEM', 'Voice API not supported in this browser.');
        }
    }

    toggleMic() {
        if (!this.recognition) return;
        if (this.isListening) this.recognition.stop();
        else this.recognition.start();
    }

    updateMicStatus(status) {
        const el = document.getElementById('mic-status');
        const btn = document.getElementById('mic-btn');
        if (el) el.textContent = status;
        if (btn) {
            if (this.isListening) btn.classList.add('listening');
            else btn.classList.remove('listening');
        }
    }

    parseAndExecute(input) {
        const text = input.toLowerCase().trim();
        Utils.Logger.log('CMD', `Executing: ${text}`);

        // Regex Patterns
        // /deploy unit=X incident=Y
        // "Deploy Unit X to Incident Y"
        const deployRegex = /(?:deploy|dispatch|send)\s+(?:unit\s+)?([a-z0-9-]+)\s+(?:to|at)?\s+(?:incident\s+)?([a-z0-9-]+)/i;

        // /create_incident type=fire lat=34.1 lng=-118.2
        // "Create fire at sector 34.1, -118.2" (Hard to parse coords via voice, supporting simplified creates)
        const createRegex = /create\s+(?:incident\s+)?(fire|medical|crash|flood|hazardous)/i;

        // /status unit=X status=out_of_service
        const statusRegex = /set\s+(?:unit\s+)?([a-z0-9-]+)\s+(?:status\s+)?(available|out_of_service|busy)/i;

        let match;

        // DEPLOY
        if (match = text.match(deployRegex)) {
            const unitId = match[1]; // e.g. "unit=3", "3", "F-1"
            const incId = match[2];
            this.sim.manualDispatch(this.normalizeId(unitId, 'unit'), this.normalizeId(incId, 'incident'));
            return;
        }

        // CREATE
        if (match = text.match(createRegex)) {
            const type = match[1];
            // Random location for now if not specified
            this.sim.manualCreateIncident(type);
            return;
        }

        // STATUS
        if (match = text.match(statusRegex)) {
            const unitId = match[1];
            let status = match[2].replace(/_/g, '-'); // out_of_service -> out-of-service
            if (status === 'out-of-service') status = 'out-of-service';
            this.sim.setUnitStatus(this.normalizeId(unitId, 'unit'), status);
            return;
        }

        Utils.Logger.log('SYSTEM', 'Command not recognized.');
    }

    normalizeId(raw, type) {
        // Voice might interpret "Unit 1" as "1" or "one"
        // This is a minimal normalizer
        let id = raw.toUpperCase().replace('UNIT', '').replace('INCIDENT', '').replace('=', '').trim();

        // If user says "Unit 1", maps to F-1 or A-1? 
        // For simplicity, we assume user types/says full ID or we guess.
        // Let's assume strict IDs for now or simple "F-1" format if they say "F 1"
        id = id.replace(/\s/g, '-');
        return id;
    }
}
