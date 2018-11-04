import React from 'react';

/**
 * Stateless functional component to render admin console header
 */
const AdminPageHeader = (props) => {
    return (
        <div className="admin-page-header clearfix navbar-fixed-top">
            <h3 className="pull-left">{props.title}</h3>
            <span className="pull-right">
                <a href="/dashboard/"><i className="icon icon-home"></i></a>
                <span><i className="icon icon-user"></i> {props.user_name}</span>
            </span>
        </div>
    )
}

export default AdminPageHeader;