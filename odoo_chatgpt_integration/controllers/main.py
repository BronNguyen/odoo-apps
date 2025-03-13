# -*- coding: utf-8 -*-
import json  # Import json module
import requests
from odoo import http
from odoo.http import request

class ChatBotController(http.Controller):

    @http.route('/chatbot/session', type='json', auth='public', csrf=False)
    def get_ephemeral_token(self, **kw):
        # Access env using request.env in controllers
        url = request.env['ir.config_parameter'].sudo().get_param('web_rtc_sessions_url')
        api_key = request.env['ir.config_parameter'].sudo().get_param('openai.api_key')
        ai_model = request.env['ai.chat'].get_default_model()

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

        body = {
            'model': ai_model,
            'voice': 'verse'
        }

        # Use json.dumps() to convert body to JSON format
        data = json.dumps(body)

        try:
            response = requests.post(url, headers=headers, data=data)
            response.raise_for_status()  # Raise an exception for HTTP errors
            return response.json()  # Return JSON data
        except requests.exceptions.RequestException as e:
            return {
                'error': 'Failed to retrieve token',
                'details': str(e)
            }

    @http.route('/chatbot/ws_information', type='json', auth='public', csrf=False)
    def get_ws_information(self, **kw):
        url = request.env['ir.config_parameter'].sudo().get_param('web_websocket_url')
        api_key = request.env['ir.config_parameter'].sudo().get_param('openai.api_key')
        openai_organization = request.env['ir.config_parameter'].sudo().get_param('openai_organization')
        openai_project = request.env['ir.config_parameter'].sudo().get_param('openai_project')
        beta_protocol = request.env['ir.config_parameter'].sudo().get_param('openai_beta_protocol')
        ai_model = request.env['ai.chat'].get_default_model()

        api_url = f'{url}?model={ai_model}'

        return {
            'api_url': api_url,
            'api_key': api_key,
            'openai_organization': openai_organization,
            'openai_project': openai_project,
            'beta_protocol': beta_protocol
        }

    @http.route('/chatbot/http_information', type='json', auth='public', csrf=False)
    def get_http_information(self, **kw):
        api_url = request.env['ir.config_parameter'].sudo().get_param('openai_completion_url')
        api_key = request.env['ir.config_parameter'].sudo().get_param('openai.api_key')
        openai_model = request.env['ir.config_parameter'].sudo().get_param('openai_model')

        return {
            'api_key': api_key,
            'openai_model': openai_model,
            'api_url': api_url,
        }
