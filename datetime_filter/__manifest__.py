# -*- coding: utf-8 -*-
{
    'name': 'DatetimeFilter Panel',
    'category': 'Tools',
    'version': '1.0',
    'author': 'Bron',
    'description': """
        The DatetimeFilter Panel tool is a module designed for a control panel interface.
        It provides functionality to filter data based on datetime criteria.
        The module includes various assets such as xml/JavaScript, XML, and SCSS files that define
        the behavior and appearance of the datetime filter items and control panel.
        The tool depends on the web module and is installable, but it is not an application by itself and does not auto-install.

        [Optional]: in context action, you can use the following code to add the datetime filter settings:
        <field name="context">{default_dt_field: 'sign_date', search_by_field_date: ['sign_date', 'start_date', 'end_date']}</field>
        default_dt_field: the default datetime field to filter by
        search_by_field_date: list of datetime fields to filter (if not specified, all datetime fields will be available)
    """,
    'depends': [],
    'assets': {
        'web.assets_backend': [
            'datetime_filter/static/src/scss/datetime_filter_item.scss',

            'datetime_filter/static/src/xml/datetime_controlpanel.xml',
            'datetime_filter/static/src/xml/datetime_filter_item.xml',

            'datetime_filter/static/src/js/datetime_filter_item.js',
            'datetime_filter/static/src/js/datetime_controlpanel.js',
            'datetime_filter/static/src/js/search_model.js',
            'datetime_filter/static/src/js/utils.js',
        ],
    },
    'images': [
        'static/description/datetime_panel.jpg',
    ],
    'data': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
