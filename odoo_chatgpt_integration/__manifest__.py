# -*- coding: utf-8 -*-
{
    'name': 'ChatGPT Integration',
    'version': '17.0',
    'summary': 'Integrate ChatGPT with Odoo',
    'description': '''
    This module integrates ChatGPT with Odoo. To use this integration, you need to set up the following parameters in the Odoo system parameters (ir.config_parameter):

    1. `openai.api_key`: Your ChatGPT API key.
    2. `chatgpt.organization_id`: Your ChatGPT organization ID.
    3. `chatgpt.project_id`: Your ChatGPT project ID.

    These parameters are required for the module to function correctly.
    ''',
    'author': 'Bron',
    'category': 'Tools',
    'depends': ['web'],
    'data': [
        'security/ir.model.access.csv',
        'views/ai_chat_view.xml',
        'views/menu.xml',
        'data/data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'odoo_chatgpt_integration/static/src/scss/chat_ai.scss',
            'odoo_chatgpt_integration/static/src/xml/chat_ai_renderer.xml',
            'odoo_chatgpt_integration/static/src/js/chat_ai.js',
        ],
    },
    'images': [
        'static/description/banner.png',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
    'external_dependencies': {
        'python': ['openai'],  # This will force Odoo to install 'openai' if missing
    },
}