/** @odoo-module **/
/* global MarkerClusterer, google */

import { registry } from "@web/core/registry";
import { CharField } from "@web/views/fields/char/char_field";
import { MapRenderer } from "@web_map/map_view/map_renderer";
import { useService } from "@web/core/utils/hooks";
import { loadJS } from "@web/core/assets";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { archParseBoolean } from "@web/views/utils";

const GOOGLE_MAP_URL = "https://maps.googleapis.com/maps/api/js?libraries=places,geocoding&key=";

const { useRef, useEffect, useState, onMounted, onWillStart, onWillUnmount } = owl;

export class GoogleMapField extends CharField {
    static template = "social_twitter.TwitterUsersAutocompleteField";

    static template = "google_map_field.GoogleMapField";
    static components = { ...CharField.components, MapRenderer };
    static defaultProps = { shouldHide: "[]" };
    static props = {
        ...standardFieldProps,
        autocomplete: { type: String, optional: true },
        isPassword: { type: Boolean, optional: true },
        placeholder: { type: String, optional: true },
        dynamicPlaceholder: { type: Boolean, optional: true },
        shouldTrim: { type: Boolean, optional: true },
        maxLength: { type: Number, optional: true },
        isTranslatable: { type: Boolean, optional: true },
        shouldHide: { type: String, optional: true },
    };

    setup() {
        debugger;
        super.setup();
        this.mapPinRef = useRef("map_pin_ref");
        this.mapPopupRef = useRef("map_popup_ref");
        this.mapRef = useRef("geomap_ref");
        this.inputRef = useRef("input");
        this.input2Ref = useRef("input2");
        this.notificationService = useService("notification");
        this.orm = useService("orm");
        this.state = useState({
            isShowing: false,
            lat: 10.8231,
            long: 106.6297,
            googleMapLoaded: true,
        });

        this.autoComplete = !this.hideGoogleMapField;

        useEffect(
            (ref) => {
                if (!ref) return;

                function toggleMap(event) {
                    const pinEl = this.mapPinRef.el;
                    const input2El = this.input2Ref.el;
                    const { el } = this.mapRef;
                    const { target } = event;

                    if (!this.state.isShowing && target === pinEl) {
                        this.mapPopupRef.el.classList.add("active");
                        this.state.isShowing = true;
                        return;
                    }

                    if (!el?.contains(target) && target !== input2El) {
                        this.mapPopupRef.el?.classList.remove("active");
                        this.state.isShowing = false;
                    }
                }

                document.addEventListener("click", toggleMap.bind(this));
                return () => {
                    document.removeEventListener("click", toggleMap.bind(this));
                };
            },
            () => [this.mapPinRef]
        );
        onWillStart(() => this.loadGoogleMapLib());
        onMounted(() => this.initAutocomplete());
        onWillUnmount(() => this.removeMapEvents());
    }

    async loadGoogleMapLib() {
        try {
            const api = await this.orm.call("google.api.key.manager", "get_google_api_key", []);
            await loadJS(`${GOOGLE_MAP_URL}${api}`);
            this.geocoder = new google.maps.Geocoder();
        } catch (error) {
            this.state.googleMapLoaded = false;
            this.notificationService.add(this.env._t("Failed Loading Google Map API."), {
                title: this.env._t("Loading Google Map Error"),
                sticky: true,
            });
        }
    }

    get shouldHideGoogleMapField() {
        const shouldHide = this.hideGoogleMapField;
        return this.toggleAutocomplete(shouldHide);
    }

    get hideGoogleMapField() {
        const hideArray = this.props.shouldHide.replaceAll("'", "").slice(1, -1).split(", ");
        if (hideArray?.length === 3) {
            try {
                const [field_name, op, condition] = hideArray;
                const operator = op === "=" ? "===" : "!=" ? "!==" : op;
                const result = eval(
                    `"${this.props.record.data[field_name]}"${operator}"${condition}"`
                );

                return result;
            } catch (error) {
                this.notificationService.add(this.env._t(error), {
                    title: this.env._t("An error occurred:"),
                    sticky: true,
                });
            }
        }

        return false;
    }

    initMapComponents() {
        if (!this.state.googleMapLoaded) return;

        this.initMap();
        this.initAutocomplete();
        this.initMarkerAndInfoWindow();
        this.handleInputAddressChanged(this.inputRef.el?.value);
    }

    initMap() {
        if (!this.inputRef.el || !this.input2Ref.el) return;

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
        if (this.input2Ref.el) setElementAutocomplete(this.input2Ref.el);
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
        if (this.input2Ref?.el) google.maps.event.clearInstanceListeners(this.input2Ref.el);
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
        if (!this.state.googleMapLoaded) return;

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

GoogleMapField.extractProps = ({ attrs, field }) => {
    return {
        shouldTrim: field.trim && !archParseBoolean(attrs.password), // passwords shouldn't be trimmed
        maxLength: field.size,
        isTranslatable: field.translate,
        dynamicPlaceholder: attrs.options.dynamic_placeholder,
        autocomplete: attrs.autocomplete,
        isPassword: archParseBoolean(attrs.password),
        placeholder: attrs.placeholder,
        shouldHide: attrs.hide_google_map_field,
    };
};

registry.category("fields").add("google_map_field", GoogleMapField);
