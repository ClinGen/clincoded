from contentbase.upgrader import upgrade_step


@upgrade_step('group', '1', '2')
def group_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/453
    value['status'] = 'in progress'

@upgrade_step('group', '2', '3')
def group_2_3(value, system):
    # https://github.com/ClinGen/clincoded/issues/401
    if 'method' in value:
        if 'genotypingMethods' in value['method']:
            value['method']['genotypingMethods'] = [e.replace('Sanger', 'Sanger sequencing') for e in value['method']['genotypingMethods']]
            value['method']['genotypingMethods'] = [e.replace('HRM', 'High resolution melting') for e in value['method']['genotypingMethods']]


@upgrade_step('group', '3', '4')
def group_3_4(value, system):
    if 'commonDiagnosis' in value and value['commonDiagnosis'] != []:
        value['commonDiagnosis'] = [e.replace('78867c7a-16a6-11e5-8007-60f81dc5b05a', 'ba0159b3-a60d-4da2-a146-4deeff9bcd50') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('c327a221-c3a3-4eac-9d4f-7c266b65aeca', '27dd31ee-410b-4bd3-bebf-f2e25263e694') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('a32234b2-727d-4aca-b284-b5e05ef72959', '298c8c10-14e8-406e-a7c0-3533e386c243') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('82c995b8-bf80-4c54-a0d7-08be5d0c427b', 'ff845d7d-6fe5-4477-be24-ecf61419f2c2') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('0585b7da-0b55-487f-9b61-6cc4f14bb36d', '128af3ec-4a18-4370-9ea1-fad9d7a441a5') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('6ad8f0b7-8a6d-4e0f-aed5-479d90a37b92', 'ffd74845-9b32-4395-a121-fa5cf6969e5e') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('c0f96306-2873-41ff-a779-01795abbca2a', 'f0022201-0d9b-421c-ba59-e8735bef4641') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('b6ce0f2b-8962-4065-ad63-d28d3f437c8e', '54251120-c51f-4d88-9bbe-56923876232e') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('0c9b3d94-b574-4c11-8a17-7e9af7faf16e', '30e14e67-3408-4ec9-84f2-54ad6a8c9b5b') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('e7486d34-021a-491e-984e-3302c5d4e688', '8d25c62d-6363-4e61-91f0-7eb94be23e08') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('26e6f6d7-4ec7-4698-b03e-9f980f1f2c8b', 'a7d6f33b-e530-4803-a86f-39212f296e19') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('510db9fe-99e1-478a-bfb6-fb44af8a5794', 'cd1c30fe-1089-4821-9fb1-1b630e828d99') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('b1e17565-bfad-4843-8636-d41060b5159c', 'd4ea2cd7-736b-4af8-9d64-4391b19ebd30') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('e337a837-bc93-4ef4-8482-e0bd150ea345', 'c2d92d58-77e6-4843-9918-ff57dcfe3526') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('c6dc3bde-01d1-437a-a5eb-5348ef05c475', '67d0ddc5-b004-470b-9f70-d39c71577aae') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('2caea86b-a794-4cd5-97ec-943e98f3c771', '7e344c37-e662-4265-87dc-8335c35b26fb') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('01f75512-f4e7-43bf-86fa-bbb1115e31b2', 'ff8b42f1-6688-4c5e-a262-a01b302a6496') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('1c4d6209-996c-468f-8f0d-f525d0046571', 'e8f29945-4255-464e-bb45-c3bc654b8bb1') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('636acccf-ac12-4549-baaf-d78636e3c486', '52bb35c9-8c98-40e8-924a-b435719828d6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('441c9708-c9bc-41a0-8d19-7f1778f997be', 'd77a3cfd-aad5-4d37-9448-0bc848930620') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('ba967f3d-2659-4f45-9857-cc65e6e9afa5', '4ad3784b-590a-4a50-8239-20fdae96cfa6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('617a2e8b-ec57-45e6-a425-ed1e2cfde297', '4a91a5e8-664e-4608-a136-6e1d870beb5b') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('b04e7069-4a84-4909-9be1-22cd824a6865', '28c266c3-c060-4a54-b42d-71c3e684541e') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('183252a9-9df5-4dfb-ba0d-8cbe229b8c04', '05b13ca9-9d70-4e1c-ab12-8a1a83498f33') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('45e77e45-74ee-4aaf-a35f-f642598f99b0', '3f4e36bc-b702-4bfa-9bf7-ba0b79b8eff3') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('5154d59e-7446-4447-a2ce-13386cfb5a11', '999d2023-89d8-476c-a092-e63a1d1881c7') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('788c3bb0-16a6-11e5-8618-60f81dc5b05a', '044aa5ca-5f9f-4e78-8c1a-89a1d221ed0c') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('54f5cef6-155a-4b30-b0a7-370247dcaa78', '14f9a138-003e-4e6b-a99c-a31361095fb6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('921a2682-0896-486a-9b24-50c868e23421', '9152c18a-fa5f-47a1-931f-a581d5aa3deb') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('b1db48c9-87d5-4c17-b980-96304bbb060f', '86b1beae-97c3-4f14-9063-88116de15547') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('8bec6733-eecb-408c-9dbe-4ecd53661460', '9f2ac0c7-a431-4ae0-8c83-087628f5f739') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('e80f4442-e8dc-4be5-87c7-6d2a6259486a', 'e579aa67-c861-43ec-b0ee-94f6fa2ab756') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('61b526cf-4139-48dd-98a1-c7ac00d547cc', 'e6aa6306-43e3-443d-a7cc-c48fbdc15d11') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('74df017b-38a3-4c20-993b-c47520c53ec4', 'cb1fce04-3a02-4e37-bf53-a9573ab8a5a6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('4d433808-e006-45da-b1eb-5b138dc0ca66', 'c716b4dc-a50b-48f3-b81d-08e7130c2202') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('22a264ac-d8ce-4a69-8052-0f699ea929ad', '5bc67f05-3b9b-4ee9-9086-bc22b7f22671') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('675abbaf-c8fb-45f0-8058-97234482740a', '3bd5f327-477d-4662-9b49-74ded72da35f') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('29baf6a5-a09f-4df3-a661-571837ca2d7c', 'c8688f53-2fe6-4c6a-b861-8cc18b32e7d5') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('fa5b0fa7-f012-4bb3-aae8-f35159d3d821', '673ffe97-ef00-4bd5-9857-f67b5509ba8e') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('772b1b43-c3cb-4b7e-a1a5-83ee77b5eb25', '6f7fe5e2-1dcf-44b2-82bc-ceb8261b8cc7') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('0dcf5949-bddc-4d70-83ec-e9cdd1b4df81', 'cb57722c-1558-4d72-b52f-d86d5d18a04f') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('b66db237-5053-4b35-aa47-3983a9faf0a6', 'd1b199ba-94ad-4f76-91a9-808e8a92e6b6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('5129f4b2-7649-45ba-bdc1-42eb6d4e1a4d', '23f40136-6cf2-4e0f-9792-94edb8b15a71') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('96db2581-8af2-4e0b-ad30-371208a8c641', '52c3e386-08c1-4382-a20f-8b0c7b38d4dd') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('788d967d-16a6-11e5-acfb-60f81dc5b05a', '62598854-a548-4087-9c85-951b227a8add') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('cb8938a3-2826-48ce-b3c7-dca34fd7b9f1', 'bd48277f-9271-42e6-9e78-d4a03782b202') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('7c82a557-57b7-4301-a837-cb55dc6be0db', '6569447e-62f9-4d74-8224-4ecb279b7e42') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('81167d06-458a-4c9c-a875-134e1f049ebd', '99046a69-f6bd-45fa-951b-0d92190bf66e') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('2b68e264-965e-42fa-bb25-4970c32e4280', '92f06cde-dd4d-4224-8c5b-86f07f971cb6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('2169a9f8-b7f8-4d51-8230-4fcdfafae87b', '41a3bb72-d410-461d-8f11-b9f331892b61') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('a6af7959-d9d5-4dc8-aaad-73416f90f3de', '9a2405fa-2430-4736-8d6a-d0a617013579') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('49e9635a-8a2e-414c-abe4-c648147c289e', '76006b3c-3f3b-4cd8-ac54-653fd79bb6c6') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('af70a91f-f5b4-4958-a2c0-239b4199ff3e', '65819473-d98d-4618-bc97-a0f42da1b3ab') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('59abc251-d83f-4983-a8fc-ef03e957539e', 'f373a41b-a636-4319-b20e-7daf0486663d') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('4d499271-a4c8-48a4-a689-4778441cb6af', '949f6dae-6e76-403e-b540-57387ce33cc7') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('f614119f-694e-467f-92f9-97a196c85c45', '4a279a8c-4762-478d-b1a2-92cedc6e6189') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('1bb073bd-52d9-47fd-b4bd-3cc18df39e26', 'f62309c9-5467-495a-be4c-1b80e22e9feb') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('764b4acf-343e-4601-92cb-915095a53ba6', 'f0319e13-61e3-4461-9ebc-b235e3267ae7') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('949b745e-5063-4896-9ee3-37de886b03b9', '7d6623f8-5902-4685-aff9-7bd76dd433c1') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('394464c2-4200-4c5d-ad25-382705343a0d', 'bea8c920-4d2c-4712-978d-15f150a8fb08') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('788d04b5-16a6-11e5-bc96-60f81dc5b05a', 'dacc7d88-1b81-4492-9dbb-41ef30424db3') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('83959b92-1706-4bd6-b77d-34da7b93b813', 'f9b73368-759e-4588-84aa-9b216debf058') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('6abe2517-cab6-4bc9-b2ee-306c579a2f01', 'b48e687e-1b28-4243-beac-570cfb0e380d') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('58a704c0-56cb-4b15-84fa-ac09b6fa3eb7', '446b8694-d502-4762-bd67-eff22ae334ab') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('9edc6d50-d9f0-4c8d-85e6-cf7e30b14e41', '00a6473c-40ed-45b3-8489-699aa506b235') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('21d95857-0d37-4079-bc42-375e06babd32', '96621760-fa5f-4748-9e21-1e1a42e31bc2') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('7aa344a8-99aa-471c-8d1e-26874ddac341', 'a6636e3e-3473-4556-81e9-bcc5d0a75c77') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('f1500e18-c995-4ccd-9bb8-e4294479ae4c', '9a9d5ff1-10c9-46de-8a95-21f7284fdcf0') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('89f5994c-c068-416e-a06b-687bba585cd2', 'e1fb9424-0a9f-4ce5-a7f5-88a12cb67955') for e in value['commonDiagnosis']]
        value['commonDiagnosis'] = [e.replace('7bb7034d-7075-4940-86b8-0233dab3926a', '2cea0443-a548-4f54-a4eb-a5fd581cbdef') for e in value['commonDiagnosis']]


@upgrade_step('group', '4', '5')
def group_4_5(value, system):
    # https://github.com/ClinGen/clincoded/issues/1507
    # Add affiliation property and update schema version
    return
