'use strict';
import React, { Component } from 'react';

export function ContextualHelp(props) {
    return (
        <span className="text-info contextual-help" data-toggle="tooltip" data-placement="top" data-tooltip={props.content}>
            <i className="icon icon-info-circle"></i>
        </span>
    );
}