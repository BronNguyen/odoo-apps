# -*- coding: utf-8 -*-
{
    'name': "Password Show/Hide Confirm",
    'summary': """
    Adds show/hide functionality to password fields with confirmation
    """,
    'description': """
    Long description of module's purpose
    """,
    'author': "Bron",
    'category': 'Tools',
    'version': '1.0',
    'depends': ['base'],
    'assets': {
        'web.assets_backend': [
            'password_show_hide_confirm/static/src/js/password_show_hide.js',
            'password_show_hide_confirm/static/src/xml/password_show_hide.xml',
            'password_show_hide_confirm/static/src/scss/styles.scss',
        ],
    },
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}