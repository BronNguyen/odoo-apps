/** @odoo-module **/

import { GOOGLE_MAP_URL } from "./config";
import { loadJS } from "@web/core/assets";

(async function () {
    const apiKey = localStorage.getItem("google_map_api_key");
    if (apiKey) {
        await loadGoogleMapLibWithApi(apiKey);
        console.warn("Google Maps API key not found in localStorage.");
    }
})();

export async function loadGoogleMapLibWithApi(api) {
    try {
        if (typeof google !== "undefined" && google.maps) {
            console.warn("Google Maps library is already loaded");
        } else {
            console.log("Google Maps library is not loaded, loading now...");
            await loadJS(`${GOOGLE_MAP_URL}${api}`);
        }
        // this.geocoder = new google.maps.Geocoder();
        return true;
    } catch (error) {
        console.error("Failed Loading Google Map API.", error);
        return error;
    }
}
