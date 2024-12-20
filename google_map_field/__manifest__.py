# -*- coding: utf-8 -*-
{
    'name': 'GOOGLE MAP FIELD',
    'category': 'Tools',
    'version' : '1.0',
    'author': 'Bron',
    'depends': ['web'],
    'description': """
    This module provides a field widget that attaches to the "address" field. 
    Instead of manually entering the address, users can select it from Google Maps. 
    Note that the Google Maps API must be installed in res_company.
    """,
    'data': [
        'security/ir.model.access.csv',
    ],
    'assets': {
        "web.assets_backend": [
            "google_map_field/static/src/xml/google_map_field.xml",
            "google_map_field/static/src/scss/google_map_field.scss",
            "google_map_field/static/src/js/google_map_field.js",
            "google_map_field/static/src/js/config.js"
        ],
    },
    'qweb': [
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
