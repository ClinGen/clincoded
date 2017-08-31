'use strict';
import React, { Component } from 'react';
import { panel_views } from './globals';

export default class TestingRenderErrorPanel extends Component {
    render() {
        console.log('log');
        console.warn('warn');
        this.method_does_not_exist();
    }
}

panel_views.register(TestingRenderErrorPanel, 'testing_render_error');
