/** @odoo-module **/
/* global MarkerClusterer, google */

import { registry } from "@web/core/registry";
import { CharField } from "@web/views/fields/char/char_field";
import { MapRenderer } from "@web_map/map_view/map_renderer";
import { useService } from "@web/core/utils/hooks";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { loadGoogleMapLibWithApi } from "./google_api_services";
const { useRef, useEffect, useState, onMounted, onWillStart, onWillUnmount } = owl;
import { _t } from "@web/core/l10n/translation";

export class GoogleMapField extends CharField {
    static template = "google_map_field.GoogleMapField";
    static components = { ...CharField.components, MapRenderer };
    static props = {
        ...standardFieldProps,
        autocomplete: { type: String, optional: true },
        isPassword: { type: Boolean, optional: true },
        placeholder: { type: String, optional: true },
        dynamicPlaceholder: { type: Boolean, optional: true },
    };

    setup() {
        super.setup();
        this.mapPinRef = useRef("map_pin_ref");
        this.mapPopupRef = useRef("map_popup_ref");
        this.mapRef = useRef("geomap_ref");
        this.inputRef = useRef("input");
        this.apiInputRef = useRef("api_input");
        this.notificationService = useService("notification");
        this.orm = useService("orm");
        this.state = useState({
            isShowing: false,
            lat: 10.8231,
            long: 106.6297,
        });

        // this.autoComplete = !this.hideGoogleMapField;

        useEffect(
            (ref) => {
                if (!ref) return;

                function toggleMap(event) {
                    const pinEl = this.mapPinRef.el;
                    const { el } = this.mapRef;
                    const { target } = event;

                    if (!this.state.isShowing && target === pinEl) {
                        this.mapPopupRef.el.classList.add("active");
                        this.state.isShowing = true;
                        return;
                    }
                }

                document.addEventListener("click", toggleMap.bind(this));
                return () => {
                    document.removeEventListener("click", toggleMap.bind(this));
                };
            },
            () => [this.mapPinRef]
        );

        onWillStart(() => this.ensureGoogleMapLibLoaded());
        onMounted(() => {
            if (!this.googleMapLoaded) return;

            this.geocoder = new google.maps.Geocoder();
            this.initAutocomplete();
        });

        onWillUnmount(() => {
            if (!this.googleMapLoaded) return;

            this.removeMapEvents();
        });
    }

    showApiInput() {
        this.state.isShowingApiInput = true;
    }

    hideApiInput() {
        this.state.isShowingApiInput = false;
    }

    inputApiKey(event) {
        event.preventDefault();
        this.apiKey = this.apiInputRef.el.value;
        this.hideApiInput();

        // reload google map lib after input api key
        this.loadGoogleMapLib();
    }

    saveApiKey() {
        localStorage.setItem("google_map_api_key", this.apiKey);
        try {
            this.orm.call("google.api.key.manager", "set_google_api_key", [this.apiKey]);
        } catch (error) {
            this.notificationService.add(
                _t("Could not save Google Map API key in System Parameters"),
                {
                    title: _t("API KEY not saved!"),
                    sticky: true,
                }
            );
        }
    }

    closePopup(event) {
        event.preventDefault();
        this.hideApiInput();
    }

    ensureGoogleMapLibLoaded() {
        if (typeof google !== "undefined" && google.maps) {
            console.log("Google Maps library is already loaded");
            this.googleMapLoaded = true;
        } else {
            console.log("Google Maps library is not loaded, loading now...");
            this.loadGoogleMapLib();
        }
    }

    async getGoogleMapApiKey() {
        try {
            const apiKey = await this.orm.call("google.api.key.manager", "get_google_api_key", []);
            if (!apiKey) throw new Error("No GoogleMap API Key found");

            return apiKey;
        } catch (error) {
            this.showApiInput();
            this.notificationService.add(
                _t("Could not found Google Map API key in System Parameters"),
                {
                    title: _t("API KEY not found!"),
                    sticky: true,
                }
            );
            return false;
        }
    }

    async loadGoogleMapLib() {
        try {
            if (!this.apiKey) this.apiKey = await this.getGoogleMapApiKey();
            if (!this.apiKey) return;

            await loadGoogleMapLibWithApi(this.apiKey);
            this.saveApiKey();
            this.googleMapLoaded = true;
            this.notificationService.add(_t("Google Map API loaded successfully."), {
                title: _t("Google Map API loaded"),
                type: "success",
            });

        } catch (error) {
            this.googleMapLoaded = false;
            this.notificationService.add(_t("Failed Loading Google Map API."), {
                title: _t("Loading Google Map Error", error),
                type: "danger",
                sticky: true,
            });
        }
    }

