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

        if (this.props.confirmPasswordTo) {
            this.env.model.root.confirmPasswordField = this;
            this.env.model.root.allowSave = this.checkPasswordConfirmation.bind(this);
        }

        this.passwordConfirmed = true;

        useEffect(
            (ref) => {
                if (!ref) return;

                ref.el.type = "password";
            },
            () => [this.input]
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

    checkPasswordConfirmation() {
        debugger;
        this.state.passwordConfirmed = this.passwordConfirmed;
        const fieldName = this.props.confirmPasswordTo;
        if (this.passwordConfirmed) {
            this.env.model.root._invalidFields?.clear();
            return true;
        }
        this.env.model.root._invalidFields.add(this.props.name).add(fieldName);
        this.input.el.value = "";
        return false;
    }

    onPasswordInput() {
        this.state.passwordConfirmed = true;
        if (!this.props.confirmPasswordTo) {
            const { confirmPasswordField } = this.env.model.root;
            if (!confirmPasswordField) return;

            const { value } = this.input.el;
            const data = confirmPasswordField.input.el.value;
            if ((value && value === data) || (!value && !data)) {
                this.passwordConfirmed = true;
                confirmPasswordField.passwordConfirmed = true;
                return;
            }
            this.passwordConfirmed = false;
            confirmPasswordField.passwordConfirmed = false;
            this.env.model.root.setInvalidPasswordFields([
                confirmPasswordField.props.name,
                this.props.name,
            ]);
            return;
        }

        this.env.model.root._invalidFields?.clear();
        this.env.model.root.clearInvalidPasswordFields();
        const { value } = this.input.el;
        const fieldName = this.props.confirmPasswordTo;
        const data = this.env.model.root.data[fieldName];
        if ((value && value === data) || (!value && !data)) {
            this.passwordConfirmed = true;
            return;
        }

        this.env.model.root.setInvalidPasswordFields([fieldName, this.props.name]);
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
