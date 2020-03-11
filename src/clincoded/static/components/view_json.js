'use strict';
import React from 'react';

const divStyle = {
  WebkitUserSelect: 'all',
  MozUserSelect: 'all',
  userSelect: 'all',
  overflowY: 'scroll', 
  maxHeight: '500px',
}

const ViewJson = props => {
  return (
    <div style={divStyle}>
      <pre>
        <code>{props.data}</code>
      </pre>
    </div>
  )
}

export default ViewJson;