import { parse } from "node-html-parser";
import * as Parser from "rss-parser";

export type Content = {
  title: string;
  link: string;
  comment?: string;
  ogImg?: string;
  ogText?: string;
};

export class HatenaBookmarkBot {
  static async scrapingBookmarks(): Promise<Content[]> {
    const baseURL = "https://b.hatena.ne.jp";
    const category = "razokulover";

    return [
      ...(await HatenaBookmarkBot.fetchContents(
        `${baseURL}/${category}/bookmark.rss`
      )),
    ].reverse();
  }

  static async fetchContents(url: string): Promise<Content[]> {
    const parser1 = new Parser({
      // NOTE: デフォルトだと取得できないdc:subjectのタグの値を配列で取得するために設定
      customFields: {
        item: [["dc:subject", "subjects", { keepArray: true }]],
      },
    });
    const feed = await parser1.parseURL(url);
    const contents: Content[] = feed.items
      .filter((item: any) => {
        // NOTE: blueskyタグがついているものは除外する
        const tags = item["subjects"] || [];
        return tags.length > 0 && tags.includes("bluesky");
      })
      .map((item: any) => {
        const html = parse(item["content:encoded"]);
        const ogImg = html
          .querySelectorAll("img")
          .map((e) => e.getAttribute("src"))
          .filter(
            (e) =>
              e !== null &&
              e?.match(/https:\/\/cdn-ak-scissors\.b\.st-hatena\.com/)
          )
          .map((e) => e?.replace(/^https.*width=\d+\//, ""))
          .map((e) => decodeURIComponent(e || ""))
          .filter((e) => e !== "");
        const ogText = html
          .querySelectorAll("p")
          .map((e) => e.innerText)
          .filter((e) => e != "")
          .join("");
        return {
          title: item["title"],
          link: item["link"],
          comment: item["content"] || "",
          ogImg: ogImg[0] || "",
          ogText: ogText || "" || "",
        };
      });
    return contents;
  }
}
