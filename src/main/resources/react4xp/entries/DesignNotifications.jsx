import React from 'react';
import PropTypes from 'prop-types';
import LenkepanelBase from 'nav-frontend-lenkepanel';
import { Ingress, Undertekst, Systemtittel } from 'nav-frontend-typografi';

const DesignNotifications = function (props, context) {
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
        const description = message.description ? <Ingress>{message.description}</Ingress> : null;
        const updated = message.updated ? <Undertekst>{message.updated}</Undertekst> : null;

        return (
            <LenkepanelBase href={message.url} border>
                {icon}
                <Systemtittel className="lenkepanel__heading">{message.heading}</Systemtittel>
                {description}
                {updated}
            </LenkepanelBase>
        );
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
            class: PropTypes.string,
        })
    ),
    containerClass: PropTypes.string,
};

DesignNotifications.defaultProps = {
    messages: [],
    containerClass: '',
};
export default DesignNotifications;
