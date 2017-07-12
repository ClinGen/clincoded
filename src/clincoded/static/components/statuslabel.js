'use strict';
import React, { Component } from 'react';
import { statusClass } from './globals';

export default class StatusLabel extends Component {
    render() {
        var status = this.props.status;
        var title = this.props.title;
        if (typeof status === 'string') {
            // Display simple string and optional title in badge
            return (
                <ul className="status-list">
                    <li className={statusClass(status, 'label')}>
                        {title ? <span className="status-list-title">{title + ': '}</span> : null}
                        {status}
                    </li>
                </ul>
            );
        } else if (typeof status === 'object') {
            // Display a list of badges from array of objects with status and optional title
            return (
                <ul className="status-list">
                    {status.map(function (status) {
                        return(
                            <li key={status.title} className={statusClass(status.status, 'label')}>
                                {status.title ? <span className="status-list-title">{status.title + ': '}</span> : null}
                                {status.status}
                            </li>
                        );
                    })}
                </ul>
            );
        } else {
            return null;
        }
    }
}
