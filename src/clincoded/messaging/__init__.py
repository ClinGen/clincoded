from pyramid.view import view_config
from confluent_kafka import Producer
from copy import deepcopy
import os
import urllib.request
import requests
import json
import clincoded.messaging.templates.gci_to_dx, clincoded.messaging.templates.vci_to_dx

saved_affiliation = None

def includeme(config):
    config.add_route('publish', '/publish')
    config.add_route('generate-clinvar-data', '/generate-clinvar-data')
    config.scan(__name__)

# Retrieve data from search result(s) using a path (list of keys)
def get_data_by_path(data, path, return_no_data=None):
    if isinstance(data, dict) and isinstance(path, list) and len(path) > 0 and path[0] in data:
        for key in path:
            if key in data:
                data = data[key]
            else:
                return return_no_data

        return data
    else:
        return return_no_data

# Check if data (evidence, score, etc.) was created by the target affiliation (from the classification)
def check_data_ownership(data, affiliation):
    if 'affiliation' in data and isinstance(data['affiliation'], str):
        if isinstance(affiliation, str):
            if affiliation == data['affiliation']:
                return True

    return False

# Check if article should be added to evidence dictionary
def is_article_new(evidence, category, annotation):
    if 'article' in annotation:
        if 'pmid' in annotation['article']:
            if category not in evidence:
                evidence[category] = []
                return True
            else:
                for publication in evidence[category]:
                    if publication['pmid'] == annotation['article']['pmid']:
                        return False

                return True
        else:
            return False
    else:
        return False

# Check if scored individual evidence should be added to evidence dictionary
def check_individual_scoring(score, evidence, annotation):
    if 'scoreStatus' in score:
        if score['scoreStatus'] == 'Score':
            if 'caseInfoType' in score:
                if is_article_new(evidence, score['caseInfoType'], annotation):
                    return (True, score['caseInfoType'])

        elif score['scoreStatus'] == 'Contradicts':
            if is_article_new(evidence, 'contradicts', annotation):
                return (True, 'contradicts')

    return (False, )

# Check if scored segregation evidence should be added to evidence dictionary
def check_segregation_scoring(family, evidence, annotation):
    segregation = get_data_by_path(family, ['segregation'], {})

    if 'includeLodScoreInAggregateCalculation' in segregation and segregation['includeLodScoreInAggregateCalculation']:
        if 'publishedLodScore' in segregation or 'estimatedLodScore' in segregation:
            if 'sequencingMethod' in segregation:
                if segregation['sequencingMethod'] == 'Candidate gene sequencing':
                    if is_article_new(evidence, 'segregation-candidate-sequencing', annotation):
                        return (True, 'segregation-candidate-sequencing')
                elif segregation['sequencingMethod'] == 'Exome/genome or all genes sequenced in linkage region':
                    if is_article_new(evidence, 'segregation-exome-sequencing', annotation):
                        return (True, 'segregation-exome-sequencing')

    return (False, )

# Check if scored case control evidence should be added to evidence dictionary
def check_case_control_scoring(case_control, score, evidence, annotation):
    if 'studyType' in case_control:
        if case_control['studyType'] == 'Single variant analysis':
            if 'score' in score:
                if 'case-control-single-count' not in evidence:
                    evidence['case-control-single-count'] = 0
                evidence['case-control-single-count'] += 1

                if 'case-control-single-points' not in evidence:
                    evidence['case-control-single-points'] = 0
                evidence['case-control-single-points'] += score['score']

            if is_article_new(evidence, 'case-control-single', annotation):
                return (True, 'case-control-single')

        elif case_control['studyType'] == 'Aggregate variant analysis':
            if 'score' in score:
                if 'case-control-aggregate-count' not in evidence:
                    evidence['case-control-aggregate-count'] = 0
                evidence['case-control-aggregate-count'] += 1

                if 'case-control-aggregate-points' not in evidence:
                    evidence['case-control-aggregate-points'] = 0
                evidence['case-control-aggregate-points'] += score['score']

            if is_article_new(evidence, 'case-control-aggregate', annotation):
                return (True, 'case-control-aggregate')

    return (False, )

