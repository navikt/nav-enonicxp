import React from 'react';
import { Sidetittel, Normaltekst } from 'nav-frontend-typografi';
import '../shared/nav-styles.less';
import { Alertstripe } from 'nav-frontend-alertstriper';
import Stegindikator from 'nav-frontend-stegindikator';

const Designer = function (props, context) {
    return (
        <div className="app designer">
            <Sidetittel>Dette er min sidetittel</Sidetittel>
            <Stegindikator
                steg={[
                    { label: 'Dette steget først' },
                    { label: 'Og så dette steget', aktiv: true },
                    { label: 'Deretter må du gjøre dette' },
                ]}
                onChange={() => {}}
                visLabel
                autoResponsiv
            />
            <Alertstripe type="suksess">Søknaden ble sendt!</Alertstripe>
            <Normaltekst>Dette er en normal tekst</Normaltekst>
        </div>
    );
};
export default Designer;
