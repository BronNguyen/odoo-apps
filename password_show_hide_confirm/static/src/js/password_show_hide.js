/** @odoo-module **/

import { registry } from "@web/core/registry";
import { CharField } from "@web/views/fields/char/char_field";
import { useState, useEffect } from "@odoo/owl";

class PasswordShowHide extends CharField {
    static template = "password_show_hide_confirm.PasswordShowHide";
    setup() {
        super.setup();
        this.state = useState({
            isPassword: true,
        });

        useEffect(
            (ref) => {
                if (!ref) return;

                ref.el.type = "password";
            },
            () => [this.input]
        );
    }

    _onTogglePassword(ev) {
        ev.preventDefault();
        const inputEl = this.input.el;
        if (this.state.isPassword) {
            inputEl.type = "text";
            this.state.isPassword = false;
            return;
        }

        inputEl.type = "password";
        this.state.isPassword = true;
    }
}

export const passwordShowHide = {
    ...CharField,
    component: PasswordShowHide,
};

registry.category("fields").add("password_show_hide_confirm", passwordShowHide);