# Check if scored experimental evidence should be added to evidence dictionary
def check_experimental_scoring(experimental, score, evidence, annotation):
    experimental_evidence_types = {
        'Biochemical Function': 'exp-biochemical-function',
        'Protein Interactions': 'exp-protein-interactions',
        'Expression': 'exp-expression',
        'Functional Alteration': {
            'Patient cells': 'exp-functional-alteration-patient-cells',
            'Non-patient cells': 'exp-functional-alteration-non-patient-cells'
        },
        'Model Systems': {
            'Non-human model organism': 'exp-model-systems-non-human-model-organism',
            'Cell culture model': 'exp-model-systems-cell-culture-model'
        },
        'Rescue': {
            'Human': 'exp-rescue-human',
            'Non-human model organism': 'exp-rescue-non-human-model-organism',
            'Cell culture model': 'exp-rescue-cell-culture-model',
            'Patient cells': 'exp-rescue-patient-cells'
        }
    }
    evidence_category = None

    if 'scoreStatus' in score:
        if score['scoreStatus'] == 'Score':
            if 'evidenceType' in experimental:
                if experimental['evidenceType'] in experimental_evidence_types:
                    if experimental['evidenceType'] == 'Functional Alteration':
                        if 'functionalAlteration' in experimental:
                            if 'functionalAlterationType' in experimental['functionalAlteration']:
                                if experimental['functionalAlteration']['functionalAlterationType'] in experimental_evidence_types['Functional Alteration']:
                                    evidence_category = experimental_evidence_types['Functional Alteration'][experimental['functionalAlteration']['functionalAlterationType']]
                    elif experimental['evidenceType'] == 'Model Systems':
                        if 'modelSystems' in experimental:
                            if 'modelSystemsType' in experimental['modelSystems']:
                                if experimental['modelSystems']['modelSystemsType'] in experimental_evidence_types['Model Systems']:
                                    evidence_category = experimental_evidence_types['Model Systems'][experimental['modelSystems']['modelSystemsType']]

                                    if 'exp-model-systems-and-rescue-count' not in evidence:
                                        evidence['exp-model-systems-and-rescue-count'] = 0
                                    evidence['exp-model-systems-and-rescue-count'] += 1

                    elif experimental['evidenceType'] == 'Rescue':
                        if 'rescue' in experimental:
                            if 'rescueType' in experimental['rescue']:
                                if experimental['rescue']['rescueType'] in experimental_evidence_types['Rescue']:
                                    evidence_category = experimental_evidence_types['Rescue'][experimental['rescue']['rescueType']]

                                    if 'exp-model-systems-and-rescue-count' not in evidence:
                                        evidence['exp-model-systems-and-rescue-count'] = 0
                                    evidence['exp-model-systems-and-rescue-count'] += 1

                    else:
                        evidence_category = experimental_evidence_types[experimental['evidenceType']]

            if evidence_category is not None:
                if is_article_new(evidence, evidence_category, annotation):
                    return (True, evidence_category)

        elif score['scoreStatus'] == 'Contradicts':
            if is_article_new(evidence, 'contradicts', annotation):
                return (True, 'contradicts')

    return (False, )

# Rerieve article metadata that will be added to evidence dictionary
def save_article(annotation):
    publication = {}

    if 'article' in annotation:
        if 'title' in annotation['article']:
            publication['title'] = annotation['article']['title']

        if 'authors' in annotation['article'] and annotation['article']['authors']:
            publication['author'] = annotation['article']['authors'][0]

        if 'date' in annotation['article'] and isinstance(annotation['article']['date'], str):
            publication['pubdate'] = annotation['article']['date'].split(';', 1)[0]

        if 'journal' in annotation['article']:
            publication['source'] = annotation['article']['journal']

        if 'pmid' in annotation['article']:
            publication['pmid'] = annotation['article']['pmid']

    return publication

