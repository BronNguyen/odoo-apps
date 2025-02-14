# -*- coding: utf-8 -*-
{
    'name': 'ChatGPT Integration',
    'version': '17.0',
    'summary': 'Integrate ChatGPT with Odoo',
    'description': 'Module to integrate ChatGPT with Odoo for AI-powered chat functionality',
    'author': 'Bron',
    'category': 'Tools',
    'depends': ['web', 'tools'],  # Ensure 'web' is included as it is required for JS assets
    'data': [
        'security/ir.model.access.csv',
        'views/ai_chat_view.xml',
        'views/menu.xml',
        'data/data.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'chatgpt_integration/static/src/scss/chat_ai.scss',
            'chatgpt_integration/static/src/xml/chat_ai_renderer.xml',
            'chatgpt_integration/static/src/js/chat_ai.js',
        ],
    },
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
    'external_dependencies': {
        'python': ['openai'],  # This will force Odoo to install 'openai' if missing
    },
}