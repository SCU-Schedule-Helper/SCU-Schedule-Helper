import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { convert } from "html-to-text";
import OpenAI from "openai";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

const aggregateEvals = JSON.parse(readFileSync("./data/aggregate_evals.json", "utf-8"));
const profNames = Object.entries(aggregateEvals).filter(([_, evalData]: [string, any]) =>
    evalData.type && evalData.type == "prof"
).map(([name, _]) => name);

type SearchPhaseOutput = {
    urls: string[];
};

type ProfilePhaseOutput = {
    race: string;
    age: number;
    gender: "M" | "F" | "Non-binary/Other";
};

type AggregatedOutput = Record<
    string,
    {
        race: string;
        age: number;
        gender: "M" | "F" | "Non-binary/Other";
    }
>;

/**
 * Phase 1: For a professor, run a web-search-enabled request that returns up to 3 scu.edu links.
 */
async function searchProfessor(profName: string): Promise<SearchPhaseOutput> {
    const response = await openai.responses.parse({
        model: "gpt-5-mini",
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: `Find up to 3 URLs on scu.edu that contain information and ideally images of the following professor: "${profName}". Only return links on the scu.edu domain.`,
                    },
                ],
            },
        ],
        metadata: {
            profName,
            phase: "search",
        },
        tools: [
            {
                type: "web_search",
                filters: { allowed_domains: ["scu.edu"] },
                user_location: {
                    type: "approximate",
                    country: "US",
                    region: "California",
                    city: "Santa Clara",
                },
            },
        ],
        tool_choice: "auto",
        text:
        {
            format: {
                type: "json_schema",
                name: "scu_prof_search",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        urls: {
                            type: "array",
                            items: {
                                type: "string",
                            },
                            maxItems: 3,
                        },
                    },
                    required: ["urls"],
                    additionalProperties: false,
                }
            }
        }
    });
    console.log(JSON.stringify(response.output_parsed, null, 2));
    if (!response.output_parsed) {
        throw new Error("No parsed output from searchProfessor");
    }

    const parsed = response.output_parsed! as SearchPhaseOutput;
    return parsed;
}

/**
 * Helper: fetch HTML and extract image URLs (very naive example).
 */
async function fetchPageAndImages(url: string): Promise<{
    html: string;
    imageUrls: string[];
}> {
    const res = await fetch(url);
    const html = await res.text();

    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const imageUrls = Array.from(html.matchAll(imgRegex)).map(m => {
        if (m[1]!.startsWith("/")) {
            return new URL(m[1]!, url).toString();
        }
        return null;
    }).filter((url): url is string => url !== null);

    return { html, imageUrls };
}

/**
 * Phase 2: Build text content + upload images, then ask model for nationality/age/gender.
 */
async function buildProfileFromLinks(
    profName: string,
    urls: string[]
): Promise<ProfilePhaseOutput | null> {
    const pages = await Promise.all(
        urls.map(async (url) => {
            const { html, imageUrls } = await fetchPageAndImages(url);
            const textContent = convert(html);
            return { url, textContent, imageUrls };
        })
    );

    // Upload up to a few images total to keep things reasonable
    const imageUrls: string[] = pages.flatMap(p => p.imageUrls).slice(0, 5);

    console.log("Using images:\n" + imageUrls.join("\n"));

    const combinedText = pages
        .map(
            (p) =>
                `URL: ${p.url}\n\nCONTENT:\n${p.textContent}`
        )
        .join("\n\n---\n\n");

    const response = await openai.responses.parse({
        model: "gpt-5-mini",
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text:
                            `Professor name: ${profName}\n\n` +
                            `Below is text extracted from SCU pages about this professor.\n` +
                            `Use it, web search, and any provided images to estimate:\n` +
                            `- race (string)\n` +
                            `- age (number, approximate allowed)\n` +
                            `- gender (M, F, or Non-binary/Other).\n\n` +
                            `TEXT DATA:\n` +
                            combinedText,
                    },
                    // Attach image files if any
                    ...(imageUrls.map((url) => ({
                        type: "input_image",
                        image_url: url,
                        detail: "auto",
                    })) as ResponseInputImage[]),
                ],
            },

        ],
        metadata: {
            profName,
            phase: "profile",
        },
        tools: [
            {
                type: "web_search",
                user_location: {
                    type: "approximate",
                    country: "US",
                    region: "California",
                    city: "Santa Clara",
                },
            },
        ],
        tool_choice: "auto",
        text:
        {
            format: {
                type: "json_schema" as const,
                name: "scu_prof_profile",
                schema: {
                    type: "object",
                    properties: {
                        race: {
                            enum: [
                                "American Indian/Alaska Native",
                                "South Asian",
                                "Southeast Asian",
                                "East Asian",
                                "Black or African American",
                                "Hispanic or Latino",
                                "Native Hawaiian or other Pacific Islander",
                                "White (including Middle Eastern)",
                            ]
                        },
                        age: { type: "number" },
                        gender: {
                            type: "string",
                            enum: ["M", "F", "Non-binary/Other"],
                        },
                    },
                    required: ["race", "age", "gender"],
                    additionalProperties: false,
                },
                strict: true,
            },
        }
    });
    console.log(JSON.stringify(response.output_parsed, null, 2));
    const content = response.output_parsed! as ProfilePhaseOutput;
    return content;
}

/**
 * Pipeline for a single professor.
 */
async function processProfessor(
    profName: string
): Promise<{ name: string; profile: ProfilePhaseOutput | null }> {
    const search = await searchProfessor(profName);
    if (!search.urls) {
        return { name: profName, profile: null };
    }

    const profile = await buildProfileFromLinks(profName, search.urls);
    return { name: profName, profile };
}

/**
 * Run 20 at a time using Promise.all, then write final JSON.
 */
async function main() {
    const aggregated: AggregatedOutput = {};

    // chunk into groups of 20
    const chunkSize = 1;
    for (let i = 0; i < profNames.length; i += chunkSize) {
        const chunk = profNames.slice(i, i + chunkSize);

        const results = await Promise.all(
            chunk.map((name) => processProfessor(name))
        );

        for (const r of results) {
            if (r.profile) {
                aggregated[r.name] = {
                    race: r.profile.race,
                    age: r.profile.age,
                    gender: r.profile.gender,
                };
            }
        }
    }

    const outPath = join(process.cwd(), "scu-professor-demographics.json");
    writeFileSync(outPath, JSON.stringify(aggregated, null, 2), "utf-8");
    console.log(`Wrote ${Object.keys(aggregated).length} records to ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