# Build evidence dictionary
def gather_evidence(data, user_affiliation):
    evidence_publications = {}

    if not user_affiliation:
        return None

    annotations = get_data_by_path(data, ['annotations'], [])

    for annotation in annotations:
        groups = get_data_by_path(annotation, ['groups'], [])

        for group in groups:
            families = get_data_by_path(group, ['familyIncluded'], [])

            for family in families:
                individuals = get_data_by_path(family, ['individualIncluded'], [])

                for individual in individuals:
                    scores = get_data_by_path(individual, ['scores'], [])

                    for score in scores:
                        if check_data_ownership(score, user_affiliation):
                            individual_score = check_individual_scoring(score, evidence_publications, annotation)

                            if individual_score[0]:
                                evidence_publications[individual_score[1]].append(save_article(annotation))

                            break

                if check_data_ownership(family, user_affiliation):
                    segregation_score = check_segregation_scoring(family, evidence_publications, annotation)

                    if segregation_score[0]:
                        evidence_publications[segregation_score[1]].append(save_article(annotation))

            individuals = get_data_by_path(group, ['individualIncluded'], [])

            for individual in individuals:
                scores = get_data_by_path(individual, ['scores'], [])

                for score in scores:
                    if check_data_ownership(score, user_affiliation):
                        individual_score = check_individual_scoring(score, evidence_publications, annotation)

                        if individual_score[0]:
                            evidence_publications[individual_score[1]].append(save_article(annotation))

                        break

        families = get_data_by_path(annotation, ['families'], [])

        for family in families:
            individuals = get_data_by_path(family, ['individualIncluded'], [])

            for individual in individuals:
                scores = get_data_by_path(individual, ['scores'], [])

                for score in scores:
                    if check_data_ownership(score, user_affiliation):
                        individual_score = check_individual_scoring(score, evidence_publications, annotation)

                        if individual_score[0]:
                            evidence_publications[individual_score[1]].append(save_article(annotation))

                        break

            if check_data_ownership(family, user_affiliation):
                segregation_score = check_segregation_scoring(family, evidence_publications, annotation)

                if segregation_score[0]:
                    evidence_publications[segregation_score[1]].append(save_article(annotation))

        individuals = get_data_by_path(annotation, ['individuals'], [])

        for individual in individuals:
            scores = get_data_by_path(individual, ['scores'], [])

            for score in scores:
                if check_data_ownership(score, user_affiliation):
                    individual_score = check_individual_scoring(score, evidence_publications, annotation)

                    if individual_score[0]:
                        evidence_publications[individual_score[1]].append(save_article(annotation))

                    break

        case_controls = get_data_by_path(annotation, ['caseControlStudies'], [])

        for case_control in case_controls:
            scores = get_data_by_path(case_control, ['scores'], [])

            for score in scores:
                if check_data_ownership(score, user_affiliation):
                    case_control_score = check_case_control_scoring(case_control, score, evidence_publications, annotation)

                    if case_control_score[0]:
                        evidence_publications[case_control_score[1]].append(save_article(annotation))

                    break

        experimentals = get_data_by_path(annotation, ['experimentalData'], [])

        for experimental in experimentals:
            scores = get_data_by_path(experimental, ['scores'], [])

            for score in scores:
                if check_data_ownership(score, user_affiliation):
                    experimental_score = check_experimental_scoring(experimental, score, evidence_publications, annotation)

                    if experimental_score[0]:
                        evidence_publications[experimental_score[1]].append(save_article(annotation))

                    break

    return evidence_publications

# Build evidence counts dictionary (trimmed from provisional classification points object)
def gather_evidence_counts(points, return_result=False):
    keys_to_delete = []

    for key, value in points.items():
        if isinstance(value, (int, float)):
            if 'evidenceCount' not in key or value <= 0:
                keys_to_delete.append(key)

        elif isinstance(value, dict):
            gather_evidence_counts(value)

            if not points[key]:
                keys_to_delete.append(key)

        else:
            keys_to_delete.append(key)

    # Remove keys with no values
    for key in keys_to_delete:
        del points[key]

    if return_result:
        return points

