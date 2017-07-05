'use strict';
import React, { Component } from 'react';
import { content_views } from './globals';


export default class Page extends Component {
    render() {
        var context = this.props.context;
        return (
            <div>
                <header className="row">
                    <div className="col-sm-12">
                        <h1 className="page-title">{context.title}</h1>
                    </div>
                </header>
            </div>
        );
    }
}

content_views.register(Page, 'page');
