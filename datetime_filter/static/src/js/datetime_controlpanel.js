/** @odoo-module **/

import { DatetimeFilterItem } from "./datetime_filter_item";
import { ControlPanel } from "@web/search/control_panel/control_panel";

ControlPanel.components = { ...ControlPanel.components, DatetimeFilterItem };
