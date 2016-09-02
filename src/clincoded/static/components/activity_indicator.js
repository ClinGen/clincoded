// # Activity Indicator Helper Method
// # Parameters: message string while loading data
// # Usage: showActivityIndicator('Loading... ')
// # Dependency: None

'use strict';
import React from 'react';

export function showActivityIndicator(message) {
    return (
		<div className="activity-indicator overlay-wrapper">
			<div className="overlay-content">
				{message}
				<i className="icon icon-spin icon-circle-o-notch"></i>
			</div>
		</div>
    );
}
