'use strict';

import React, {PropTypes} from 'react';
import url from 'url';
import _ from 'underscore';
import moment from 'moment';

import * as globals from './globals';
import * as curator from './curator';
import * as methods from './methods';
import * as CuratorHistory from './curator_history';

import { RestMixin } from './rest';
import { Form, FormMixin, Input, InputMixin } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parsePubmed } from '../libs/parse-pubmed';

const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const DeleteButton = curator.DeleteButton;
const PmidDoiButtons = curator.PmidDoiButtons;

const queryKeyValue = globals.queryKeyValue;
const country_codes = globals.country_codes;
const external_url_map = globals.external_url_map;

class CaseControlCuration extends React.Component {
    render() {
        return (
            <div>Some text.</div>
        );
    }
}

globals.curator_page.register(CaseControlCuration, 'curator_page', 'case-control-curation');