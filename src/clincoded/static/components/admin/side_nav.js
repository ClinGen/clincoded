import React from 'react';

/**
 * Stateless functional component to render admin console side navigation
 */
const AdminPageSideNavigation = () => {
    return (
        <div className="side-navigation">
            <ul className="side-navigation-item-list">
                <li className="side-navigation-item"><i className="icon icon-clipboard"></i> Reports</li>
                <li className="side-navigation-item"><i className="icon icon-search"></i> Search</li>
            </ul>
        </div>
    )
}

export default AdminPageSideNavigation;