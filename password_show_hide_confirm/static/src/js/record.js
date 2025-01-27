/** @odoo-module **/

import { Record } from "@web/model/relational_model/record";
import { patch } from "@web/core/utils/patch";

patch(Record.prototype, {
    _checkValidity({ silent, displayNotification } = {}) {
        const result = super._checkValidity(...arguments);
        if (result && this.invalidPasswordFields?.length) {
            return false;
        }
        return result;
    },

    setInvalidPasswordFields(fields) {
        this.invalidPasswordFields = fields;
    },

    clearInvalidPasswordFields() {
        this.invalidPasswordFields = [];
    },

    beforeSave() {
        return true;
    },

    async save(options) {
        if (!this.beforeSave()) return;

        return await super.save(options);
    },
});
