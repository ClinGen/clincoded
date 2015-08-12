# UI Manual Regression Testing

For now, we’ll need to manually do regression testing when making UI-impacting changes. This document goes over the minimum procedure to do this. All links in this document assume you’re running clincoded locally (localhost:6543).

This document needs to be kept up to date as we make UI changes.

## Creating a new Gene/Disease record
1. Go to the [Dashboard](http://localhost:6543/dashboard/) while logged in.
2. Click [Create Gene-Disease Record](http://localhost:6543/create-gene-disease/) to go to the [Create Gene-Disease Record](http://localhost:6543/create-gene-disease/) page.
3. Enter a gene and disease that you know exists in our DB, but which don’t match any GDMs in our DB — the placeholder text works fine.
4. Enter anything from the Method of Inheritance dropdown.
5. Click **Submit**.
6. On a successful submit, you should now find yourself at the [Curation Central](http://localhost:6543/curation-central/) page, with ```?gdm=``` as a query string in the URL, with the automatically generated UUID of the GDM you just created. The dark-gray banner should show the gene, disease, and mode you chose on the last page. The segmented banner below that should show information about the gene you selected on the left, information about the disease you selected in the middle with an empty OMIM ID, and a **Created** status and your personal information on the right.

## Setting the OMIM ID

1. In the middle segment, click **Add** on the **OMIM ID** line.
2. In the modal dialog, enter any random number and click the **Add/Change OMIM ID** button.
3. The number you entered should now appear on the **OMIM ID** line.
4. Refresh your browser. The OMIM ID you entered should still appear.

## Adding a new article

1. Click the **Add New PMID(s)** button on the left. A modal dialog appears asking for a PMID ID.
2. Enter the PMID ID of an article not in our DB — **123** works fine.
3. Click the **Add Article** button.
3. The article corresponding to the PMID ID you entered should then appear and be selected (white background) on the left below the **Add Article** button. Also the Curator Palette on the right should appear with empty **Group** and **Family** sections, and with **Evidence for** and the PMID ID you selected in the palette header.

## Adding a group

1. Click the **Group +** button on the right. You then see the **Curate Group Information** page.
2. Enter a group name — anything will do.
3. Enter a disease on the **Disease in Common** line. Use something that’s in our DB already. The placeholder text example works fine.
4. Scroll down to the **Group Information** panel and enter any numbers in the required fields.
5. Scroll down to the bottom of the page and click **Submit**.
6. You should be taken back to the [Curation Central](http://localhost:6543/curation-central/).
1. Click the article you created earlier on the left. The Curator Palette should appear on the right, but this time with the group you created appearing below the **Group +** button.
2. Click the **View** link. A new tab/window appears where you can check that the information you entered really is in this group.
3. Close the new tab/window.

## Adding a family that’s included in your group

2. In the Curator Palette, click the **Add family information** link under the group you created. You then see the **Curate Family Information** page.
3. Enter a family name — anything will do.
3. Enter a disease on the **Disease in Common** line. Use something that’s in our DB already. The placeholder text example works fine.
4. Scroll to the bottom and choose a non-zero value for the **Number of extra identical Families to make** line. **1** or **2** would be best so you don’t have so many names to fill in.
5. In the fields that appear — one for each extra family you specified in the last step — enter any names you like. Unique names make it less awkward later, but they don’t have to be unique.
6. Click the **Save** button at the bottom. You go back to the Curation Central page.
7. Click the article you created on the left.
8. The Curator Palette on the right should show the group you created, as well as one entry for every family you created.

