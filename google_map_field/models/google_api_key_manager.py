import os
from odoo import models, fields, api
from odoo.tools import config


class GoogleAPIKeyManager(models.Model):
    _name = 'google.api.key.manager'
    _description = 'Manage Google API Key Retrieval'

    google_api_key = fields.Char(string="Google API Key", readonly=True)

    def _get_api_key_from_system_parameters(self):
        """Retrieve API key from system parameters (low security)."""
        return self.env['ir.config_parameter'].sudo().get_param('google_api_key')

    def _get_api_key_from_config_file(self):
        """Retrieve API key from the configuration file (medium security)."""
        return config.get('google_api_key')

    def _get_api_key_from_env_variables(self):
        """Retrieve API key from environment variables (high security)."""
        return os.getenv('GOOGLE_API_KEY')

    @api.model
    def get_google_api_key(self):
        """Retrieve Google API key based on security levels from low to high."""
        api_key = None

        # Try retrieving from the most secure method first
        methods = [
            ('High Security (Environment Variable)', self._get_api_key_from_env_variables),
            ('Medium Security (Config File)', self._get_api_key_from_config_file),
            ('Low Security (System Parameters)', self._get_api_key_from_system_parameters),
        ]

        for level, method in methods:
            api_key = method()
            if api_key:  # Stop at the first successful retrieval
                self.env.cr.commit()  # To ensure logging isn't lost during DB rollback
                self.env['ir.logging'].create({
                    'name': 'Google API Key Retrieved',
                    'type': 'server',
                    'level': 'info',
                    'dbname': self.env.cr.dbname,
                    'message': f"API Key retrieved using {level}.",
                })
                break

        return api_key
