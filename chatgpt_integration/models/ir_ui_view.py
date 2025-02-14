# -*- coding: utf-8 -*-

from odoo import models, fields, api

class IrUIView(models.Model):
    _inherit = 'ir.ui.view'

    type = fields.Selection(selection_add=[('chat_ai', "Chat AI")])


    @api.model
    def _get_default_chat_ai_view(self):
        sheet = E.sheet(string=self._description)
        main_group = E.group()
        left_group = E.group()
        right_group = E.group()
        for fname, field in self._fields.items():
            if field.automatic:
                continue
            elif field.type in ('one2many', 'many2many', 'text', 'html'):
                # append to sheet left and right group if needed
                if len(left_group) > 0:
                    main_group.append(left_group)
                    left_group = E.group()
                if len(right_group) > 0:
                    main_group.append(right_group)
                    right_group = E.group()
                if len(main_group) > 0:
                    sheet.append(main_group)
                    main_group = E.group()
                # add an oneline group for field type 'one2many', 'many2many', 'text', 'html'
                sheet.append(E.group(E.field(name=fname)))
            else:
                if len(left_group) > len(right_group):
                    right_group.append(E.field(name=fname))
                else:
                    left_group.append(E.field(name=fname))
        if len(left_group) > 0:
            main_group.append(left_group)
        if len(right_group) > 0:
            main_group.append(right_group)
        sheet.append(main_group)
        sheet.append(E.group(E.separator()))
        return E.form(sheet)