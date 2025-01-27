/** @odoo-module **/

import { registry } from "@web/core/registry";
import { CharField } from "@web/views/fields/char/char_field";
import { useState, useEffect } from "@odoo/owl";
import { archParseBoolean } from "@web/views/utils";

class PasswordShowHide extends CharField {
    static template = "password_show_hide_confirm.PasswordShowHide";
    static props = {
        ...CharField.props,
        confirmPasswordTo: { type: String, optional: true },
    };

    setup() {
        super.setup();
        this.state = useState({
            isPassword: true,
            passwordConfirmed: true,
        });

        this.env.model.hooks.onWillSaveRecord = this.checkPasswordConfirmation.bind(this);

        useEffect(
            (ref) => {
                if (!ref) return;

                ref.el.type = "password";
            },
            () => [this.input]
        );

        useEffect(
            (fieldName) => {
                if (!fieldName) return;
                const checkPasswordConfirmation = function () {
                    const value = this.props.value;
                    const data = this.env.model.root.data[fieldName];
                    if (value && value === data) {
                        this.state.passwordConfirmed = true;
                        return;
                    }

                    this.state.passwordConfirmed = false;
                    this.env.model.root._setInvalidField(fieldName);
                    this.env.model.root._setInvalidField(this.props.name);
                };

                this.checkPasswordConfirmation = checkPasswordConfirmation;
            },
            () => [this.props.confirmPasswordTo]
        );
    }

    get record() {
        return this.env.model.root;
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

    handleOnchangeInput(ev) {
        this.checkPasswordConfirmation();
    }

    checkPasswordConfirmation() {
        //mock function
        return;
    }
}

export const passwordShowHide = {
    ...CharField,
    component: PasswordShowHide,
    extractProps: ({ attrs, options }) => ({
        isPassword: archParseBoolean(attrs.password),
        dynamicPlaceholder: options.dynamic_placeholder || false,
        dynamicPlaceholderModelReferenceField:
            options.dynamic_placeholder_model_reference_field || "",
        autocomplete: attrs.autocomplete,
        placeholder: attrs.placeholder,
        confirmPasswordTo: attrs.confirm_password_to,
    }),
};

registry.category("fields").add("password_show_hide_confirm", passwordShowHide);
