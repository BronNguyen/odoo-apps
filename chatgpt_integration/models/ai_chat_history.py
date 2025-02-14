# -*- coding: utf-8 -*-

from odoo import models, fields, api

class AIChatHistory(models.Model):
    _name = 'ai.chat.history'
    _description = 'AI Chat History'

    message = fields.Text(string='Message', required=True)
    is_user = fields.Boolean(string='Is User', default=False)
    chat_id = fields.Many2one('ai.chat', string='Chat ID')
