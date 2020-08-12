import React from 'react';
import PropTypes from 'prop-types';

const MyIntegrator = function (props, context) {
    const { officeName } = props;
    return (
        <div className="app myintegrator">
            <span>Dette er {officeName}, et topp kontor</span>
        </div>
    );
};

MyIntegrator.propTypes = {
    officeName: PropTypes.string.isRequired,
};
export default MyIntegrator;