# Add a yes/no value and all contradictory evidence to the message template
def add_contradictory_evidence(data, evidence, template):
    contradicting_evidence = get_data_by_path(data, ['resource', 'contradictingEvidence'], {})

    if (('proband' in contradicting_evidence and contradicting_evidence['proband']) or
        ('experimental' in contradicting_evidence and contradicting_evidence['experimental']) or
        ('caseControl' in contradicting_evidence and contradicting_evidence['caseControl'])):
        template['Value'] = 'YES'

        if 'contradicts' in evidence:
            template['Evidence'] = {
                'Publications': evidence['contradicts']
            }
    else:
        template['Value'] = 'NO'

# Lookup affiliation data associated with a provided ID (using a JSON file maintained for the UI)
def lookup_affiliation_data(affiliation_id, affiliation_key, affiliation_subgroup=None):
    global saved_affiliation

    if affiliation_id and affiliation_key:
        if not saved_affiliation or 'affiliation_id' not in saved_affiliation or affiliation_id != saved_affiliation['affiliation_id']:
            try:
                affiliation_data = json.load(open('src/clincoded/static/components/affiliation/affiliations.json'))

                for affiliation in affiliation_data:
                    if affiliation_id == affiliation['affiliation_id']:
                        saved_affiliation = affiliation
                        break

            except Exception:
                pass
                return None

        try:
            if affiliation_subgroup:
                return saved_affiliation['subgroups'][affiliation_subgroup][affiliation_key]
            else:
                return saved_affiliation[affiliation_key]

        except Exception:
            pass

        return None
    else:
        return None

# Traverse message template, performing various data retrieval/update operations
def add_data_to_msg_template(data, evidence, evidence_counts, template):
    keep_falsy_data = False
    keys_to_delete = []

    for key, value in template.items():
        if isinstance(value, str):
            if value == '':
                keys_to_delete.append(key)

        elif isinstance(value, list):
            value_length = len(value)

            if value_length > 0:
                # Retrieve data using data path lists
                if value[0] == '$PATH_TO_DATA':
                    template[key] = get_data_by_path(data, value[1:])

                # Keep first, non-excluded data found (using data path lists)
                elif value[0] == '$USE_FIRST_DATA':
                    if value_length > 2:
                        for data_path in value[2:]:
                            temp_result = get_data_by_path(data, data_path)

                            if temp_result not in {value[1], None}:
                                break

                        if temp_result != value[1]:
                            template[key] = temp_result
                        else:
                            template[key] = ''
                    else:
                        template[key] = ''

                # Use one of two provided values, based on data (from a data path list)
                elif value[0] == '$CHECK_FOR_DATA':
                    if value_length == 4:
                        if get_data_by_path(data, value[1]):
                            template[key] = value[2]
                        else:
                            template[key] = value[3]
                    else:
                        template[key] = ''

                # Replace data (from a data path list) using the provided strings
                elif value[0] == '$REPLACE_DATA':
                    if value_length == 4:
                        temp_result = get_data_by_path(data, value[1])

                        if isinstance(temp_result, str):
                            template[key] = temp_result.replace(value[2], value[3])
                        else:
                            template[key] = ''
                    else:
                        template[key] = ''

                # Convert data (from a data path list) using the provided map
                elif value[0] == '$CONVERT_DATA':
                    if value_length == 3:
                        temp_result = get_data_by_path(data, value[1])
                        default_result_key = '$DEFAULT'

                        if temp_result in value[2]:
                            template[key] = value[2][temp_result]
                        elif default_result_key in value[2]:
                            template[key] = value[2][default_result_key]
                        else:
                            template[key] = ''
                    else:
                        template[key] = ''

                # Combine data (from dictionary of data path lists) with a separator
                elif value[0] == '$COMBINE_DATA':
                    if value_length == 3:
                        add_data_to_msg_template(data, evidence, evidence_counts, value[2])
                        template[key] = value[1].join(value[2].values())
                    else:
                        template[key] = ''

                # Lookup an affiliation name by ID (from a data path list)
                elif value[0] == '$LOOKUP_AFFILIATION_DATA':
                    if value_length == 4:
                        template[key] = lookup_affiliation_data(get_data_by_path(data, value[1]), value[3], value[2])
                    elif value_length == 3:
                        template[key] = lookup_affiliation_data(get_data_by_path(data, value[1]), value[2])
                    else:
                        template[key] = ''

                # Add evidence count (using a data path list)
                elif value[0] == '$EVIDENCE_COUNT':
                    if value_length == 2:
                        template[key] = get_data_by_path(evidence_counts, value[1])
                    else:
                        template[key] = ''

                # Add score (using a data path list)
                elif value[0] == '$SCORE_DATA':
                    if value_length >= 3:
                        template[key] = get_data_by_path(data, value[1])

                        # If score is zero, check if it should be included in message (e.g. if evidence count is non-zero)
                        if template[key] == 0:
                            if value[2] == True:
                                keep_falsy_data = True
                            else:
                                for data_path in value[2:]:
                                    if get_data_by_path(evidence_counts, data_path):
                                        keep_falsy_data = True
                                        break
                    else:
                        template[key] = ''

                # Add evidence (articles, counts or points) based on information type
                elif value[0] == '$EVIDENCE_DATA':
                    if value_length in (2, 3) and value[1] in evidence:
                        template[key] = evidence[value[1]]

                        if not template[key] and value_length == 3 and value[2] == True:
                            keep_falsy_data = True

                    else:
                        template[key] = ''

                else:
                    for element in value:
                        if isinstance(element, dict):
                            add_data_to_msg_template(data, evidence, evidence_counts, element)

            # Save keys with falsy values for later deletion
            if not template[key]:
                if keep_falsy_data:
                    keep_falsy_data = False
                else:
                    keys_to_delete.append(key)

        elif isinstance(value, dict):
            add_data_to_msg_template(data, evidence, evidence_counts, value)

            # Special handling to incorporate contradictory evidence (articles)
            if key == 'ValidContradictoryEvidence':
                add_contradictory_evidence(data, evidence, value)

            if not template[key]:
                keys_to_delete.append(key)

    # Remove keys with no values
    for key in keys_to_delete:
        del template[key]

