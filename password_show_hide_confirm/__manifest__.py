# -*- coding: utf-8 -*-
{
    'name': "Password Show/Hide Confirm",
    'summary': """
    Adds functionality to show or hide password fields with confirmation
    """,
    'description': """
    This module enhances password fields by adding a show/hide toggle feature.
    It allows users to view or hide their password input, improving usability
    and reducing input errors. The module also includes a confirmation mechanism
    to ensure the password is entered correctly.
    """,
    'author': "Bron",
    'category': 'Tools',
    'version': '1.0',
    'depends': ['base'],
    'assets': {
        'web.assets_backend': [
            'password_show_hide_confirm/static/src/js/record.js',
            'password_show_hide_confirm/static/src/js/password_show_hide.js',
            'password_show_hide_confirm/static/src/xml/password_show_hide.xml',
            'password_show_hide_confirm/static/src/scss/styles.scss',
        ],
    },
    'images': [
        'static/description/banner.png',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}