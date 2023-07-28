import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";

import { HatenaBookmarkBot } from "./lib/hatenaBookmarkBot";
import { bulkInsert } from "./lib/firestore";
import { BskyClient } from "./lib/bskyClient";
import { postHatenaBookmark } from "./lib/hatenaBookmark";

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const hatenaBookmarkRef = db
  .collection("v1")
  .doc("hatenaBookmark")
  .collection("razokulover");

export const scrapingJob = functions
  .runWith({ memory: "128MB" })
  .pubsub.schedule("*/30 * * * *")
  .onRun(async (_) => {
    const scrapingBookmarks = async () => {
      const contents = await HatenaBookmarkBot.scrapingBookmarks();
      await bulkInsert(hatenaBookmarkRef, contents);
    };

    try {
      await Promise.all([scrapingBookmarks()]);
    } catch (e) {
      console.log(e);
    }
  });

export const postJob = functions
  .runWith({ memory: "128MB" })
  .pubsub.schedule("*/05 * * * *")
  .onRun(async (_) => {
    const runHatenaBookmark = async () => {
      const client = await BskyClient.createAgent({
        identifier: defineString("BSKY_ID").value(),
        password: defineString("BSKY_PASSWORD").value(),
      });
      await postHatenaBookmark(hatenaBookmarkRef, client);
    };

    try {
      await Promise.all([runHatenaBookmark()]);
    } catch (e) {
      console.log(e);
    }
  });