    get shouldHideGoogleMapField() {
        const shouldHide = this.hideGoogleMapField;
        return this.toggleAutocomplete(shouldHide);
    }

    get hideGoogleMapField() {
        // const hideArray = this.props.shouldHide.replaceAll("'", "").slice(1, -1).split(", ");
        // if (hideArray?.length === 3) {
        //     try {
        //         const [field_name, op, condition] = hideArray;
        //         const operator = op === "=" ? "===" : "!=" ? "!==" : op;
        //         const result = eval(
        //             `"${this.props.record.data[field_name]}"${operator}"${condition}"`
        //         );

        //         return result;
        //     } catch (error) {
        //         this.notificationService.add(_t(error), {
        //             title: _t("An error occurred:"),
        //             sticky: true,
        //         });
        //     }
        // }

        return false;
    }

    initMapComponents() {
        if (!this.googleMapLoaded) return;

        this.initMap();
        this.initAutocomplete();
        this.initMarkerAndInfoWindow();
        this.handleInputAddressChanged(this.inputRef.el?.value);
    }

    initMap() {
        const center = new google.maps.LatLng(this.state.lat, this.state.long);
        const myOptions = {
            zoom: 14,
            center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
        };
        this.map = new google.maps.Map(this.mapRef.el, myOptions);
    }

    initAutocomplete() {
        if (!this.map) this.initMap();
        if (!this.autoComplete) return;

        const setElementAutocomplete = (element) => {
            element.setAttribute("autocomplete", "off");
            const autocomplete = new google.maps.places.Autocomplete(element, {
                types: ["geocode"],
            });
            autocomplete.bindTo("bounds", this.map);
            autocomplete.setFields([
                "address_component",
                "geometry",
                "icon",
                "name",
                "formatted_address",
            ]);

            return autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                this.handleInputAddressChanged(place?.formatted_address);
            });
        };
        if (this.inputRef.el) setElementAutocomplete(this.inputRef.el);
    }

    toggleAutocomplete(shouldHide) {
        if (shouldHide) {
            this.removeAutocomplete();
        } else {
            this.initAutocomplete();
        }

        return shouldHide;
    }

    removeAutocomplete() {
        if (this.inputRef?.el) google.maps.event.clearInstanceListeners(this.inputRef.el);
    }

    initMarkerAndInfoWindow() {
        const position = new google.maps.LatLng(this.state.lat, this.state.long);
        this.marker = new google.maps.Marker({
            map: this.map,
            position,
            draggable: true,
            title: "Position",
        });

        this.infoWindow = new google.maps.InfoWindow({
            content: "",
            size: new google.maps.Size(150, 50),
        });

        google.maps.event.addListener(this.marker, "dragend", () => {
            this.updateAddressFromLocation(this.marker.getPosition());
            this.updateStatePosition();
        });
        google.maps.event.addListener(this.marker, "click", () => {
            this.infoWindow.setContent(this.marker.formatted_address || "");
            this.infoWindow.open(this.map, this.marker);
            this.updateStatePosition();
        });
    }

    removeMapEvents() {
        if (!this.googleMapLoaded) return;

        this.removeAutocomplete();
        this.removeMarkers();
    }

    removeMarkers() {
        if (!this.marker) return;
        google.maps.event.clearListeners(this.marker, "dragend");
        google.maps.event.clearListeners(this.marker, "click");
    }

    handleInputAddressChanged(address) {
        if (!address || !this.autoComplete) return;

        this.geocoder.geocode({ address }, (results, status) => {
            if (status !== google.maps.GeocoderStatus.OK) return;

            const { geometry, formatted_address } = results[0];
            this.marker?.setPosition(geometry.location);
            this.updateCurrentAddress(formatted_address);
            this.updateStatePosition();
        });
    }

    updateAddressFromLocation(latLng) {
        this.geocoder.geocode({ latLng }, (results, status) => {
            let address = "Unable to determine the location for the provided address.";
            if (status === google.maps.GeocoderStatus.OK) {
                address = results[0].formatted_address;
            }

            this.updateCurrentAddress(address);
        });
    }

    updateStatePosition() {
        this.state.lat = this.marker?.position.lat();
        this.state.long = this.marker?.position.lng();
    }

    updateCurrentAddress(formatted_address) {
        this.props.update(formatted_address);
        if (!this.marker) return;

        this.marker.formatted_address = formatted_address;
        this.infoWindow.setContent(formatted_address);
        this.infoWindow.open(this.map, this.marker);
    }
}

export const googleMapField = {
    ...CharField,
    component: GoogleMapField,
};

registry.category("fields").add("google_map_field", googleMapField);
