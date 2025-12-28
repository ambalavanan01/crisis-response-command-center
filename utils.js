export const Utils = {
    // Calculate Euclidean distance (simplified for small map area)
    // Leaflet provides distanceTo, but this is for our internal simulation logic
    distance: (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in meters
    },

    formatTime: (date = new Date()) => {
        return date.toLocaleTimeString('en-GB', { hour12: false });
    },

    generateRandomId: (prefix = 'ID') => {
        return `${prefix}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    },

    // Get random coordinate within radius (meters) of center
    getRandomCoordinate: (centerLat, centerLng, radiusMeters) => {
        const r = radiusMeters / 111300; // = 1 degree roughly
        const u = Math.random();
        const v = Math.random();
        const w = r * Math.sqrt(u);
        const t = 2 * Math.PI * v;
        const x = w * Math.cos(t);
        const y = w * Math.sin(t);

        // Adjust x by cos(lat)
        const xAdjusted = x / Math.cos(centerLat * Math.PI / 180);

        return {
            lat: centerLat + y,
            lng: centerLng + xAdjusted
        };
    },

    Logger: {
        log: (actor, message) => {
            const logPanel = document.getElementById('event-log');
            if (!logPanel) return;

            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.innerHTML = `
                <span class="log-time">[${Utils.formatTime()}]</span>
                <span class="log-actor">${actor}:</span>
                <span class="log-msg">${message}</span>
            `;
            logPanel.prepend(entry); // Newest top

            // Limit logs
            if (logPanel.children.length > 50) {
                logPanel.lastElementChild.remove();
            }
        }
    }
};
