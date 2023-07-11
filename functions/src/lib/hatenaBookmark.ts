import { getUntweetedItem, updateTweetedFlag } from "./firestore";
import { Content } from "./hatenaBookmarkBot";
import { BskyClient } from "./bskyClient";

export const postHatenaBookmark = async (
  collectionRef: FirebaseFirestore.CollectionReference,
  client: BskyClient
) => {
  const snapshot = await getUntweetedItem(collectionRef);
  if (snapshot.empty) {
    return;
  }
  const doc = snapshot.docs.at(0)!;
  const item = doc.data() as Content;
  const { text, facets } = client.createRichText(item);
  const embed = await client.createEmbed(item);
  const postParams = embed ? { text, facets, embed } : { text, facets };
  await client.post(postParams);

  await updateTweetedFlag(doc, true);
};
