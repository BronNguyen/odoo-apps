/** @odoo-module **/

import { GOOGLE_MAP_URL } from "./config";

(async function () {
    const apiKey = localStorage.getItem("google_map_api_key");
    if (apiKey) {
        const script = document.createElement("script");
        script.src = `${GOOGLE_MAP_URL}${apiKey}`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        script.onload = () => {
            console.log("Google Maps API loaded successfully.");
        };
        script.onerror = () => {
            console.error("Error loading Google Maps API.");
        };
    } else {
        console.warn("Google Maps API key not found in localStorage.");
    }
})();