# Remove unnecessary data from interpretation (before sending it to transformation service)
def remove_data_from_msg_template(delete_list, template):
    for data_path in delete_list:
        try:
            data_to_delete = template
            data_to_delete_check = True

            # Subsequent for loop expects a path (list of keys), not a string
            if isinstance(data_path, str):
                data_path = delete_list

            # Check if data exists at specified path (up to second-to-last element)
            for key in data_path[:-1]:
                if key in data_to_delete:
                    data_to_delete = data_to_delete[key]
                else:
                    data_to_delete_check = False
                    break

            if data_to_delete_check:
                # If last path element is a list, expect remaining data to be structured as a list of dictionaries
                if isinstance(data_path[-1], list):
                    for element in data_to_delete:
                        remove_data_from_msg_template(data_path[-1], element)

                elif data_path[-1] in data_to_delete:
                    del data_to_delete[data_path[-1]]

        # Continue processing deletion list if/when a single path has problems
        except (IndexError, KeyError):
            pass

# Transform interpretation to SEPIO format (via transformation service)
def transform_interpretation(source_data, request_host):
    # Prepare interpretation to be sent to transformation service
    try:
        source_data_str = json.dumps(source_data, separators=(',', ':'))

    except Exception:
        raise Exception('Failed to build complete message')

    # Send interpretation to transformation service
    try:
        service_url = 'http://localhost:3000'

        if request_host != 'localhost:6543':
            service_url = 'https://g3xjft14o7.execute-api.us-west-2.amazonaws.com/default/VCI-to-CG_SEPIO'

        transform_result = requests.post('{}/vci2cgsepio'.format(service_url), headers={'Content-Type': 'application/json'}, data=source_data_str, timeout=10)

    except Exception:
        raise Exception('Data transformation service unavailable')

    if transform_result.status_code != requests.codes.ok:
        raise Exception('Data transformation failed')

    # Return result of transformation service as JSON-encoded content
    try:
        return transform_result.json()

    except Exception:
        raise Exception('Result of data transformation not in expected format')

