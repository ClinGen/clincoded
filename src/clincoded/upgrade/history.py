from contentbase.upgrader import upgrade_step


@upgrade_step('history', '1', '2')
def history_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1328
    if value['meta']:
        if value['meta']['gdm']:
            if value['meta']['gdm']['disease']:
                if value['meta']['gdm']['disease'] == '78867c7a-16a6-11e5-8007-60f81dc5b05a':
                    value['meta']['gdm']['disease'] = 'ba0159b3-a60d-4da2-a146-4deeff9bcd50'
                if value['meta']['gdm']['disease'] == 'c327a221-c3a3-4eac-9d4f-7c266b65aeca':
                    value['meta']['gdm']['disease'] = '27dd31ee-410b-4bd3-bebf-f2e25263e694'
                if value['meta']['gdm']['disease'] == 'a32234b2-727d-4aca-b284-b5e05ef72959':
                    value['meta']['gdm']['disease'] = '298c8c10-14e8-406e-a7c0-3533e386c243'
                if value['meta']['gdm']['disease'] == '82c995b8-bf80-4c54-a0d7-08be5d0c427b':
                    value['meta']['gdm']['disease'] = 'ff845d7d-6fe5-4477-be24-ecf61419f2c2'
                if value['meta']['gdm']['disease'] == '0585b7da-0b55-487f-9b61-6cc4f14bb36d':
                    value['meta']['gdm']['disease'] = '128af3ec-4a18-4370-9ea1-fad9d7a441a5'
                if value['meta']['gdm']['disease'] == '6ad8f0b7-8a6d-4e0f-aed5-479d90a37b92':
                    value['meta']['gdm']['disease'] = 'ffd74845-9b32-4395-a121-fa5cf6969e5e'
                if value['meta']['gdm']['disease'] == 'c0f96306-2873-41ff-a779-01795abbca2a':
                    value['meta']['gdm']['disease'] = 'f0022201-0d9b-421c-ba59-e8735bef4641'
                if value['meta']['gdm']['disease'] == 'b6ce0f2b-8962-4065-ad63-d28d3f437c8e':
                    value['meta']['gdm']['disease'] = '54251120-c51f-4d88-9bbe-56923876232e'
                if value['meta']['gdm']['disease'] == '0c9b3d94-b574-4c11-8a17-7e9af7faf16e':
                    value['meta']['gdm']['disease'] = '30e14e67-3408-4ec9-84f2-54ad6a8c9b5b'
                if value['meta']['gdm']['disease'] == 'e7486d34-021a-491e-984e-3302c5d4e688':
                    value['meta']['gdm']['disease'] = '8d25c62d-6363-4e61-91f0-7eb94be23e08'
                if value['meta']['gdm']['disease'] == '26e6f6d7-4ec7-4698-b03e-9f980f1f2c8b':
                    value['meta']['gdm']['disease'] = 'a7d6f33b-e530-4803-a86f-39212f296e19'
                if value['meta']['gdm']['disease'] == '510db9fe-99e1-478a-bfb6-fb44af8a5794':
                    value['meta']['gdm']['disease'] = 'cd1c30fe-1089-4821-9fb1-1b630e828d99'
                if value['meta']['gdm']['disease'] == 'b1e17565-bfad-4843-8636-d41060b5159c':
                    value['meta']['gdm']['disease'] = 'd4ea2cd7-736b-4af8-9d64-4391b19ebd30'
                if value['meta']['gdm']['disease'] == 'e337a837-bc93-4ef4-8482-e0bd150ea345':
                    value['meta']['gdm']['disease'] = 'c2d92d58-77e6-4843-9918-ff57dcfe3526'
                if value['meta']['gdm']['disease'] == 'c6dc3bde-01d1-437a-a5eb-5348ef05c475':
                    value['meta']['gdm']['disease'] = '67d0ddc5-b004-470b-9f70-d39c71577aae'
                if value['meta']['gdm']['disease'] == '2caea86b-a794-4cd5-97ec-943e98f3c771':
                    value['meta']['gdm']['disease'] = '7e344c37-e662-4265-87dc-8335c35b26fb'
                if value['meta']['gdm']['disease'] == '01f75512-f4e7-43bf-86fa-bbb1115e31b2':
                    value['meta']['gdm']['disease'] = 'ff8b42f1-6688-4c5e-a262-a01b302a6496'
                if value['meta']['gdm']['disease'] == '1c4d6209-996c-468f-8f0d-f525d0046571':
                    value['meta']['gdm']['disease'] = 'e8f29945-4255-464e-bb45-c3bc654b8bb1'
                if value['meta']['gdm']['disease'] == '636acccf-ac12-4549-baaf-d78636e3c486':
                    value['meta']['gdm']['disease'] = '52bb35c9-8c98-40e8-924a-b435719828d6'
                if value['meta']['gdm']['disease'] == '441c9708-c9bc-41a0-8d19-7f1778f997be':
                    value['meta']['gdm']['disease'] = 'd77a3cfd-aad5-4d37-9448-0bc848930620'
                if value['meta']['gdm']['disease'] == 'ba967f3d-2659-4f45-9857-cc65e6e9afa5':
                    value['meta']['gdm']['disease'] = '4ad3784b-590a-4a50-8239-20fdae96cfa6'
                if value['meta']['gdm']['disease'] == '617a2e8b-ec57-45e6-a425-ed1e2cfde297':
                    value['meta']['gdm']['disease'] = '4a91a5e8-664e-4608-a136-6e1d870beb5b'
                if value['meta']['gdm']['disease'] == 'b04e7069-4a84-4909-9be1-22cd824a6865':
                    value['meta']['gdm']['disease'] = '28c266c3-c060-4a54-b42d-71c3e684541e'
                if value['meta']['gdm']['disease'] == '183252a9-9df5-4dfb-ba0d-8cbe229b8c04':
                    value['meta']['gdm']['disease'] = '05b13ca9-9d70-4e1c-ab12-8a1a83498f33'
                if value['meta']['gdm']['disease'] == '45e77e45-74ee-4aaf-a35f-f642598f99b0':
                    value['meta']['gdm']['disease'] = '3f4e36bc-b702-4bfa-9bf7-ba0b79b8eff3'
                if value['meta']['gdm']['disease'] == '5154d59e-7446-4447-a2ce-13386cfb5a11':
                    value['meta']['gdm']['disease'] = '999d2023-89d8-476c-a092-e63a1d1881c7'
                if value['meta']['gdm']['disease'] == '788c3bb0-16a6-11e5-8618-60f81dc5b05a':
                    value['meta']['gdm']['disease'] = '044aa5ca-5f9f-4e78-8c1a-89a1d221ed0c'
                if value['meta']['gdm']['disease'] == '54f5cef6-155a-4b30-b0a7-370247dcaa78':
                    value['meta']['gdm']['disease'] = '14f9a138-003e-4e6b-a99c-a31361095fb6'
                if value['meta']['gdm']['disease'] == '921a2682-0896-486a-9b24-50c868e23421':
                    value['meta']['gdm']['disease'] = '9152c18a-fa5f-47a1-931f-a581d5aa3deb'
                if value['meta']['gdm']['disease'] == 'b1db48c9-87d5-4c17-b980-96304bbb060f':
                    value['meta']['gdm']['disease'] = '86b1beae-97c3-4f14-9063-88116de15547'
                if value['meta']['gdm']['disease'] == '8bec6733-eecb-408c-9dbe-4ecd53661460':
                    value['meta']['gdm']['disease'] = '9f2ac0c7-a431-4ae0-8c83-087628f5f739'
                if value['meta']['gdm']['disease'] == 'e80f4442-e8dc-4be5-87c7-6d2a6259486a':
                    value['meta']['gdm']['disease'] = 'e579aa67-c861-43ec-b0ee-94f6fa2ab756'
                if value['meta']['gdm']['disease'] == '61b526cf-4139-48dd-98a1-c7ac00d547cc':
                    value['meta']['gdm']['disease'] = 'e6aa6306-43e3-443d-a7cc-c48fbdc15d11'
                if value['meta']['gdm']['disease'] == '74df017b-38a3-4c20-993b-c47520c53ec4':
                    value['meta']['gdm']['disease'] = 'cb1fce04-3a02-4e37-bf53-a9573ab8a5a6'
                if value['meta']['gdm']['disease'] == '4d433808-e006-45da-b1eb-5b138dc0ca66':
                    value['meta']['gdm']['disease'] = 'c716b4dc-a50b-48f3-b81d-08e7130c2202'
                if value['meta']['gdm']['disease'] == '22a264ac-d8ce-4a69-8052-0f699ea929ad':
                    value['meta']['gdm']['disease'] = '5bc67f05-3b9b-4ee9-9086-bc22b7f22671'
                if value['meta']['gdm']['disease'] == '675abbaf-c8fb-45f0-8058-97234482740a':
                    value['meta']['gdm']['disease'] = '3bd5f327-477d-4662-9b49-74ded72da35f'
                if value['meta']['gdm']['disease'] == '29baf6a5-a09f-4df3-a661-571837ca2d7c':
                    value['meta']['gdm']['disease'] = 'c8688f53-2fe6-4c6a-b861-8cc18b32e7d5'
                if value['meta']['gdm']['disease'] == 'fa5b0fa7-f012-4bb3-aae8-f35159d3d821':
                    value['meta']['gdm']['disease'] = '673ffe97-ef00-4bd5-9857-f67b5509ba8e'
                if value['meta']['gdm']['disease'] == '772b1b43-c3cb-4b7e-a1a5-83ee77b5eb25':
                    value['meta']['gdm']['disease'] = '6f7fe5e2-1dcf-44b2-82bc-ceb8261b8cc7'
                if value['meta']['gdm']['disease'] == '0dcf5949-bddc-4d70-83ec-e9cdd1b4df81':
                    value['meta']['gdm']['disease'] = 'cb57722c-1558-4d72-b52f-d86d5d18a04f'
                if value['meta']['gdm']['disease'] == 'b66db237-5053-4b35-aa47-3983a9faf0a6':
                    value['meta']['gdm']['disease'] = 'd1b199ba-94ad-4f76-91a9-808e8a92e6b6'
                if value['meta']['gdm']['disease'] == '5129f4b2-7649-45ba-bdc1-42eb6d4e1a4d':
                    value['meta']['gdm']['disease'] = '23f40136-6cf2-4e0f-9792-94edb8b15a71'
                if value['meta']['gdm']['disease'] == '96db2581-8af2-4e0b-ad30-371208a8c641':
                    value['meta']['gdm']['disease'] = '52c3e386-08c1-4382-a20f-8b0c7b38d4dd'
                if value['meta']['gdm']['disease'] == '788d967d-16a6-11e5-acfb-60f81dc5b05a':
                    value['meta']['gdm']['disease'] = '62598854-a548-4087-9c85-951b227a8add'
                if value['meta']['gdm']['disease'] == 'cb8938a3-2826-48ce-b3c7-dca34fd7b9f1':
                    value['meta']['gdm']['disease'] = 'bd48277f-9271-42e6-9e78-d4a03782b202'
                if value['meta']['gdm']['disease'] == '7c82a557-57b7-4301-a837-cb55dc6be0db':
                    value['meta']['gdm']['disease'] = '6569447e-62f9-4d74-8224-4ecb279b7e42'
                if value['meta']['gdm']['disease'] == '81167d06-458a-4c9c-a875-134e1f049ebd':
                    value['meta']['gdm']['disease'] = '99046a69-f6bd-45fa-951b-0d92190bf66e'
                if value['meta']['gdm']['disease'] == '2b68e264-965e-42fa-bb25-4970c32e4280':
                    value['meta']['gdm']['disease'] = '92f06cde-dd4d-4224-8c5b-86f07f971cb6'
                if value['meta']['gdm']['disease'] == '2169a9f8-b7f8-4d51-8230-4fcdfafae87b':
                    value['meta']['gdm']['disease'] = '41a3bb72-d410-461d-8f11-b9f331892b61'
                if value['meta']['gdm']['disease'] == 'a6af7959-d9d5-4dc8-aaad-73416f90f3de':
                    value['meta']['gdm']['disease'] = '9a2405fa-2430-4736-8d6a-d0a617013579'
                if value['meta']['gdm']['disease'] == '49e9635a-8a2e-414c-abe4-c648147c289e':
                    value['meta']['gdm']['disease'] = '76006b3c-3f3b-4cd8-ac54-653fd79bb6c6'
                if value['meta']['gdm']['disease'] == 'af70a91f-f5b4-4958-a2c0-239b4199ff3e':
                    value['meta']['gdm']['disease'] = '65819473-d98d-4618-bc97-a0f42da1b3ab'
                if value['meta']['gdm']['disease'] == '59abc251-d83f-4983-a8fc-ef03e957539e':
                    value['meta']['gdm']['disease'] = 'f373a41b-a636-4319-b20e-7daf0486663d'
                if value['meta']['gdm']['disease'] == '4d499271-a4c8-48a4-a689-4778441cb6af':
                    value['meta']['gdm']['disease'] = '949f6dae-6e76-403e-b540-57387ce33cc7'
                if value['meta']['gdm']['disease'] == 'f614119f-694e-467f-92f9-97a196c85c45':
                    value['meta']['gdm']['disease'] = '4a279a8c-4762-478d-b1a2-92cedc6e6189'
                if value['meta']['gdm']['disease'] == '1bb073bd-52d9-47fd-b4bd-3cc18df39e26':
                    value['meta']['gdm']['disease'] = 'f62309c9-5467-495a-be4c-1b80e22e9feb'
                if value['meta']['gdm']['disease'] == '764b4acf-343e-4601-92cb-915095a53ba6':
                    value['meta']['gdm']['disease'] = 'f0319e13-61e3-4461-9ebc-b235e3267ae7'
                if value['meta']['gdm']['disease'] == '949b745e-5063-4896-9ee3-37de886b03b9':
                    value['meta']['gdm']['disease'] = '7d6623f8-5902-4685-aff9-7bd76dd433c1'
                if value['meta']['gdm']['disease'] == '394464c2-4200-4c5d-ad25-382705343a0d':
                    value['meta']['gdm']['disease'] = 'bea8c920-4d2c-4712-978d-15f150a8fb08'
                if value['meta']['gdm']['disease'] == '788d04b5-16a6-11e5-bc96-60f81dc5b05a':
                    value['meta']['gdm']['disease'] = 'dacc7d88-1b81-4492-9dbb-41ef30424db3'
                if value['meta']['gdm']['disease'] == '83959b92-1706-4bd6-b77d-34da7b93b813':
                    value['meta']['gdm']['disease'] = 'f9b73368-759e-4588-84aa-9b216debf058'
                if value['meta']['gdm']['disease'] == '6abe2517-cab6-4bc9-b2ee-306c579a2f01':
                    value['meta']['gdm']['disease'] = 'b48e687e-1b28-4243-beac-570cfb0e380d'
                if value['meta']['gdm']['disease'] == '58a704c0-56cb-4b15-84fa-ac09b6fa3eb7':
                    value['meta']['gdm']['disease'] = '446b8694-d502-4762-bd67-eff22ae334ab'
                if value['meta']['gdm']['disease'] == '9edc6d50-d9f0-4c8d-85e6-cf7e30b14e41':
                    value['meta']['gdm']['disease'] = '00a6473c-40ed-45b3-8489-699aa506b235'
                if value['meta']['gdm']['disease'] == '21d95857-0d37-4079-bc42-375e06babd32':
                    value['meta']['gdm']['disease'] = '96621760-fa5f-4748-9e21-1e1a42e31bc2'
                if value['meta']['gdm']['disease'] == '7aa344a8-99aa-471c-8d1e-26874ddac341':
                    value['meta']['gdm']['disease'] = 'a6636e3e-3473-4556-81e9-bcc5d0a75c77'
                if value['meta']['gdm']['disease'] == 'f1500e18-c995-4ccd-9bb8-e4294479ae4c':
                    value['meta']['gdm']['disease'] = '9a9d5ff1-10c9-46de-8a95-21f7284fdcf0'
                if value['meta']['gdm']['disease'] == '89f5994c-c068-416e-a06b-687bba585cd2':
                    value['meta']['gdm']['disease'] = 'e1fb9424-0a9f-4ce5-a7f5-88a12cb67955'
                if value['meta']['gdm']['disease'] == '7bb7034d-7075-4940-86b8-0233dab3926a':
                    value['meta']['gdm']['disease'] = '2cea0443-a548-4f54-a4eb-a5fd581cbdef'

    if value['meta']:
        if value['meta']['interpretation']:
            if value['meta']['interpretation']['disease']:
                if value['meta']['interpretation']['disease'] == '78867c7a-16a6-11e5-8007-60f81dc5b05a':
                    value['meta']['interpretation']['disease'] = 'ba0159b3-a60d-4da2-a146-4deeff9bcd50'
                if value['meta']['interpretation']['disease'] == 'c327a221-c3a3-4eac-9d4f-7c266b65aeca':
                    value['meta']['interpretation']['disease'] = '27dd31ee-410b-4bd3-bebf-f2e25263e694'
                if value['meta']['interpretation']['disease'] == 'a32234b2-727d-4aca-b284-b5e05ef72959':
                    value['meta']['interpretation']['disease'] = '298c8c10-14e8-406e-a7c0-3533e386c243'
                if value['meta']['interpretation']['disease'] == '82c995b8-bf80-4c54-a0d7-08be5d0c427b':
                    value['meta']['interpretation']['disease'] = 'ff845d7d-6fe5-4477-be24-ecf61419f2c2'
                if value['meta']['interpretation']['disease'] == '0585b7da-0b55-487f-9b61-6cc4f14bb36d':
                    value['meta']['interpretation']['disease'] = '128af3ec-4a18-4370-9ea1-fad9d7a441a5'
                if value['meta']['interpretation']['disease'] == '6ad8f0b7-8a6d-4e0f-aed5-479d90a37b92':
                    value['meta']['interpretation']['disease'] = 'ffd74845-9b32-4395-a121-fa5cf6969e5e'
                if value['meta']['interpretation']['disease'] == 'c0f96306-2873-41ff-a779-01795abbca2a':
                    value['meta']['interpretation']['disease'] = 'f0022201-0d9b-421c-ba59-e8735bef4641'
                if value['meta']['interpretation']['disease'] == 'b6ce0f2b-8962-4065-ad63-d28d3f437c8e':
                    value['meta']['interpretation']['disease'] = '54251120-c51f-4d88-9bbe-56923876232e'
                if value['meta']['interpretation']['disease'] == '0c9b3d94-b574-4c11-8a17-7e9af7faf16e':
                    value['meta']['interpretation']['disease'] = '30e14e67-3408-4ec9-84f2-54ad6a8c9b5b'
                if value['meta']['interpretation']['disease'] == 'e7486d34-021a-491e-984e-3302c5d4e688':
                    value['meta']['interpretation']['disease'] = '8d25c62d-6363-4e61-91f0-7eb94be23e08'
                if value['meta']['interpretation']['disease'] == '26e6f6d7-4ec7-4698-b03e-9f980f1f2c8b':
                    value['meta']['interpretation']['disease'] = 'a7d6f33b-e530-4803-a86f-39212f296e19'
                if value['meta']['interpretation']['disease'] == '510db9fe-99e1-478a-bfb6-fb44af8a5794':
                    value['meta']['interpretation']['disease'] = 'cd1c30fe-1089-4821-9fb1-1b630e828d99'
                if value['meta']['interpretation']['disease'] == 'b1e17565-bfad-4843-8636-d41060b5159c':
                    value['meta']['interpretation']['disease'] = 'd4ea2cd7-736b-4af8-9d64-4391b19ebd30'
                if value['meta']['interpretation']['disease'] == 'e337a837-bc93-4ef4-8482-e0bd150ea345':
                    value['meta']['interpretation']['disease'] = 'c2d92d58-77e6-4843-9918-ff57dcfe3526'
                if value['meta']['interpretation']['disease'] == 'c6dc3bde-01d1-437a-a5eb-5348ef05c475':
                    value['meta']['interpretation']['disease'] = '67d0ddc5-b004-470b-9f70-d39c71577aae'
                if value['meta']['interpretation']['disease'] == '2caea86b-a794-4cd5-97ec-943e98f3c771':
                    value['meta']['interpretation']['disease'] = '7e344c37-e662-4265-87dc-8335c35b26fb'
                if value['meta']['interpretation']['disease'] == '01f75512-f4e7-43bf-86fa-bbb1115e31b2':
                    value['meta']['interpretation']['disease'] = 'ff8b42f1-6688-4c5e-a262-a01b302a6496'
                if value['meta']['interpretation']['disease'] == '1c4d6209-996c-468f-8f0d-f525d0046571':
                    value['meta']['interpretation']['disease'] = 'e8f29945-4255-464e-bb45-c3bc654b8bb1'
                if value['meta']['interpretation']['disease'] == '636acccf-ac12-4549-baaf-d78636e3c486':
                    value['meta']['interpretation']['disease'] = '52bb35c9-8c98-40e8-924a-b435719828d6'
                if value['meta']['interpretation']['disease'] == '441c9708-c9bc-41a0-8d19-7f1778f997be':
                    value['meta']['interpretation']['disease'] = 'd77a3cfd-aad5-4d37-9448-0bc848930620'
                if value['meta']['interpretation']['disease'] == 'ba967f3d-2659-4f45-9857-cc65e6e9afa5':
                    value['meta']['interpretation']['disease'] = '4ad3784b-590a-4a50-8239-20fdae96cfa6'
                if value['meta']['interpretation']['disease'] == '617a2e8b-ec57-45e6-a425-ed1e2cfde297':
                    value['meta']['interpretation']['disease'] = '4a91a5e8-664e-4608-a136-6e1d870beb5b'
                if value['meta']['interpretation']['disease'] == 'b04e7069-4a84-4909-9be1-22cd824a6865':
                    value['meta']['interpretation']['disease'] = '28c266c3-c060-4a54-b42d-71c3e684541e'
                if value['meta']['interpretation']['disease'] == '183252a9-9df5-4dfb-ba0d-8cbe229b8c04':
                    value['meta']['interpretation']['disease'] = '05b13ca9-9d70-4e1c-ab12-8a1a83498f33'
                if value['meta']['interpretation']['disease'] == '45e77e45-74ee-4aaf-a35f-f642598f99b0':
                    value['meta']['interpretation']['disease'] = '3f4e36bc-b702-4bfa-9bf7-ba0b79b8eff3'
                if value['meta']['interpretation']['disease'] == '5154d59e-7446-4447-a2ce-13386cfb5a11':
                    value['meta']['interpretation']['disease'] = '999d2023-89d8-476c-a092-e63a1d1881c7'
                if value['meta']['interpretation']['disease'] == '788c3bb0-16a6-11e5-8618-60f81dc5b05a':
                    value['meta']['interpretation']['disease'] = '044aa5ca-5f9f-4e78-8c1a-89a1d221ed0c'
                if value['meta']['interpretation']['disease'] == '54f5cef6-155a-4b30-b0a7-370247dcaa78':
                    value['meta']['interpretation']['disease'] = '14f9a138-003e-4e6b-a99c-a31361095fb6'
                if value['meta']['interpretation']['disease'] == '921a2682-0896-486a-9b24-50c868e23421':
                    value['meta']['interpretation']['disease'] = '9152c18a-fa5f-47a1-931f-a581d5aa3deb'
                if value['meta']['interpretation']['disease'] == 'b1db48c9-87d5-4c17-b980-96304bbb060f':
                    value['meta']['interpretation']['disease'] = '86b1beae-97c3-4f14-9063-88116de15547'
                if value['meta']['interpretation']['disease'] == '8bec6733-eecb-408c-9dbe-4ecd53661460':
                    value['meta']['interpretation']['disease'] = '9f2ac0c7-a431-4ae0-8c83-087628f5f739'
                if value['meta']['interpretation']['disease'] == 'e80f4442-e8dc-4be5-87c7-6d2a6259486a':
                    value['meta']['interpretation']['disease'] = 'e579aa67-c861-43ec-b0ee-94f6fa2ab756'
                if value['meta']['interpretation']['disease'] == '61b526cf-4139-48dd-98a1-c7ac00d547cc':
                    value['meta']['interpretation']['disease'] = 'e6aa6306-43e3-443d-a7cc-c48fbdc15d11'
                if value['meta']['interpretation']['disease'] == '74df017b-38a3-4c20-993b-c47520c53ec4':
                    value['meta']['interpretation']['disease'] = 'cb1fce04-3a02-4e37-bf53-a9573ab8a5a6'
                if value['meta']['interpretation']['disease'] == '4d433808-e006-45da-b1eb-5b138dc0ca66':
                    value['meta']['interpretation']['disease'] = 'c716b4dc-a50b-48f3-b81d-08e7130c2202'
                if value['meta']['interpretation']['disease'] == '22a264ac-d8ce-4a69-8052-0f699ea929ad':
                    value['meta']['interpretation']['disease'] = '5bc67f05-3b9b-4ee9-9086-bc22b7f22671'
                if value['meta']['interpretation']['disease'] == '675abbaf-c8fb-45f0-8058-97234482740a':
                    value['meta']['interpretation']['disease'] = '3bd5f327-477d-4662-9b49-74ded72da35f'
                if value['meta']['interpretation']['disease'] == '29baf6a5-a09f-4df3-a661-571837ca2d7c':
                    value['meta']['interpretation']['disease'] = 'c8688f53-2fe6-4c6a-b861-8cc18b32e7d5'
                if value['meta']['interpretation']['disease'] == 'fa5b0fa7-f012-4bb3-aae8-f35159d3d821':
                    value['meta']['interpretation']['disease'] = '673ffe97-ef00-4bd5-9857-f67b5509ba8e'
                if value['meta']['interpretation']['disease'] == '772b1b43-c3cb-4b7e-a1a5-83ee77b5eb25':
                    value['meta']['interpretation']['disease'] = '6f7fe5e2-1dcf-44b2-82bc-ceb8261b8cc7'
                if value['meta']['interpretation']['disease'] == '0dcf5949-bddc-4d70-83ec-e9cdd1b4df81':
                    value['meta']['interpretation']['disease'] = 'cb57722c-1558-4d72-b52f-d86d5d18a04f'
                if value['meta']['interpretation']['disease'] == 'b66db237-5053-4b35-aa47-3983a9faf0a6':
                    value['meta']['interpretation']['disease'] = 'd1b199ba-94ad-4f76-91a9-808e8a92e6b6'
                if value['meta']['interpretation']['disease'] == '5129f4b2-7649-45ba-bdc1-42eb6d4e1a4d':
                    value['meta']['interpretation']['disease'] = '23f40136-6cf2-4e0f-9792-94edb8b15a71'
                if value['meta']['interpretation']['disease'] == '96db2581-8af2-4e0b-ad30-371208a8c641':
                    value['meta']['interpretation']['disease'] = '52c3e386-08c1-4382-a20f-8b0c7b38d4dd'
                if value['meta']['interpretation']['disease'] == '788d967d-16a6-11e5-acfb-60f81dc5b05a':
                    value['meta']['interpretation']['disease'] = '62598854-a548-4087-9c85-951b227a8add'
                if value['meta']['interpretation']['disease'] == 'cb8938a3-2826-48ce-b3c7-dca34fd7b9f1':
                    value['meta']['interpretation']['disease'] = 'bd48277f-9271-42e6-9e78-d4a03782b202'
                if value['meta']['interpretation']['disease'] == '7c82a557-57b7-4301-a837-cb55dc6be0db':
                    value['meta']['interpretation']['disease'] = '6569447e-62f9-4d74-8224-4ecb279b7e42'
                if value['meta']['interpretation']['disease'] == '81167d06-458a-4c9c-a875-134e1f049ebd':
                    value['meta']['interpretation']['disease'] = '99046a69-f6bd-45fa-951b-0d92190bf66e'
                if value['meta']['interpretation']['disease'] == '2b68e264-965e-42fa-bb25-4970c32e4280':
                    value['meta']['interpretation']['disease'] = '92f06cde-dd4d-4224-8c5b-86f07f971cb6'
                if value['meta']['interpretation']['disease'] == '2169a9f8-b7f8-4d51-8230-4fcdfafae87b':
                    value['meta']['interpretation']['disease'] = '41a3bb72-d410-461d-8f11-b9f331892b61'
                if value['meta']['interpretation']['disease'] == 'a6af7959-d9d5-4dc8-aaad-73416f90f3de':
                    value['meta']['interpretation']['disease'] = '9a2405fa-2430-4736-8d6a-d0a617013579'
                if value['meta']['interpretation']['disease'] == '49e9635a-8a2e-414c-abe4-c648147c289e':
                    value['meta']['interpretation']['disease'] = '76006b3c-3f3b-4cd8-ac54-653fd79bb6c6'
                if value['meta']['interpretation']['disease'] == 'af70a91f-f5b4-4958-a2c0-239b4199ff3e':
                    value['meta']['interpretation']['disease'] = '65819473-d98d-4618-bc97-a0f42da1b3ab'
                if value['meta']['interpretation']['disease'] == '59abc251-d83f-4983-a8fc-ef03e957539e':
                    value['meta']['interpretation']['disease'] = 'f373a41b-a636-4319-b20e-7daf0486663d'
                if value['meta']['interpretation']['disease'] == '4d499271-a4c8-48a4-a689-4778441cb6af':
                    value['meta']['interpretation']['disease'] = '949f6dae-6e76-403e-b540-57387ce33cc7'
                if value['meta']['interpretation']['disease'] == 'f614119f-694e-467f-92f9-97a196c85c45':
                    value['meta']['interpretation']['disease'] = '4a279a8c-4762-478d-b1a2-92cedc6e6189'
                if value['meta']['interpretation']['disease'] == '1bb073bd-52d9-47fd-b4bd-3cc18df39e26':
                    value['meta']['interpretation']['disease'] = 'f62309c9-5467-495a-be4c-1b80e22e9feb'
                if value['meta']['interpretation']['disease'] == '764b4acf-343e-4601-92cb-915095a53ba6':
                    value['meta']['interpretation']['disease'] = 'f0319e13-61e3-4461-9ebc-b235e3267ae7'
                if value['meta']['interpretation']['disease'] == '949b745e-5063-4896-9ee3-37de886b03b9':
                    value['meta']['interpretation']['disease'] = '7d6623f8-5902-4685-aff9-7bd76dd433c1'
                if value['meta']['interpretation']['disease'] == '394464c2-4200-4c5d-ad25-382705343a0d':
                    value['meta']['interpretation']['disease'] = 'bea8c920-4d2c-4712-978d-15f150a8fb08'
                if value['meta']['interpretation']['disease'] == '788d04b5-16a6-11e5-bc96-60f81dc5b05a':
                    value['meta']['interpretation']['disease'] = 'dacc7d88-1b81-4492-9dbb-41ef30424db3'
                if value['meta']['interpretation']['disease'] == '83959b92-1706-4bd6-b77d-34da7b93b813':
                    value['meta']['interpretation']['disease'] = 'f9b73368-759e-4588-84aa-9b216debf058'
                if value['meta']['interpretation']['disease'] == '6abe2517-cab6-4bc9-b2ee-306c579a2f01':
                    value['meta']['interpretation']['disease'] = 'b48e687e-1b28-4243-beac-570cfb0e380d'
                if value['meta']['interpretation']['disease'] == '58a704c0-56cb-4b15-84fa-ac09b6fa3eb7':
                    value['meta']['interpretation']['disease'] = '446b8694-d502-4762-bd67-eff22ae334ab'
                if value['meta']['interpretation']['disease'] == '9edc6d50-d9f0-4c8d-85e6-cf7e30b14e41':
                    value['meta']['interpretation']['disease'] = '00a6473c-40ed-45b3-8489-699aa506b235'
                if value['meta']['interpretation']['disease'] == '21d95857-0d37-4079-bc42-375e06babd32':
                    value['meta']['interpretation']['disease'] = '96621760-fa5f-4748-9e21-1e1a42e31bc2'
                if value['meta']['interpretation']['disease'] == '7aa344a8-99aa-471c-8d1e-26874ddac341':
                    value['meta']['interpretation']['disease'] = 'a6636e3e-3473-4556-81e9-bcc5d0a75c77'
                if value['meta']['interpretation']['disease'] == 'f1500e18-c995-4ccd-9bb8-e4294479ae4c':
                    value['meta']['interpretation']['disease'] = '9a9d5ff1-10c9-46de-8a95-21f7284fdcf0'
                if value['meta']['interpretation']['disease'] == '89f5994c-c068-416e-a06b-687bba585cd2':
                    value['meta']['interpretation']['disease'] = 'e1fb9424-0a9f-4ce5-a7f5-88a12cb67955'
                if value['meta']['interpretation']['disease'] == '7bb7034d-7075-4940-86b8-0233dab3926a':
                    value['meta']['interpretation']['disease'] = '2cea0443-a548-4f54-a4eb-a5fd581cbdef'
