from contentbase.upgrader import upgrade_step


@upgrade_step('disease', '1', '2')
def disease_1_2(value, system):
    # https://github.com/ClinGen/clincoded/issues/1516
    if 'diseaseId' in value:
        value.pop('ontology', None)
        if value['diseaseId'] == 'DOID_0050431':
            value['diseaseId'] = 'MONDO_0016587'
            value['term'] = 'arrhythmogenic right ventricular cardiomyopathy'
            value['description'] = 'Arrhythmogenic right ventricular cardiomyopathy (ARVC) is a heart muscle disease that consists in progressive dystrophy of primarily the right ventricular myocardium with fibro-fatty replacement and ventricular dilation, and that is clinically characterized by ventricular arrhythmias and a risk of sudden cardiac death.'
        if value['diseaseId'] == 'DOID_0050451':
            value['diseaseId'] = 'MONDO_0015263'
            value['term'] = 'Brugada syndrome'
            value['description'] = 'Brugada syndrome (BrS) manifests with ST segment elevation in right precordial leads (V1 to V3), incomplete or complete right bundle branch block, and susceptibility to ventricular tachyarrhythmia and sudden death. BrS is an electrical disorder without overt myocardial abnormalities.'
        if value['diseaseId'] == 'DOID_0050466':
            value['diseaseId'] = 'MONDO_0018954'
            value['term'] = 'Loeys-Dietz syndrome'
            value['description'] = 'Loeys-Dietz syndrome is a rare genetic connective tissue disorder characterized by a broad spectrum of craniofacial, vascular and skeletal manifestations with four genetic subtypes described forming a clinical continuum.'
        if value['diseaseId'] == 'DOID_0050545':
            value['diseaseId'] = 'MONDO_0018677'
            value['term'] = 'visceral heterotaxy'
            value['description'] = 'A physical disorder characterized by the abnormal distribution of the major visceral organs within the chest and abdomen.'
        if value['diseaseId'] == 'DOID_0050564':
            value['diseaseId'] = 'MONDO_0019587'
            value['term'] = 'autosomal dominant nonsyndromic deafness'
            value['description'] = 'A nonsyndromic deafness characterized by an autosomal dominant inheritance mode.'
        if value['diseaseId'] == 'DOID_0050565':
            value['diseaseId'] = 'MONDO_0019588'
            value['term'] = 'autosomal recessive nonsyndromic deafness'
            value['description'] = 'A nonsyndromic deafness characterized by an autosomal recessive inheritance mode.'
        if value['diseaseId'] == 'DOID_0050566':
            value['diseaseId'] = 'MONDO_0019586'
            value['term'] = 'X-linked nonsyndromic deafness'
            value['description'] = ''
        if value['diseaseId'] == 'DOID_0050567':
            value['diseaseId'] = 'MONDO_0000358'
            value['term'] = 'orofacial cleft'
            value['description'] = ''
        if value['diseaseId'] == 'DOID_0050629':
            value['diseaseId'] = 'MONDO_0018866'
            value['term'] = 'Aicardi-Goutieres syndrome'
            value['description'] = 'Aicardi-GoutiC(res syndrome (AGS) is an inherited, subacute encephalopathy characterised by the association of basal ganglia calcification, leukodystrophy and cerebrospinal fluid (CSF) lymphocytosis.'
        if value['diseaseId'] == 'DOID_0050776':
            value['diseaseId'] = 'MONDO_0019181'
            value['term'] = 'non-syndromic X-linked intellectual disability'
            value['description'] = 'Nonspecific X-linked intellectual deficiencies (MRX) belong to the family of sex-linked intellectual deficiencies (XLMR). In contrast to syndromic or specific X-linked intellectual deficiencies (MRXS), which also present with associated physical, neurological and/or psychiatric manifestations, intellectual deficiency is the only symptom of MRX.'
        if value['diseaseId'] == 'DOID_0050787':
            value['diseaseId'] = 'MONDO_0008276'
            value['term'] = 'generalized juvenile polyposis/juvenile polyposis coli'
            value['description'] = ''
        if value['diseaseId'] == 'DOID_0060233':
            value['diseaseId'] = 'MONDO_0015280'
            value['term'] = 'cardiofaciocutaneous syndrome'
            value['description'] = 'Cardiofaciocutaneous (CFC) syndrome is a RASopathy characterized by craniofacial dysmorphology, congenital heart disease, dermatological abnormalities (most commonly hyperkeratotic skin and sparse, curly hair), growth retardation and intellectual disability.'
        if value['diseaseId'] == 'DOID_0060674':
            value['diseaseId'] = 'MONDO_0017990'
            value['term'] = 'catecholaminergic polymorphic ventricular tachycardia'
            value['description'] = 'Catecholaminergic polymorphic ventricular tachycardia (CPVT) is a severe genetic arrhythmogenic disorder characterized by adrenergically induced ventricular tachycardia (VT) manifesting as syncope and sudden death.'
        if value['diseaseId'] == 'DOID_0110827':
            value['diseaseId'] = 'MONDO_0016484'
            value['term'] = 'Usher syndrome type 2'
            value['description'] = 'An Usher syndrome characterized by mild to severe congenital hearing impairment, normal vestibular function and later development of retinitis pigmentosa.'
        if value['diseaseId'] == 'DOID_11984':
            value['diseaseId'] = 'MONDO_0005045'
            value['term'] = 'hypertrophic cardiomyopathy'
            value['description'] = 'An intrinsic cardiomyopathy that has_material_basis_in autosomal dominant inheritance and that is characterized by abnormal  thickening (hypertrophy) of the heart without any obvious cause.'
        if value['diseaseId'] == 'DOID_1339':
            value['diseaseId'] = 'MONDO_0015253'
            value['term'] = 'Diamond-Blackfan anemia'
            value['description'] = 'Blackfan-Diamond anemia (DBA) is a congenital aregenerative and often macrocytic anemia with erythroblastopenia.'
        if value['diseaseId'] == 'DOID_13515':
            value['diseaseId'] = 'MONDO_0001734'
            value['term'] = 'tuberous sclerosis'
            value['description'] = ''
        if value['diseaseId'] == 'DOID_13636':
            value['diseaseId'] = 'MONDO_0019391'
            value['term'] = 'Fanconi anemia'
            value['description'] = 'Fanconi anemia (FA) is a hereditary DNA repair disorder characterized by progressive pancytopenia with bone marrow failure, variable congenital malformations and predisposition to develop hematological or solid tumors.'
        if value['diseaseId'] == 'DOID_13911':
            value['diseaseId'] = 'MONDO_0018852'
            value['term'] = 'achromatopsia'
            value['description'] = 'Achromatopsia (ACHM) is a rare autosomal recessive retinal disorder characterized by color blindness, nystagmus, photophobia, and severely reduced visual acuity due to the absence or impairment of cone function.'
        if value['diseaseId'] == 'DOID_14291':
            value['diseaseId'] = 'MONDO_0001937'
            value['term'] = 'leopard syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'DOID_1935':
            value['diseaseId'] = 'MONDO_0015229'
            value['term'] = 'Bardet-Biedl syndrome'
            value['description'] = 'Bardet-Biedl syndrome (BBS) is a ciliopathy with multisystem involvement.'
        if value['diseaseId'] == 'DOID_2187':
            value['diseaseId'] = 'MONDO_0019507'
            value['term'] = 'amelogenesis imperfecta'
            value['description'] = 'Amelogenesis imperfecta (AI) represents a group of developmental conditions affecting the structure and clinical appearance of the enamel of all or nearly all the teeth in a more or less equal manner, and which may be associated with morphologic or biochemical changes elsewhere in the body.'
        if value['diseaseId'] == 'DOID_2481':
            value['diseaseId'] = 'MONDO_0016021'
            value['term'] = 'early infantile epileptic encephalopathy'
            value['description'] = 'Early infantile epileptic encephalopathy (EIEE), or Ohtahara syndrome, is one of the most severe forms of age-related epileptic encephalopathies, characterized by the onset of tonic spasms within the first 3 months of life that can be generalized or lateralized, independent of the sleep cycle and that can occur hundreds of times per day, leading to psychomotor impairment and death.'
        if value['diseaseId'] == 'DOID_2729':
            value['diseaseId'] = 'MONDO_0015780'
            value['term'] = 'dyskeratosis congenita'
            value['description'] = 'Dyskeratosis congenita (DC) is a rare ectodermal dysplasia that often presents with the classic triad of nail dysplasia, skin pigmentary changes, and oral leukoplakia associated with a high risk of bone marrow failure (BMF) and cancer.'
        if value['diseaseId'] == 'DOID_3490':
            value['diseaseId'] = 'MONDO_0018997'
            value['term'] = 'Noonan syndrome'
            value['description'] = 'Noonan Syndrome (NS) is characterised by short stature, typical facial dysmorphism and congenital heart defects.'
        if value['diseaseId'] == 'DOID_3883':
            value['diseaseId'] = 'MONDO_0005835'
            value['term'] = 'Lynch syndrome'
            value['description'] = 'An autosomal dominant disease that is characterized by an increased risk for colon cancer and cancers of the endometrium, ovary, stomach, small intestine, hepatobiliary tract, urinary tract, brain, and skin and has_material_basis_in mutation of mismatch repair genes that increases the risk of many types of cancers.'
        if value['diseaseId'] == 'DOID_5223':
            value['diseaseId'] = 'MONDO_0005047'
            value['term'] = 'infertility'
            value['description'] = 'Inability to conceive for at least one year after trying and having unprotected sex. Causes of female infertility include endometriosis, fallopian tubes obstruction, and polycystic ovary syndrome. Causes of male infertility include abnormal sperm production or function, blockage of the epididymis, blockage of the ejaculatory ducts, hypospadias, exposure to pesticides, and health related issues.'
        if value['diseaseId'] == 'DOID_5683':
            value['diseaseId'] = 'MONDO_0003582'
            value['term'] = 'hereditary breast ovarian cancer'
            value['description'] = 'An autosomal dominant disease characterized by the higher than normal tendency to develop breast and ovarian cancers in genetically related families.'
        if value['diseaseId'] == 'DOID_8545':
            value['diseaseId'] = 'MONDO_0018493'
            value['term'] = 'malignant hyperthermia (disease)'
            value['description'] = 'Malignant hyperthermia (MH) is a pharmacogenetic disorder of skeletal muscle that presents as a hypermetabolic response to potent volatile anesthetic gases such as halothane, sevoflurane, desflurane and the depolarizing muscle relaxant succinylcholine, and rarely, to stresses such as vigorous exercise and heat.'
        if value['diseaseId'] == 'DOID_9256':
            value['diseaseId'] = 'MONDO_0005575'
            value['term'] = 'colorectal cancer'
            value['description'] = 'A large intestine cancer that is located_in the colon and/or located_in the rectum.'
        if value['diseaseId'] == 'DOID_9258':
            value['diseaseId'] = 'MONDO_0018094'
            value['term'] = 'Waardenburg\'s syndrome'
            value['description'] = 'Waardenburg syndrome (WS) is a disorder characterized by varying degrees of deafness and minor defects in structures arising from neural crest, including pigmentation anomalies of eyes, hair, and skin. WS is classified into four clinical and genetic phenotypes.'
        if value['diseaseId'] == 'OMIM_100800':
            value['diseaseId'] = 'MONDO_0007037'
            value['term'] = 'achondroplasia'
            value['description'] = 'Achondroplasia is the most common form of chondrodysplasia, characterized by rhizomelia, exaggerated lumbar lordosis, brachydactyly, and macrocephaly with frontal bossing and midface hypoplasia.'
        if value['diseaseId'] == 'OMIM_101000':
            value['diseaseId'] = 'MONDO_0007039'
            value['term'] = 'neurofibromatosis type 2'
            value['description'] = 'Neurofibromatosis type 2 (NF2) is a tumor-prone disorder characterized by the development of multiple schwannomas and meningiomas.'
        if value['diseaseId'] == 'OMIM_109400':
            value['diseaseId'] = 'MONDO_0007187'
            value['term'] = 'nevoid basal cell carcinoma syndrome'
            value['description'] = 'Gorlin syndrome (GS) is a genodermatosis characterized by multiple early-onset basal cell carcinoma (BCC), odontogenic keratocysts and skeletal abnormalities.'
        if value['diseaseId'] == 'OMIM_137215':
            value['diseaseId'] = 'MONDO_0007648'
            value['term'] = 'hereditary diffuse gastric cancer'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_151623':
            value['diseaseId'] = 'MONDO_0007903'
            value['term'] = 'Li-Fraumeni syndrome 1'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_154275':
            value['diseaseId'] = 'MONDO_0007939'
            value['term'] = 'malignant hyperthermia, susceptibility to, 2'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_175200':
            value['diseaseId'] = 'MONDO_0008280'
            value['term'] = 'Peutz-Jeghers syndrome'
            value['description'] = 'Peutz-Jeghers syndrome (PJS) is an inherited gastrointestinal disorder characterized by development of characteristic hamartomatous polyps throughout the gastrointestinal (GI) tract, and by mucocutaneous pigmentation. PJS carries a considerably increased risk of GI and extra-GI malignancies.'
        if value['diseaseId'] == 'OMIM_176670':
            value['diseaseId'] = 'MONDO_0008310'
            value['term'] = 'progeria'
            value['description'] = 'Hutchinson-Gilford progeria syndrome is a rare, fatal, autosomal dominant and premature aging disease, beginning in childhood and characterized by growth reduction, failure to thrive, a typical facial appearance (prominent forehead, protuberant eyes, thin nose with a beaked tip, thin lips, micrognathia and protruding ears) and distinct dermatologic features (generalized alopecia, aged-looking skin, sclerotic and dimpled skin over the abdomen and extremities, prominent cutaneous vasculature, dyspigmentation, nail hypoplasia and loss of subcutaneous fat).'
        if value['diseaseId'] == 'OMIM_178200':
            value['diseaseId'] = 'MONDO_0008339'
            value['term'] = 'Antecubital pterygium syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_182212':
            value['diseaseId'] = 'MONDO_0008426'
            value['term'] = 'Shprintzen-Goldberg syndrome'
            value['description'] = 'Shprintzen-Goldberg syndrome (SGS) is a very rare genetic disorder characterized by craniosynostosis, craniofacial and skeletal abnormalities, marfanoid habitus, cardiac anomalies, neurological abnormalities, and intellectual disability.'
        if value['diseaseId'] == 'OMIM_187500':
            value['diseaseId'] = 'MONDO_0008542'
            value['term'] = 'tetralogy of fallot'
            value['description'] = 'Tetralogy of Fallot is a congenital cardiac malformation that consists of an interventricular communication, also known as a ventricular septal defect, obstruction of the right ventricular outflow tract, override of the ventricular septum by the aortic root, and right ventricular hypertrophy.'
        if value['diseaseId'] == 'OMIM_192500':
            value['diseaseId'] = 'MONDO_0008646'
            value['term'] = 'long QT syndrome 1'
            value['description'] = 'Romano-Ward syndrome (RWS) is an autosomal dominant variant of the long QT syndrome (LQTS, see this term) characterized by syncopal episodes and electrocardiographic abnormalities (QT prolongation, T-wave abnormalities and torsade de pointes (TdP) ventricular tachycardia).'
        if value['diseaseId'] == 'OMIM_193300':
            value['diseaseId'] = 'MONDO_0008667'
            value['term'] = 'von Hippel-Lindau disease'
            value['description'] = 'Von Hippel-Lindau disease (VHL) is a familial cancer predisposition syndrome associated with a variety of malignant and benign neoplasms, most frequently retinal, cerebellar, and spinal hemangioblastoma, renal cell carcinoma (RCC), and pheochromocytoma.'
        if value['diseaseId'] == 'OMIM_201450':
            value['diseaseId'] = 'MONDO_0008721'
            value['term'] = 'medium chain acyl-CoA dehydrogenase deficiency'
            value['description'] = 'Medium chain acyl-CoA dehydrogenase (MCAD) deficiency (MCADD) is an inborn error of mitochondrial fatty acid oxidation characterized by a rapidly progressive metabolic crisis, often presenting as hypoketotic hypoglycemia, lethargy, vomiting, seizures and coma, which can be fatal in the absence of emergency medical intervention.'
        if value['diseaseId'] == 'OMIM_201470':
            value['diseaseId'] = 'MONDO_0008722'
            value['term'] = 'short chain acyl-CoA dehydrogenase deficiency'
            value['description'] = 'Short-chain acyl-CoA dehydrogenase (SCAD) deficiency is a very rare inborn error of mitochondrial fatty acid oxidation characterized by variable manifestations ranging from asymptomatic individuals (in most cases) to those with failure to thrive, hypotonia, seizures, developmental delay and progressive myopathy.'
        if value['diseaseId'] == 'OMIM_209880':
            value['diseaseId'] = 'MONDO_0008852'
            value['term'] = 'congenital central hypoventilation syndrome'
            value['description'] = 'gene is found in 90% of the patients. Association with a Hirschsprung\'s disease is observed in 16% of the cases. Despite a high mortality rate and a lifelong dependence to mechanical ventilation, the long-term outcome of CCHS should be ultimately improved by multidisciplinary and coordinated follow-up of the patients.'
        if value['diseaseId'] == 'OMIM_216550':
            value['diseaseId'] = 'MONDO_0008999'
            value['term'] = 'Cohen syndrome'
            value['description'] = 'Cohen syndrome (CS) is a rare genetic developmental disorder characterized by microcephaly, characteristic facial features, hypotonia, non-progressive intellectual deficit, myopia and retinal dystrophy, neutropenia and truncal obesity.'
        if value['diseaseId'] == 'OMIM_218040':
            value['diseaseId'] = 'MONDO_0009026'
            value['term'] = 'Costello syndrome'
            value['description'] = 'Costello syndrome (CS) is a rare multisystemic disorder characterized by failure to thrive, short stature, developmental delay or intellectual disability, joint laxity, soft skin, and distinctive facial features. Cardiac and neurological involvement is common and there is an increased lifetime risk of certain tumors.'
        if value['diseaseId'] == 'OMIM_232300':
            value['diseaseId'] = 'MONDO_0009290'
            value['term'] = 'glycogen storage disease II'
            value['description'] = 'Glycogen storage disease due to acid maltase deficiency (AMD) is an autosomal recessive trait leading to metabolic myopathy that affects cardiac and respiratory muscles in addition to skeletal muscle and other tissues. AMD represents a wide spectrum of clinical presentations caused by an accumulation of glycogen in lysosomes: Glycogen storage disease due to acid maltase deficiency, infantile onset, non-classic infantile onset and adult onset (see these terms). Early onset forms are more severe and often fatal.'
        if value['diseaseId'] == 'OMIM_242900':
            value['diseaseId'] = 'MONDO_0009458'
            value['term'] = 'Schimke immuno-osseous dysplasia'
            value['description'] = 'Schimke immuno-osseous dysplasia (SIOD) is a multisystem disorder characterized by spondyloepiphyseal dysplasia and disproportionate short stature, facial dysmorphism, T-cell immunodeficiency, and glomerulonephritis with nephrotic syndrome.'
        if value['diseaseId'] == 'OMIM_243310':
            value['diseaseId'] = 'MONDO_0009470'
            value['term'] = 'Baraitser-winter syndrome 1'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_252010':
            value['diseaseId'] = 'MONDO_0009640'
            value['term'] = 'mitochondrial complex i deficiency'
            value['description'] = 'Isolated complex I deficiency is a rare inborn error of metabolism due to mutations in nuclear or mitochondrial genes encoding subunits or assembly factors of the human mitochondrial complex I (NADH: ubiquinone oxidoreductase) and is characterized by a wide range of manifestations including marked and often fatal lactic acidosis, cardiomyopathy, leukoencephalopathy, pure myopathy and hepatopathy with tubulopathy. Among the numerous clinical phenotypes observed are Leigh syndrome, Leber hereditary optic neuropathy and MELAS syndrome (see these terms).'
        if value['diseaseId'] == 'OMIM_255120':
            value['diseaseId'] = 'MONDO_0009705'
            value['term'] = 'carnitine palmitoyltransferase i deficiency'
            value['description'] = 'Carnitine palmitoyltransferase 1A (CPT-1A) deficiency is an inborn error of metabolism that affects mitochondrial oxidation of long chain fatty acids (LCFA) in the liver and kidneys, and is characterized by recurrent attacks of fasting-induced hypoketotic hypoglycemia and risk of liver failure.'
        if value['diseaseId'] == 'OMIM_256300':
            value['diseaseId'] = 'MONDO_0009732'
            value['term'] = 'congenital nephrotic syndrome, Finnish type'
            value['description'] = 'Congenital nephrotic syndrome, Finnish type is characterised by protein loss beginning during foetal life.'
        if value['diseaseId'] == 'OMIM_256370':
            value['diseaseId'] = 'MONDO_0009733'
            value['term'] = 'nephrotic syndrome, type 4'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_261600':
            value['diseaseId'] = 'MONDO_0009861'
            value['term'] = 'phenylketonuria'
            value['description'] = 'Phenylketonuria (PKU) is the most common inborn error of amino acid metabolism and is characterized by mild to severe mental disability in untreated patients.'
        if value['diseaseId'] == 'OMIM_268000':
            value['diseaseId'] = 'MONDO_0019200'
            value['term'] = 'retinitis pigmentosa'
            value['description'] = 'Retinitis pigmentosa (RP) is an inherited retinal dystrophy leading to progressive loss of the photoreceptors and retinal pigment epithelium and resulting in blindness usually after several decades.'
        if value['diseaseId'] == 'OMIM_269600':
            value['diseaseId'] = 'MONDO_0010017'
            value['term'] = 'sea-blue histiocyte syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_274600':
            value['diseaseId'] = 'MONDO_0010134'
            value['term'] = 'Pendred syndrome'
            value['description'] = 'Pendred syndrome (PDS) is a clinically variable genetic disorder characterized by bilateral sensorineural hearing loss and euthyroid goiter.'
        if value['diseaseId'] == 'OMIM_276900':
            value['diseaseId'] = 'MONDO_0010168'
            value['term'] = 'Usher syndrome type 1'
            value['description'] = 'An Usher syndrome characterized by profound congenital deafness, vestibular dysfunction and early development of retinitis pigmentosa.'
        if value['diseaseId'] == 'OMIM_277900':
            value['diseaseId'] = 'MONDO_0010200'
            value['term'] = 'Wilson disease'
            value['description'] = 'Wilson disease is a very rare inherited multisystemic disease presenting non-specific neurological, hepatic, psychiatric or osseo-muscular manifestations due to excessive copper deposition in the body.'
        if value['diseaseId'] == 'OMIM_300066':
            value['diseaseId'] = 'MONDO_0010238'
            value['term'] = 'deafness, X-linked 4'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_300914':
            value['diseaseId'] = 'MONDO_0010484'
            value['term'] = 'deafness, X-linked 6'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_301500':
            value['diseaseId'] = 'MONDO_0010526'
            value['term'] = 'Fabry disease'
            value['description'] = 'Fabry disease (FD) is a progressive, inherited, multisystemic lysosomal storage disease characterized by specific neurological, cutaneous, renal, cardiovascular, cochleo-vestibular and cerebrovascular manifestations.'
        if value['diseaseId'] == 'OMIM_301835':
            value['diseaseId'] = 'MONDO_0010533'
            value['term'] = 'Arts syndrome'
            value['description'] = 'Lethal ataxia with deafness and optic atrophy (also known as Arts syndrome) is characterized by intellectual deficit, early-onset hypotonia, ataxia, delayed motor development, hearing impairment and loss of vision due to optic atrophy.'
        if value['diseaseId'] == 'OMIM_304700':
            value['diseaseId'] = 'MONDO_0010578'
            value['term'] = 'deafness dystonia syndrome'
            value['description'] = 'Mohr-Tranebjaerg syndrome (MTS) is an X-linked recessive neurodegenerative syndrome characterized by clinical manifestations commencing with early childhood onset hearing loss, followed by adolescent onset progressive dystonia or ataxia, visual impairment from early adulthood onwards and dementia from the 4th decade onwards.'
        if value['diseaseId'] == 'OMIM_311070':
            value['diseaseId'] = 'MONDO_0010699'
            value['term'] = 'Charcot-Marie-tooth disease X-linked recessive 5'
            value['description'] = 'A Charcot-Marie-Tooth disease X-linked that has_material_basis_in loss-of-function mutation in the PRPS1 gene on chromosome Xq22.'
        if value['diseaseId'] == 'OMIM_311250':
            value['diseaseId'] = 'MONDO_0010703'
            value['term'] = 'ornithine carbamoyltransferase deficiency'
            value['description'] = 'Ornithine transcarbamylase deficiency (OTCD) is a disorder of urea cycle metabolism and ammonia detoxification (see this term) characterized by either a severe, neonatal-onset disease found almost exclusively in males, or later-onset (partial) forms of the disease. Both present with episodes of hyperammonemia that can be fatal and which can lead to neurological complications.'
        if value['diseaseId'] == 'OMIM_600906':
            value['diseaseId'] = 'MONDO_0010955'
            value['term'] = 'ectodermal dysplasia with mental retardation and syndactyly'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_600971':
            value['diseaseId'] = 'MONDO_0010965'
            value['term'] = 'autosomal recessive nonsyndromic deafness 6'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, stable hearing loss and has_material_basis_in mutation in the TMIE gene on chromosome 3p21.'
        if value['diseaseId'] == 'OMIM_601200':
            value['diseaseId'] = 'MONDO_0011014'
            value['term'] = 'pleuropulmonary blastoma'
            value['description'] = 'A malignant neoplasm affecting the lungs and/or the pleura. Pleuropulmonary blastoma is seen in children. Microscopically, the tumor may show features of chondrosarcoma, leiomyosarcoma, rhabdomyosarcoma, liposarcoma, or undifferentiated sarcoma. In approximately 25% of patients with pleuropulmonary blastoma, there are other lesions or neoplasms that may affect patients or their families, including lung or kidney cysts, and ovarian or testicular neoplasms. Heterozygous germline mutations in DICER1 gene have been identified in families harboring pleuropulmonary blastomas.'
        if value['diseaseId'] == 'OMIM_601780':
            value['diseaseId'] = 'MONDO_0011144'
            value['term'] = 'neuronal ceroid lipofuscinosis 6'
            value['description'] = 'A neuronal ceroid lipofuscinosis that is characterized by lipopigment patterns with mixed combinations of \'granular,\' \'curvilinear,\' and \'fingerprint\' profiles, progressive dementia, seizures, and progressive visual failure and has_material_basis_in homozygous mutation in the CLN6 gene on chromosome 15q21-q23.'
        if value['diseaseId'] == 'OMIM_602092':
            value['diseaseId'] = 'MONDO_0011192'
            value['term'] = 'autosomal recessive nonsyndromic deafness 18A'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, stable hearing loss and has_material_basis_in mutation in the USH1C gene on chromosome 11p15.'
        if value['diseaseId'] == 'OMIM_603720':
            value['diseaseId'] = 'MONDO_0011364'
            value['term'] = 'autosomal recessive nonsyndromic deafness 16'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, stable hearing loss and has_material_basis_in mutation in the STRC gene on chromosome 15q15.'
        if value['diseaseId'] == 'OMIM_603776':
            value['diseaseId'] = 'MONDO_0011369'
            value['term'] = 'hypercholesterolemia, autosomal dominant, 3'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_606693':
            value['diseaseId'] = 'MONDO_0011706'
            value['term'] = 'Kufor-Rakeb syndrome'
            value['description'] = 'Kufor-Rakeb syndrome (KRS) is a rare genetic neurodegenerative disorder characterized by juvenile Parkinsonism, pyramidal degeneration (dystonia), supranuclear palsy, and cognitive impairment.'
        if value['diseaseId'] == 'OMIM_606705':
            value['diseaseId'] = 'MONDO_0011708'
            value['term'] = 'autosomal dominant nonsyndromic deafness 36'
            value['description'] = 'An autosomal dominant nonsyndromic deafness that is characterized by postlingual onset with flat or gently downsloping audioprofiles and has_material_basis_in mutation in the TMC1 gene on chromosome 9q21.'
        if value['diseaseId'] == 'OMIM_607721':
            value['diseaseId'] = 'MONDO_0011899'
            value['term'] = 'Noonan syndrome-like disorder with loose anagen hair'
            value['description'] = 'Noonan-like syndrome with loose anagen hair (NS/LAH) is a Noonan-related syndrome, characterized by facial anomalies suggestive of Noonan syndrome (see this term); a distinctive hair anomaly described as loose anagen hair syndrome (see this term); frequent congenital heart defects; distinctive skin features with darkly pigmented skin, keratosis pilaris, eczema or occasional neonatal ichtyosis (see this term); and short stature, often associated with a GH deficiency and psychomotor delays.'
        if value['diseaseId'] == 'OMIM_608265':
            value['diseaseId'] = 'MONDO_0012003'
            value['term'] = 'autosomal recessive nonsyndromic deafness 39'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, downsloping hearing loss and has_material_basis_in mutation in the HGF gene on chromosome 7q21.'
        if value['diseaseId'] == 'OMIM_608456':
            value['diseaseId'] = 'MONDO_0012041'
            value['term'] = 'MUTYH-related attenuated familial adenomatous polyposis'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_609265':
            value['diseaseId'] = 'MONDO_0012233'
            value['term'] = 'Li-Fraumeni syndrome 2'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_610265':
            value['diseaseId'] = 'MONDO_0012460'
            value['term'] = 'autosomal recessive nonsyndromic deafness 67'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, stable hearing loss and has_material_basis_in mutation in the LHFPL5 gene on chromosome 6p21.'
        if value['diseaseId'] == 'OMIM_610688':
            value['diseaseId'] = 'MONDO_0012539'
            value['term'] = 'Joubert syndrome 6'
            value['description'] = 'A Joubert syndrome that has_material_basis_in homozygous or compound heterozygous mutation in the TMEM67 on chromosome 8q22.'
        if value['diseaseId'] == 'OMIM_611523':
            value['diseaseId'] = 'MONDO_0012683'
            value['term'] = 'pontocerebellar hypoplasia type 6'
            value['description'] = 'Pontocerebellar hypoplasia type 6 (PCH6) is a rare form of pontocerebellar hypoplasia (see this term) characterized clinically at birth by hypotonia, clonus, epilepsy impaired swallowing and from infancy by progressive microencephaly, spasticity and lactic acidosis.'
        if value['diseaseId'] == 'OMIM_613074':
            value['diseaseId'] = 'MONDO_0013114'
            value['term'] = 'autosomal dominant nonsyndromic deafness 50'
            value['description'] = 'An autosomal dominant nonsyndromic deafness that is characterized postlingual onset in the second decade of life with flat progressive hearing loss and has_material_basis_in mutation in the MIRN96 gene on chromosome 7q32.'
        if value['diseaseId'] == 'OMIM_613285':
            value['diseaseId'] = 'MONDO_0013210'
            value['term'] = 'autosomal recessive nonsyndromic deafness 25'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with moderate to profound, progressive hearing loss and has_material_basis_in mutation in the GRXCR1 gene on chromosome 4p13.'
        if value['diseaseId'] == 'OMIM_613307':
            value['diseaseId'] = 'MONDO_0013215'
            value['term'] = 'autosomal recessive nonsyndromic deafness 79'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with severe to profound, stable hearing loss and has_material_basis_in mutation in the TPRN gene on chromosome 9q34.'
        if value['diseaseId'] == 'OMIM_613453':
            value['diseaseId'] = 'MONDO_0013269'
            value['term'] = 'autosomal recessive nonsyndromic deafness 91'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that has_material_basis_in mutation in the SERPINB6 gene on chromosome 6p25.'
        if value['diseaseId'] == 'OMIM_613718':
            value['diseaseId'] = 'MONDO_0013386'
            value['term'] = 'autosomal recessive nonsyndromic deafness 74'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that has_material_basis_in mutation in the MSRB3 gene on chromosome 12q14.'
        if value['diseaseId'] == 'OMIM_613720':
            value['diseaseId'] = 'MONDO_0013387'
            value['term'] = 'KCNQ2-related epileptic encephalopathy'
            value['description'] = 'KCNQ2-related epileptic encephalopathy is a severe form of neonatal epilepsy that usually manifests in newborns during the first week of life with seizures (that affect alternatively both sides of the body), often accompanied by clonic jerking or more complex motor behavior, as well as signs of encephalopathy such as diffuse hypotonia, limb spasticity, lack of visual fixation and tracking and mild to moderate intellectual deficiency. The severity can range from controlled to intractable seizures and mild/moderate to severe intellectual disability.'
        if value['diseaseId'] == 'OMIM_613795':
            value['diseaseId'] = 'MONDO_0013426'
            value['term'] = 'aneurysm-osteoarthritis syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_613820':
            value['diseaseId'] = 'MONDO_0013442'
            value['term'] = 'nephronophthisis 12'
            value['description'] = 'A nephronophthisis that has_material_basis_in homozygous or compound heterozygous mutation in the TTC21B gene on chromosome 2q24.'
        if value['diseaseId'] == 'OMIM_613916':
            value['diseaseId'] = 'MONDO_0013489'
            value['term'] = 'autosomal recessive nonsyndromic deafness 89'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that has_material_basis_in mutation in the KARS gene on chromosome 16q23.'
        if value['diseaseId'] == 'OMIM_614152':
            value['diseaseId'] = 'MONDO_0013593'
            value['term'] = 'autosomal dominant nonsyndromic deafness 64'
            value['description'] = 'An autosomal dominant nonsyndromic deafness that has_material_basis_in mutation in the DIABLO gene on chromosome 12q24.'
        if value['diseaseId'] == 'OMIM_614861':
            value['diseaseId'] = 'MONDO_0013929'
            value['term'] = 'autosomal recessive nonsyndromic deafness 98'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that has_material_basis_in mutation in the TSPEAR gene on chromosome 21q22.'
        if value['diseaseId'] == 'OMIM_615191':
            value['diseaseId'] = 'MONDO_0014077'
            value['term'] = 'cobblestone lissencephaly without muscular or ocular involvement'
            value['description'] = 'Cobblestone lissencephaly without muscular or ocular involvement is a form of cobblestone lissencephaly characterized by a constellation of brain malformations which can either exist alone or in conjunction with minimal muscular and ocular abnormalities. The clinical features of the disease include severe developmental delay, increased head circumference, hydrocephalus and seizures.'
        if value['diseaseId'] == 'OMIM_615273':
            value['diseaseId'] = 'MONDO_0014109'
            value['term'] = 'NGLY1-deficiency'
            value['description'] = 'A carbohydrate metabolic disorder that has_material_basis_in homozygous or compound heterozygous mutation in the NGLY1 gene on chromosome 1p24. It is characterized by global developmental delay, hypotonia, abnormal involuntary movements, and alacrima or poor tear production.'
        if value['diseaseId'] == 'OMIM_615540':
            value['diseaseId'] = 'MONDO_0014237'
            value['term'] = 'autosomal recessive nonsyndromic deafness 76'
            value['description'] = 'An autosomal recessive nonsyndromic deafness that is characterized by prelingual onset with high frequency, progressive hearing loss and has_material_basis_in mutation in the SYNE4 gene on chromosome 19q13.'
        if value['diseaseId'] == 'OMIM_615991':
            value['diseaseId'] = 'MONDO_0014442'
            value['term'] = 'Bardet-Biedl syndrome 14'
            value['description'] = 'A Bardet-Biedl syndrome that has material basis in homozygous mutation in the CEP290 gene on chromosome 12q21.'
        if value['diseaseId'] == 'OMIM_615993':
            value['diseaseId'] = 'MONDO_0014444'
            value['term'] = 'Bardet-Biedl syndrome 16'
            value['description'] = 'A Bardet-Biedl syndrome that has material basis in homozygous or compound heterozygous mutations in the SDCCAG8 gene on chromosome 1q43.'
        if value['diseaseId'] == 'OMIM_616366':
            value['diseaseId'] = 'MONDO_0014607'
            value['term'] = 'epileptic encephalopathy, early infantile, 32'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_616583':
            value['diseaseId'] = 'MONDO_0014701'
            value['term'] = 'spondyloepiphyseal dysplasia, Stanescu type'
            value['description'] = ''
        if value['diseaseId'] == 'OMIM_617093':
            value['diseaseId'] = 'MONDO_0014911'
            value['term'] = 'growth retardation, intellectual developmental disorder, hypotonia, and hepatopathy; GRIDHH'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_100033':
            value['diseaseId'] = 'MONDO_0015048'
            value['term'] = 'hypomaturation amelogenesis imperfecta'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_1020':
            value['diseaseId'] = 'MONDO_0015140'
            value['term'] = 'early-onset autosomal dominant Alzheimer disease'
            value['description'] = 'Early-onset autosomal dominant Alzheimer disease (EOAD) is a progressive dementia with reduction of cognitive functions. EOAD presents the same phenotype as sporadic Alzheimer disease (AD) but has an early age of onset, usually before 60 years old.'
        if value['diseaseId'] == 'Orphanet_1037':
            value['diseaseId'] = 'MONDO_0015168'
            value['term'] = 'arthrogryposis multiplex congenita'
            value['description'] = 'Arthrogryposis multiplex congenita (AMC) is a group of disorders characterized by congenital limb contractures. It manifests as limitation of movement of multiple limb joints at birth that is usually non-progressive and may include muscle weakness and fibrosis. AMC is always associated with decreased intrauterine fetal movement which leads secondarily to the contractures.'
        if value['diseaseId'] == 'Orphanet_109007':
            value['diseaseId'] = 'MONDO_0015225'
            value['term'] = 'arthrogryposis syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_1333':
            value['diseaseId'] = 'MONDO_0015278'
            value['term'] = 'familial pancreatic carcinoma'
            value['description'] = 'Familial pancreatic carcinoma is defined by the presence of pancreatic cancer (PC) in two or more first-degree relatives.'
        if value['diseaseId'] == 'Orphanet_137':
            value['diseaseId'] = 'MONDO_0015286'
            value['term'] = 'congenital disorder of glycosylation'
            value['description'] = 'Congenital disorder of glycosylation (CDG) is a fast growing group of inborn errors of metabolism characterized by defective activity of enzymes that participate in glycosylation (modification of proteins and other macromolecules by adding and processing of oligosaccharide side chains). CDG is comprised of phenotypically diverse disorders affecting multiple systems including the central nervous system, muscle function, immunity, endocrine system, and coagulation. The numerous entities in this group are subdivided, based on the synthetic pathway affected, into disorder of protein N-glycosylation, disorder of protein O-glycosylation, disorder of multiple glycosylation, and disorder of glycosphingolipid and glycosylphosphatidylinositol anchor glycosylation (see these terms).'
        if value['diseaseId'] == 'Orphanet_145':
            value['diseaseId'] = 'MONDO_0015442'
            value['term'] = 'hereditary breast and ovarian cancer syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_154':
            value['diseaseId'] = 'MONDO_0014100'
            value['term'] = 'dilated cardiomyopathy 1KK'
            value['description'] = 'A dilated cardiomyopathy that has_material_basis_in mutation in the MYPN gene on chromosome 10q21.'
        if value['diseaseId'] == 'Orphanet_169147':
            value['diseaseId'] = 'MONDO_0015699'
            value['term'] = 'immunodeficiency due to a classical component pathway complement deficiency'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_169160':
            value['diseaseId'] = 'MONDO_0015703'
            value['term'] = 'T-b+ severe combined immunodeficiency due to CD3delta/CD3epsilon/CD3zeta'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_171430':
            value['diseaseId'] = 'MONDO_0015735'
            value['term'] = 'severe congenital nemaline myopathy'
            value['description'] = 'Severe congenital nemaline myopathy is a severe form of nemaline myopathy (NM; see this term) characterized by severe hypotonia with little spontaneous movement in neonates.'
        if value['diseaseId'] == 'Orphanet_181405':
            value['diseaseId'] = 'MONDO_0015896'
            value['term'] = 'rare hypoparathyroidism'
            value['description'] = 'Rare hypoparathyroidism.'
        if value['diseaseId'] == 'Orphanet_1934':
            value['diseaseId'] = 'MONDO_0016021'
            value['term'] = 'early infantile epileptic encephalopathy'
            value['description'] = 'Early infantile epileptic encephalopathy (EIEE), or Ohtahara syndrome, is one of the most severe forms of age-related epileptic encephalopathies, characterized by the onset of tonic spasms within the first 3 months of life that can be generalized or lateralized, independent of the sleep cycle and that can occur hundreds of times per day, leading to psychomotor impairment and death.'
        if value['diseaseId'] == 'Orphanet_227535':
            value['diseaseId'] = 'MONDO_0016419'
            value['term'] = 'hereditary breast cancer'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_2512':
            value['diseaseId'] = 'MONDO_0016660'
            value['term'] = 'autosomal recessive primary microcephaly'
            value['description'] = 'Autosomal recessive primary microcephaly (MCPH) is a rare genetically heterogeneous disorder of neurogenic brain development characterized by reduced head circumference at birth with no gross anomalies of brain architecture and variable degrees of intellectual impairment.'
        if value['diseaseId'] == 'Orphanet_26793':
            value['diseaseId'] = 'MONDO_0008723'
            value['term'] = 'very long chain acyl-CoA dehydrogenase deficiency'
            value['description'] = 'Very long-chain acyl-CoA dehydrogenase (VLCAD) deficiency (VLCADD) is an inherited disorder of mitochondrial long-chain fatty acid oxidation with a variable presentation including: cardiomyopathy, hypoketotic hypoglycemia, liver disease, exercise intolerance and rhabdomyolysis.'
        if value['diseaseId'] == 'Orphanet_279922':
            value['diseaseId'] = 'MONDO_0017210'
            value['term'] = 'infectious anterior uveitis'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_284963':
            value['diseaseId'] = 'MONDO_0007947'
            value['term'] = 'Marfan syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_285014':
            value['diseaseId'] = 'MONDO_0017311'
            value['term'] = 'rare disease with thoracic aortic aneurysm and aortic dissection'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_286':
            value['diseaseId'] = 'MONDO_0017314'
            value['term'] = 'Ehlers-Danlos syndrome, vascular type'
            value['description'] = 'Ehlers-Danlos syndrome type IV, also known as the vascular type of Ehlers-Danlos syndrome (EDS), is an inherited connective tissue disorder defined by characteristic facial features (acrogeria) in most patients, translucent skin with highly visible subcutaneous vessels on the trunk and lower back, easy bruising, and severe arterial, digestive and uterine complications, which are rarely, if at all, observed in the other forms of EDS.'
        if value['diseaseId'] == 'Orphanet_289586':
            value['diseaseId'] = 'MONDO_0017339'
            value['term'] = 'exfoliative ichthyosis'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_29072':
            value['diseaseId'] = 'MONDO_0017366'
            value['term'] = 'hereditary pheochromocytoma-paraganglioma'
            value['description'] = 'Hereditary paraganglioma-pheochromocytomas (PGL/PCC) are rare neuroendocrine tumors represented by paragangliomas (occurring in any paraganglia from the skull base to the pelvic floor) and pheochromocytomas (adrenal medullary paragangliomas; see this term).'
        if value['diseaseId'] == 'Orphanet_306':
            value['diseaseId'] = 'MONDO_0017615'
            value['term'] = 'benign familial infantile epilepsy'
            value['description'] = 'Benign familial infantile epilepsy (BFIE) is a genetic epileptic syndrome characterized by the occurrence of afebrile repeated seizures in healthy infants, between the third and eighth month of life.'
        if value['diseaseId'] == 'Orphanet_306498':
            value['diseaseId'] = 'MONDO_0017623'
            value['term'] = 'PTEN hamartoma tumor syndrome'
            value['description'] = 'mutation and the involvement of derivatives of all 3 germ cell layers, manifesting with hamartomas, overgrowth and neoplasia. Currently, subsets carrying clinical diagnoses of Cowden syndrome, Bannayan-Riley-Ruvalcaba syndrome, Proteus and Proteus-like syndromes and SOLAMEN syndrome (see these terms) belong to PHTS.'
        if value['diseaseId'] == 'Orphanet_369913':
            value['diseaseId'] = 'MONDO_0014190'
            value['term'] = 'combined oxidative phosphorylation defect type 17'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_443909':
            value['diseaseId'] = 'MONDO_0018630'
            value['term'] = 'hereditary nonpolyposis colon cancer'
            value['description'] = 'Hereditary nonpolyposis colon cancer (HNPCC) is a cancer-predisposing condition characterized by the development of colorectal cancer not associated with colorectal polyposis, endometrial cancer, and various other cancers (such as malignant epithelial tumor of ovary, gastric, biliary tract, small bowel, and urinary tract cancer) that are frequently diagnosed at an early age.'
        if value['diseaseId'] == 'Orphanet_453499':
            value['diseaseId'] = 'MONDO_0018681'
            value['term'] = 'neurodevelopmental disorder-craniofacial dysmorphism-cardiac defect-hip dysplasia syndrome'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_593':
            value['diseaseId'] = 'MONDO_0018943'
            value['term'] = 'myofibrillar myopathy (disease)'
            value['description'] = 'Myofibrillar myopathy (MFM) describes a group of skeletal and cardiac muscle disorders, defined by the disintegration of myofibrils and aggregation of degradation products into intracellular inclusions, and is typically clinically characterized by slowly-progressive muscle weakness, which initially involves the distal muscles, but is highly variable and that can affect the proximal muscles as well as the cardiac and respiratory muscles in some patients.'
        if value['diseaseId'] == 'Orphanet_716':
            value['diseaseId'] = 'MONDO_0009861'
            value['term'] = 'phenylketonuria'
            value['description'] = 'Phenylketonuria (PKU) is the most common inborn error of amino acid metabolism and is characterized by mild to severe mental disability in untreated patients.'
        if value['diseaseId'] == 'Orphanet_768':
            value['diseaseId'] = 'MONDO_0019171'
            value['term'] = 'familial long QT syndrome'
            value['description'] = 'Congenital long QT syndrome (LQTS) is a hereditary cardiac disease characterized by a prolongation of the QT interval at basal ECG and by a high risk of life-threatening arrhythmias.'
        if value['diseaseId'] == 'Orphanet_93545':
            value['diseaseId'] = 'MONDO_0019719'
            value['term'] = 'renal or urinary tract malformation'
            value['description'] = ''
        if value['diseaseId'] == 'Orphanet_98497':
            value['diseaseId'] = 'MONDO_0020127'
            value['term'] = 'genetic peripheral neuropathy'
            value['description'] = 'Genetic peripheral neuropathy.'