# Generate ClinVar submission data for interpretation (via ClinVar submitter service)
def request_clinvar_data(source_data):
    # Prepare interpretation to be sent to ClinVar submitter service
    try:
        source_data_str = json.dumps(source_data, separators=(',', ':'))

    except Exception:
        raise Exception('Preparation of source data for generation service failed')

    # Send interpretation to ClinVar submitter service
    try:
        service_url = 'http://clinvar-submitter.clinicalgenome.org/api/v1/submission'
        clinvar_result = requests.post('{}'.format(service_url), headers={'Content-Type': 'application/json'}, data=source_data_str, timeout=10)

    except Exception:
        raise Exception('Data generation service unavailable')

    if clinvar_result.status_code != requests.codes.ok:
        raise Exception('Data generation failed')

    # Return result of ClinVar submitter service as JSON-encoded content
    try:
        return clinvar_result.json()

    except Exception:
        raise Exception('Result of data generation not in expected format')

# Publish the message
@view_config(route_name='publish', request_method='GET')
def publish(request):
    elasticsearch_server = 'http://localhost:9200/clincoded'
    return_object = {'status': 'Fail',
                 'message': 'Unable to deliver message'}

    # Check that required parameters have been provided
    if not('type' in request.params and 'uuid' in request.params):
        return_object['message'] = 'Required parameters missing in request'
        return return_object

    # Attempt to retrieve data (from Elasticsearch)
    try:
        searchRes = requests.get('{}/{}/{}'.format(elasticsearch_server, request.params['type'], request.params['uuid']), timeout=10)

        if searchRes.status_code != requests.codes.ok:
            return_object['message'] = 'Data search failed'
            return return_object

    except Exception as e:
        return_object['message'] = 'Data search could not be completed'
        return return_object

    # Store JSON-encoded content of search result(s)
    try:
        resultJSON = searchRes.json()

    except Exception as e:
        return_object['message'] = 'Retrieved data not in expected format'
        return return_object

    # Check that search found data
    if 'found' not in resultJSON or not(resultJSON['found']):
        return_object['message'] = 'Requested data could not be found'
        return return_object

    # Check that data has expected elements
    try:
        data_type_to_publish = resultJSON['_source']['embedded']['resourceType']

        if data_type_to_publish == 'classification':
            evidence_to_publish = resultJSON['_source']['embedded']['resourceParent']['gdm']
            publishing_affiliation = resultJSON['_source']['embedded']['resource']['affiliation']
            evidence_counts_to_publish = resultJSON['_source']['embedded']['resource']['classificationPoints']

        elif data_type_to_publish == 'interpretation':
            evidence_to_publish = resultJSON['_source']['embedded']['resourceParent']['interpretation']

        else:
            raise Exception

    except Exception as e:
        return_object['message'] = 'Retrieved data missing expected elements'
        return return_object

    # Check that message should be sent? (approved status? permission to publish?)

    # Construct message
    try:
        if data_type_to_publish == 'interpretation':
            message_template = deepcopy(clincoded.messaging.templates.vci_to_dx.message_template)
            data_to_remove = clincoded.messaging.templates.vci_to_dx.data_to_remove
            add_data_to_msg_template(resultJSON['_source']['embedded'], None, None, message_template)

        else:
            message_template = deepcopy(clincoded.messaging.templates.gci_to_dx.message_template)
            classification_points = deepcopy(evidence_counts_to_publish)
            add_data_to_msg_template(resultJSON['_source']['embedded'], gather_evidence(evidence_to_publish, publishing_affiliation),
                gather_evidence_counts(classification_points, True), message_template)
            message = json.dumps(message_template, separators=(',', ':'))

    except Exception as e:
        return_object['message'] = 'Failed to build complete message'
        return return_object

    # Transform message (if necessary, via independent service)
    try:
        if data_type_to_publish == 'interpretation':
            remove_data_from_msg_template(data_to_remove, message_template['interpretation'])
            message_template['interpretation'] = transform_interpretation(message_template['interpretation'], request.host)
            message = json.dumps(message_template, separators=(',', ':'))

    except Exception as e:
        if e.args:
            return_object['message'] = e.args
        else:
            return_object['message'] = 'Failed to build complete message'
        return return_object

    # Configure message delivery parameters
    kafka_cert_pw = ''

    if 'KAFKA_CERT_PW' in os.environ:
        kafka_cert_pw = os.environ['KAFKA_CERT_PW']

    kafka_conf = {'bootstrap.servers': 'localhost:9093',
            'log_level': 0,
            'security.protocol': 'ssl',
            'ssl.key.location': 'etc/certs/client.key',
            'ssl.key.password': kafka_cert_pw,
            'ssl.certificate.location': 'etc/certs/client.crt',
            'ssl.ca.location': 'etc/certs/server.crt'}
    kafka_topic = 'test'
    kafka_timeout = 10

    if request.host != 'localhost:6543':
        kafka_conf = {'bootstrap.servers': 'exchange.clinicalgenome.org:9093',
            'log_level': 0,
            'security.protocol': 'ssl',
            'ssl.key.location': 'etc/certs/dataexchange/client.key',
            'ssl.key.password': kafka_cert_pw,
            'ssl.certificate.location': 'etc/certs/dataexchange/client.crt',
            'ssl.ca.location': 'etc/certs/dataexchange/server.crt'}

        if data_type_to_publish == 'interpretation':
            kafka_topic = 'variant_interpretation'
        else:
            kafka_topic = 'gene_validity'

        if request.host != 'curation.clinicalgenome.org':
            kafka_topic += '_dev'

    # Send message
    p = Producer(**kafka_conf)

    def delivery_callback(err, msg):
        nonlocal return_object
        if err:
            return_object['message'] = err

        else:
            return_object = {'status': 'Success',
                         'message': message,
                         'partition': msg.partition(),
                         'offset': msg.offset()}

    try:
        p.produce(kafka_topic, message, callback=delivery_callback)
        p.flush(kafka_timeout)
        return return_object

    except Exception as e:
        return_object['message'] = 'Message delivery failed'
        return return_object

