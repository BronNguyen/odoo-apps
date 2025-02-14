# -*- coding: utf-8 -*-
from openai import OpenAI
from odoo import models, fields, api

class AIChat(models.Model):
    _name = "ai.chat"
    _description = "AI Chat Integration"

    name = fields.Char(string="Prompt")
    text_question = fields.Text(string="AI Question")
    text_response = fields.Text(string="AI Response")
    chat_history_ids = fields.One2many('ai.chat.history', 'chat_id', string="Chat History")
    ai_model = fields.Selection([
        ('o1-mini', 'o1 Mini'),
        ('gpt-4o-realtime-preview', 'GPT-4 Realtime'),
        ('gpt-4o-realtime-preview-2024-10-01', 'GPT-4 Realtime (2024)')],
        default='o1-mini',
        string="AI Model")

    def action_generate_ai_response(self):
        for record in self:
            if not record.name and record.text_question:
                record.name = record.text_question

            answer = self.chat_with_ai(record.text_question)
            record.text_response = answer
            record.chat_history_ids = [
                (0, 0, {
                'message': record.text_question,
                'is_user': True
                }),
                (0, 0, {
                'message': answer,
                'is_user': False
                })]

            record.text_question = ""

    @api.model
    def generate_ai_response(self, id):
        record = self.browse(id)
        record.action_generate_ai_response()

    @api.model
    def chat_with_ai(self, message):
        api_key = self.env['ir.config_parameter'].sudo().get_param('openai.api_key')
        if not api_key:
            return "API Key not set in system parameters."

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="o1-mini",
            messages=[{"role": "user", "content": message}],
        )

        return response.choices[0].message.content

    @api.model
    def get_default_model(self):
        return 'gpt-4o-realtime-preview-2024-10-01'
