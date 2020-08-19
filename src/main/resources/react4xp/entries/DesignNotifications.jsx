import React from 'react';
import PropTypes from 'prop-types';
import DesignLenkepanel from '../shared/DesignLenkepanel';

const DesignNotifications = function (props, context) {
    const { messages, containerClass } = props;
    const messageNodes = messages.map((message) => {
        return <DesignLenkepanel {...message} />;
    });

    const containerClasses = `lenkepanel-container ${containerClass}`;
    return (
        <section className="container notifications app">
            <div className={containerClasses}>
                <div>{messageNodes}</div>
            </div>
        </section>
    );
};

DesignNotifications.propTypes = {
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            heading: PropTypes.string,
            description: PropTypes.string,
            updated: PropTypes.string,
            url: PropTypes.string,
            iconUrl: PropTypes.string,
            className: PropTypes.string,
        })
    ),
    containerClass: PropTypes.string,
};

DesignNotifications.defaultProps = {
    messages: [],
    containerClass: '',
};
export default DesignNotifications;
