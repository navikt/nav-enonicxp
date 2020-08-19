import React from 'react';
import PropTypes from 'prop-types';
import LenkepanelBase from 'nav-frontend-lenkepanel';
import { Ingress, Undertekst, Systemtittel } from 'nav-frontend-typografi';

const DesignLenkepanel = (props, context) => {
    const { heading, description, updated, url, iconUrl, className } = props;
    const icon =
        className !== 'warning' ? (
            <div className="lenkepanel-ikon-col">
                <img src={iconUrl} alt="" />
            </div>
        ) : (
            <div className="lenkepanel-ikon-col">
                <div className="kampanje-varsel__pulse" />
                <div className="kampanje-varsel__sirkel" />
            </div>
        );
    const descriptionNode = description ? <Ingress>{description}</Ingress> : null;
    const updatedNode = updated ? <Undertekst>{updated}</Undertekst> : null;

    return (
        <LenkepanelBase href={url} border>
            {icon}
            <Systemtittel className="lenkepanel__heading">{heading}</Systemtittel>
            {descriptionNode}
            {updatedNode}
        </LenkepanelBase>
    );
};

DesignLenkepanel.propTypes = {
    heading: PropTypes.string,
    description: PropTypes.string,
    updated: PropTypes.string,
    url: PropTypes.string,
    iconUrl: PropTypes.string,
    className: PropTypes.string,
};

DesignLenkepanel.defaultProps = {
    heading: '',
    description: '',
    updated: '',
    url: '',
    iconUrl: '',
    className: '',
};

export default DesignLenkepanel;
