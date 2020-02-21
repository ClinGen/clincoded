from contentbase.upgrader import upgrade_step

@upgrade_step('snapshot', '1', '2')
def snapshot_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/2132
    # Remove existing provisional/snapshot nested data

    try:
        if (value['resourceType'] == 'classification'):
            curation_object_name = 'gdm'
            provisional_array_name = 'provisionalClassifications'
            snapshot_array_name = 'associatedClassificationSnapshots'
        elif (value['resourceType'] == 'interpretation'):
            curation_object_name = 'interpretation'
            provisional_array_name = 'provisional_variant'
            snapshot_array_name = 'associatedInterpretationSnapshots'
        else:
            raise KeyError

        del value['resource'][snapshot_array_name]

        try:
            for provisional in value['resourceParent'][curation_object_name][provisional_array_name]:
                try:
                    for snapshot in provisional[snapshot_array_name]:
                        try:
                            del snapshot['resource'][snapshot_array_name]

                        except KeyError:
                            pass

                except KeyError:
                    pass

        except KeyError:
            pass

    except KeyError:
        pass

    return
