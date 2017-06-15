from contentbase.upgrader import upgrade_step


# for use in computational_1_2 step
# converts value to to float or int based on presence of decimal
def cast_to_intfloat(value):
    if '.' in str(value) or 'e' in str(value):
        return float(value)
    else:
        return int(value)


@upgrade_step('computational', '1', '2')
def computational_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1295
    # list of predictors that may have malformed score data
    predictors = ['sift', 'polyphen2_hdiv', 'polyphen2_hvar', 'lrt',
                  'mutationtaster', 'mutationassessor', 'fathmm', 'provean',
                  'metasvm', 'metalr', 'fathmm_mkl', 'fitcons']
    if 'computationalData' in value:
        if 'other_predictors' in value['computationalData']:
            # other_predictors is present, so loop through predictors to check
            for predictor in predictors:
                if predictor in value['computationalData']['other_predictors']:
                    if 'score' in value['computationalData']['other_predictors'][predictor]:
                        if value['computationalData']['other_predictors'][predictor]['score'] is not None:
                            value['computationalData']['other_predictors'][predictor]['score'] = [cast_to_intfloat(x) for x in str(value['computationalData']['other_predictors'][predictor]['score']).split(', ')]


@upgrade_step('computational', '2', '3')
def computational_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/1328
    # No diseases are found to be associated with computational records
    # Update schema version only
    return
