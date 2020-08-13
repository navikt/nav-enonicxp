import React from 'react';
import PropTypes from 'prop-types';

const Notifications = function (props, context) {
    const { messages, containerClass } = props;
    const messageNodes = messages.map((message) => {
        const icon =
            message.class !== 'warning' ? (
                <div className="lenkepanel-ikon-col">
                    <img src={message.iconUrl} alt="" />
                </div>
            ) : (
                <div className="lenkepanel-ikon-col">
                    <div className="kampanje-varsel__pulse" />
                    <div className="kampanje-varsel__sirkel" />
                </div>
            );
        const description = message.description ? (
            <p className="typo-normal">{message.description}</p>
        ) : null;
        const updated = message.updated ? (
            <p className="typo-undertekst">{message.updated}</p>
        ) : null;

        const linkPanelClassName = `lenkepanel lenkepanel--border ${message.className}`;
        return (
            <a className={linkPanelClassName} data-ga="notifications" href={message.url}>
                {icon}
                <div className="lenkepanel-tekst-col">
                    <h2 className="typo-element lenkepanel__heading">{message.heading}</h2>
                    {description}
                    {updated}
                </div>
                <span className="lenkepanel__indikator" />
            </a>
        );
    });

    const containerClasses = `lenkepanel-container ${containerClass}`;
    return (
        <section className="container notifications">
            <div className={containerClasses}>
                <div>{messageNodes}</div>
            </div>
        </section>
    );
};

Notifications.propTypes = {
    messages: PropTypes.arrayOf(
        PropTypes.shape({
            heading: PropTypes.string,
            description: PropTypes.string,
            updated: PropTypes.string,
            url: PropTypes.string,
            iconUrl: PropTypes.string,
            class: PropTypes.string,
        })
    ),
    containerClass: PropTypes.string,
};

Notifications.defaultProps = {
    messages: [],
    containerClass: '',
};
export default Notifications;
