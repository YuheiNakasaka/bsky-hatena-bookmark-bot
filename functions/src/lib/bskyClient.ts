import * as sharp from "sharp";
import { AppBskyFeedPost, AppBskyRichtextFacet, BskyAgent } from "@atproto/api";
import { Content } from "./hatenaBookmarkBot";

export class BskyClient {
  private service = "https://bsky.social";
  agent: BskyAgent;
  private constructor() {
    this.agent = new BskyAgent({ service: this.service });
  }

  public static async createAgent({
    identifier,
    password,
  }: {
    identifier: string;
    password: string;
  }): Promise<BskyClient> {
    const client = new BskyClient();
    await client.agent.login({ identifier, password });
    return client;
  }

  public async post({
    text,
    facets,
    embed,
  }: {
    text: string;
    facets?: AppBskyRichtextFacet.Main[];
    embed?: AppBskyFeedPost.Record["embed"];
  }): Promise<{ cid: string; uri: string }> {
    const postParams: AppBskyFeedPost.Record = {
      $type: "app.bsky.feed.post",
      text,
      facets,
      createdAt: new Date().toISOString(),
    };
    if (embed) {
      postParams.embed = embed;
    }
    return await this.agent.post(postParams);
  }

  public async getOgImageFromUrl(url: string): Promise<Uint8Array | null> {
    try {
      const resp = await fetch(url);
      const buffer = await resp.arrayBuffer();
      const compressedImage = await sharp(buffer)
        .resize(800, null, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
        })
        .toBuffer();

      return new Uint8Array(compressedImage);
    } catch (e) {
      return null;
    }
  }

  public async uploadImage({
    image,
    encoding,
  }: {
    image: Uint8Array;
    encoding: string;
  }) {
    const response = await this.agent.uploadBlob(image, {
      encoding,
    });
    return response.data.blob;
  }

  public createRichText(item: Content): {
    text: string;
    facets: AppBskyRichtextFacet.Main[];
  } {
    const encoder = new TextEncoder();
    const text = `${item.comment != "" ? item.comment : "👀"} / "${
      item.title
    } " `.slice(0, 299);
    const byteStart = encoder.encode(text).byteLength;
    const byteEnd = byteStart + encoder.encode(item.link).byteLength;
    return {
      text: `${text}${item.link}`,
      facets: [
        {
          index: {
            byteStart,
            byteEnd,
          },
          features: [{ $type: "app.bsky.richtext.facet#link", uri: item.link }],
        },
      ],
    };
  }

  public async createEmbed(
    item: Content
  ): Promise<AppBskyFeedPost.Record["embed"] | null> {
    if (item.ogImg && item.ogImg != "") {
      const blob = await this.getOgImageFromUrl(item.ogImg);
      if (blob) {
        const uploadedImage = await this.uploadImage({
          image: blob,
          encoding: "image/jpeg",
        });
        const embed: AppBskyFeedPost.Record["embed"] = {
          $type: "app.bsky.embed.external",
          external: {
            uri: item.link,
            thumb: {
              $type: "blob",
              ref: {
                $link: uploadedImage.ref.toString(),
              },
              mimeType: uploadedImage.mimeType,
              size: uploadedImage.size,
            },
            title: item.title,
            description: item.ogText,
          },
        };
        return embed;
      } else {
        const embed: AppBskyFeedPost.Record["embed"] = {
          $type: "app.bsky.embed.external",
          external: {
            uri: item.link,
            title: item.title,
            description: item.ogText,
          },
        };
        return embed;
      }
    }
    return null;
  }
}
