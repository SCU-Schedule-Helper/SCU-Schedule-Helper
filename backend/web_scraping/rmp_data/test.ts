import {convert} from "html-to-text"

async function main() {
    const link = "https://www.scu.edu/cas/anthropology/news-and-events/stories/dr-robin-nelson-has-been-awarded-a-wenner-gren-engaged-anthropology-grant.html"
    const html = await (await fetch(link)).text();
    const text = convert(html);
    console.log(text);
}

main();