# -*- coding: utf-8 -*-
{
    'name': 'Draggable M2M Attachment Preview',
    'version': '17.0',
    'category': 'Services/Tools',
    'summary': """This module adds a new widget, which enables the user to view attachments without downloading them.""",
    'description': """User can preview a document without downloading.""",
    'author': 'Bron',
    'license': 'LGPL-3',
    'depends': [],
    'assets': {
        'web.assets_backend': [
            'attachment_preview/static/src/js/lib/pdf.min.js',
            'attachment_preview/static/src/js/lib/pdf.worker.min.js',
            'attachment_preview/static/src/js/many2many_binary_field.js',
            'attachment_preview/static/src/scss/attachment_preview.scss',
            'attachment_preview/static/src/xml/many2many_binary_field.xml',
        ],
    },
    'images': [
        'static/description/banner.jpg',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}