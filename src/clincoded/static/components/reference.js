'use strict';
import React, { Component } from 'react';

export default class PubReferenceList extends Component {
    render() {
        var props = this.props;
        return (
            <ul className={props.className}>
                {props.values.map(function (value, index) {
                    return value.identifiers.map(function (identifier, index) {
                        return (<li key={index}>
                            <a href={value['@id']}>{identifier}</a>
                        </li>);
                    })
                })}
            </ul>
        );
    }
}