# Generate data for a ClinVar submission file
@view_config(route_name='generate-clinvar-data', request_method='GET')
def generate_clinvar_data(request):
    elasticsearch_server = 'http://localhost:9200/clincoded'
    return_object = {'status': 'Fail',
        'message': 'Unable to generate data'}

    # Check that required parameters have been provided
    if not('type' in request.params and 'uuid' in request.params):
        return_object['message'] = 'Required parameters missing in request'
        return return_object

    # Attempt to retrieve data (from Elasticsearch)
    try:
        searchRes = requests.get('{}/{}/{}'.format(elasticsearch_server, request.params['type'], request.params['uuid']), timeout=10)

        if searchRes.status_code != requests.codes.ok:
            return_object['message'] = 'Data search failed'
            return return_object

    except Exception as e:
        return_object['message'] = 'Data search could not be completed'
        return return_object

    # Store JSON-encoded content of search result(s)
    try:
        resultJSON = searchRes.json()

    except Exception as e:
        return_object['message'] = 'Retrieved data not in expected format'
        return return_object

    # Check that search found data
    if 'found' not in resultJSON or not(resultJSON['found']):
        return_object['message'] = 'Requested data could not be found'
        return return_object

    # Check that data has expected elements
    try:
        if resultJSON['_source']['embedded']['resourceType'] != 'interpretation':
            raise Exception

    except Exception as e:
        return_object['message'] = 'Retrieved data missing expected elements'
        return return_object

    # Check that data can be submitted to ClinVar? (approved status? permission to generate?)

    # Collect data
    try:
        data_set_template = deepcopy(clincoded.messaging.templates.vci_to_dx.message_template)
        data_to_remove = clincoded.messaging.templates.vci_to_dx.data_to_remove
        add_data_to_msg_template(resultJSON['_source']['embedded'], None, None, data_set_template)

    except Exception as e:
        return_object['message'] = 'Failed to build complete data set'
        return return_object

    # Transform data (for ClinVar submission)
    try:
        remove_data_from_msg_template(data_to_remove, data_set_template['interpretation'])
        data_set_template['interpretation'] = transform_interpretation(data_set_template['interpretation'], request.host)
        data_set = request_clinvar_data(data_set_template['interpretation'])
        return_object = {'status': 'Success',
            'message': data_set}

    except Exception as e:
        if e.args:
            return_object['message'] = e.args
        else:
            return_object['message'] = 'Failed to build complete data set'

    return return_object
