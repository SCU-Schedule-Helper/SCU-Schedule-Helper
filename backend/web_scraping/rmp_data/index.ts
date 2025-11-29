import { readFileSync, writeFileSync } from "fs";
import type { ExtendedProfessorRating, ProfessorRating, RmpDataset, RmpTeacher } from "./types.ts";
import { scrapeProfessor } from "./scrape_professor.ts";
import type { Browser, Page } from "puppeteer-core";
import { launch } from "puppeteer";

const professorNameMappings: { [key: string]: string } = JSON.parse(
    readFileSync("./data/professor_name_mappings.json", "utf-8")
);

const edgecases = {
    // Not mismatches: names whose query results would normal be marked as mismatches but are actually correct.
    not_mismatches: new Set([
        "dongsoo shin",
        "gaby greenlee",
        "tom blackburn",
        "alexander field",
        "sean okeefe",
        "william stevens",
        "margaret hunter",
        "charles gabbe",
        "jacquelyn hendricks",
        "wenxin xie",
        ". sunwolf",
    ]),
    name_transformations: new Map([
        ["hsin-i" + "cheng", "hsin cheng"],
        ["alexander" + "field", "alexandar field"],
        ["gaby" + "greenlee", "gabrielle greenlee"],
        ["shiva" + "houshmand yazdi", "shiva houshmand"],
        ["dongsoo" + "shin", "dongsu shin"],
        ["tom" + "blackburn", "thomas blackburn"],
        ["sean" + "okeefe", "sean o''keefe"],
        ["sean" + "o'keefe", "sean o''keefe"],
        ["william" + "stevens", "bill stevens"],
        ["margaret" + "hunter", "maggie hunter"],
        ["charles" + "gabbe", "cj gabbe"],
        ["jacquelyn" + "hendricks", "jackie hendricks"],
        ["wenxin" + "xie", "victoria xie"],
        ["." + "sunwolf", "none sunwolf"],
        ["michele" + "parker", "michelle parker"],
        ["sarita" + "tamayo-moraga", "sarita tomayo-moraga"],
        ["philip" + "riley", "phillip riley"],
        ["matthew" + "salazar-thompson", "matthew salazar"],
        ["james" + "burns", "jim burns"],
        ["wei" + "shi", "savannah shi"],
        ["rajiv" + "kapur", "kapur rajiv"],
        ["mahmoud" + "amouzgar", "moe amouzgar"],
        ["t." + "calvin tszeng", "calvin tszeng"],
        ["janice" + "edgerly rooks", "janice edgerly"],
        ["tracey" + "kahan", "tracy kahan"],
        ["katherine" + "page", "kate page"],
        ["robert" + "michels", "bob michels"],

    ]),
    actual_mismatches: new Set(["eun park"]),
};

function findClosingBrace(str: string, openingBraceIndex: number) {
    let closingBraceIndex = openingBraceIndex + 1;
    let braceCount = 1;
    while (braceCount > 0 && closingBraceIndex < str.length) {
        closingBraceIndex++;
        if (str[closingBraceIndex] == "{") braceCount++;
        if (str[closingBraceIndex] == "}") braceCount--;
    }
    return closingBraceIndex;
}

async function getHtml(url: string) {
    const response = await fetch(url);
    return await response.text();
}

async function scrapeProfessorPage(profId: string | number, debuggingEnabled = false): Promise<ProfessorRating> {
    if (typeof profId === "number") profId = profId.toString();
    const url = `https://www.ratemyprofessors.com/professor/${profId}`;
    if (debuggingEnabled) console.log("Querying " + url + "...");
    return scrapeProfessor(url, debuggingEnabled);
}

async function scrapeRmpRatings(profName: string, debuggingEnabled = false): Promise<RmpTeacher[]> {
    profName = profName.replace(" ", "%20");
    const url = `https://www.ratemyprofessors.com/search/professors/882?q=${profName}`;
    const teachers: RmpTeacher[] = [];
    if (debuggingEnabled) console.log("Querying " + url + "...");

    const html = await getHtml(url);
    let indexOfTeacher = html.indexOf('"__typename":"Teacher"');
    let indexOfSchool = html.indexOf('"__typename":"School"');
    // Find SCU school id.
    let schoolId: string | -1 = -1;
    while (indexOfSchool != -1) {
        const openingBraceIndex = html.lastIndexOf("{", indexOfSchool);
        const closingBraceIndex = findClosingBrace(html, openingBraceIndex);
        const schoolInfoString = html.substring(
            openingBraceIndex,
            closingBraceIndex + 1
        );
        const schoolData = JSON.parse(schoolInfoString) as { id?: string; name?: string };
        if (schoolData.name == "Santa Clara University") {
            schoolId = schoolData.id!;
            break;
        }
        indexOfSchool = html.indexOf('"__typename":"School"', indexOfSchool + 1);
    }
    // If the schoolId is not found, then it means there are no SCU teachers in the query results.
    if (schoolId == -1) {
        return teachers;
    }
    while (indexOfTeacher != -1) {
        // Extract teacher info into JSON object.
        const openingBraceIndex = html.lastIndexOf("{", indexOfTeacher);
        const indexOfSaved = html.indexOf("isSaved", indexOfTeacher);
        const closingBraceIndex = html.indexOf("}", indexOfSaved);
        const teacherInfoString = html.substring(
            openingBraceIndex,
            closingBraceIndex + 1
        );
        let teacherData = JSON.parse(teacherInfoString) as RmpTeacher;
        if (debuggingEnabled) console.log(teacherData);
        // Check if teacher is from SCU.
        if (teacherData.school && teacherData.school.__ref == schoolId) {
            teachers.push(teacherData);
        }
        // Find next teacher.
        indexOfTeacher = html.indexOf('"__typename":"Teacher"', indexOfTeacher + 1);
    }
    return teachers;
}

export async function getRmpRatings(rawProfName: string, debuggingEnabled = false): Promise<ExtendedProfessorRating | undefined> {
    let profName = rawProfName.trim();
    // Empirical testing showed that including middle names in the query does not improve accuracy.
    // Therefore, we only query by the first first name and the last last name.
    if (professorNameMappings?.[profName]) {
        profName = professorNameMappings[profName] as string;
    }
    let realFirstName = profName
        .substring(0, profName.indexOf(" "))
        .trim()
        .toLowerCase();
    let lastName = profName
        .substring(profName.indexOf(" ") + 1)
        .trim()
        .toLowerCase();
    if (debuggingEnabled)
        console.log("Querying RMP for " + realFirstName + " " + lastName);
    // Find preferred first name, if it exists.
    let preferredFirstName = "";
    const barIndex = profName.indexOf("|");
    if (barIndex != -1) {
        preferredFirstName = profName
            .substring(barIndex + 1, profName.indexOf(" ", barIndex + 2))
            .trim()
            .toLowerCase();
    }
    let data: RmpTeacher[] | null = null;

    // If this is a special case, query instead by the special name in the edge cases file.
    if (edgecases.name_transformations.has(realFirstName + lastName)) {
        const transformedName = edgecases.name_transformations.get(
            realFirstName + lastName
        );
        if (transformedName) {
            data = await scrapeRmpRatings(transformedName, debuggingEnabled);
            realFirstName = transformedName
                .substring(0, transformedName.indexOf(" "))
                .trim();
            lastName = transformedName
                .substring(transformedName.lastIndexOf(" "))
                .trim();
        }
    }

    // Otherwise, query first by last name.
    data =
        data == null ? await scrapeRmpRatings(lastName, debuggingEnabled) : data;
    let entry: RmpTeacher | undefined = undefined;
    if (data.length == 1) entry = data[0];
    if (data.length > 1) {
        if (debuggingEnabled) console.log("Error: too much data!");
        for (let j = 0; j < data.length; j++) {
            if (
                ((data[j]?.firstName?.toLowerCase().includes(realFirstName) || realFirstName.includes(data[j]?.firstName?.toLowerCase()!)) ||
                    (preferredFirstName && (data[j]?.firstName?.toLowerCase().includes(preferredFirstName) || preferredFirstName.includes(data[j]?.firstName?.toLowerCase()!))))
                && (data[j]?.lastName?.toLowerCase().includes(lastName) || lastName.includes(data[j]?.lastName?.toLowerCase()!))
            ) {
                entry = data[j];
                break;
            }
        }
    }

    // Query again using preferred first name if no data found.
    if (entry == null && preferredFirstName != "") {
        data = await scrapeRmpRatings(
            preferredFirstName + " " + lastName,
            debuggingEnabled
        );
        if (data.length == 1) {
            entry = data[0];
            if (debuggingEnabled) console.log("Fixed by using preferred first name!");
        } else if (data.length > 1) {
            if (debuggingEnabled)
                console.log("Multiple data after using preferred first name!");
            for (let j = 0; j < data.length; j++) {
                if (
                    ((data[j]?.firstName?.toLowerCase().includes(realFirstName) || realFirstName.includes(data[j]?.firstName?.toLowerCase()!)) ||
                        (preferredFirstName && (data[j]?.firstName?.toLowerCase().includes(preferredFirstName) || preferredFirstName.includes(data[j]?.firstName?.toLowerCase()!))))
                    && (data[j]?.lastName?.toLowerCase().includes(lastName) || lastName.includes(data[j]?.lastName?.toLowerCase()!))
                ) {
                    if (debuggingEnabled)
                        console.log("Fixed by using preferred first name!");
                    entry = data[j];
                    break;
                }
            }
        }
    }
    // Query again using real first name if no data found.
    if (entry == null) {
        data = await scrapeRmpRatings(
            realFirstName + " " + lastName,
            debuggingEnabled
        );
        if (data.length == 1) {
            entry = data[0];
            if (debuggingEnabled) console.log("Fixed by using real first name!");
        } else if (data.length > 1) {
            if (debuggingEnabled)
                console.log("Multiple data after using real first name!");
            for (let j = 0; j < data.length; j++) {
                if (
                    ((data[j]?.firstName?.toLowerCase().includes(realFirstName) || realFirstName.includes(data[j]?.firstName?.toLowerCase()!)) ||
                        (preferredFirstName && (data[j]?.firstName?.toLowerCase().includes(preferredFirstName) || preferredFirstName.includes(data[j]?.firstName?.toLowerCase()!))))
                    && (data[j]?.lastName?.toLowerCase().includes(lastName) || lastName.includes(data[j]?.lastName?.toLowerCase()!))
                ) {
                    if (debuggingEnabled) console.log("Fixed by using real first name!");
                    entry = data[j];
                    break;
                }
            }
        }
    }
    if (debuggingEnabled && entry == null) {
        console.log("Error: still no data for " + profName);
    }

    // Check for first name or last name mismatches, and do not return if there is a mismatch.
    if (entry != null) {
        const firstNameReceived = entry.firstName?.toLowerCase() || "";
        const lastNameReceived = entry.lastName?.toLowerCase() || "";
        if (
            !firstNameReceived.includes(realFirstName) &&
            !realFirstName.includes(firstNameReceived) &&
            (preferredFirstName == "" ||
                (preferredFirstName != "" &&
                    !firstNameReceived.includes(preferredFirstName) &&
                    !preferredFirstName.includes(firstNameReceived))) &&
            !edgecases.not_mismatches.has(realFirstName + " " + lastName)
        ) {
            if (debuggingEnabled)
                console.log(
                    "Error: first name mismatch\nOurs:",
                    realFirstName,
                    preferredFirstName,
                    lastName,
                    "\nRMP:",
                    firstNameReceived,
                    lastNameReceived
                );
            entry = undefined;
        }
        if (
            !lastNameReceived.includes(lastName) &&
            !lastName.includes(lastNameReceived) &&
            !edgecases.not_mismatches.has(realFirstName + " " + lastName)
        ) {
            if (debuggingEnabled)
                console.log(
                    "Error: last name mismatch\nOurs:",
                    realFirstName,
                    preferredFirstName,
                    lastName,
                    "\nRMP:",
                    firstNameReceived,
                    lastNameReceived
                );
            entry = undefined;
        }
        if (edgecases.actual_mismatches.has(realFirstName + " " + lastName)) {
            entry = undefined;
        }
    }
    if (entry) {
        const professorRating = await scrapeProfessorPage(entry.legacyId, debuggingEnabled);
        return {
            ...professorRating,
            originalName: rawProfName,
            link: `https://www.ratemyprofessors.com/professor/${entry.legacyId}`,
        }
    }
    return undefined;
}

export let browserInstance: Browser | null = null;
export let pageInstance: Page | null = null;

async function main() {
    const debuggingEnabled = true;
    const aggregateEvals = JSON.parse(readFileSync("./data/aggregate_evals.json", "utf-8"));
    const names = Object.entries(aggregateEvals).filter(([_, evalData]: [string, any]) =>
        evalData.type && evalData.type == "prof"
    ).map(([name, _]) => name);
    console.log("Total professors to scrape:", names.length);
    browserInstance = await launch({
        // headless: false,
        // args: ["--window-size=1920,1080"]
    });
    pageInstance = await browserInstance.newPage();
    pageInstance.setViewport({ width: 1920, height: 1080 });
    const result: RmpDataset = {
        profRatings: [] as ProfessorRating[],
        profsWithNoRatings: [] as string[],
    };
    for (let i = 0; i < names.length; i++) {
        const name = names[i]!;
        console.log(`Scraping ratings for ${name} (${i + 1}/${names.length})...`);
        const ratingResult = await getRmpRatings(name, debuggingEnabled).catch((err) => {
            console.log("Error scraping " + name + ": " + err);
            return undefined;
        });
        if (ratingResult == undefined) {
            console.log("No result for " + name);
            result.profsWithNoRatings.push(name);
            continue;
        }
        result.profRatings.push(ratingResult);
        await new Promise(r => setTimeout(r, 13000)); // 13 second delay between queries
        // Save partial results every 10 professors
        if (i % 10 === 0) {
            writeFileSync("./data/rmp_dataset_partial1.json", JSON.stringify(result), "utf-8");
        }
    }
    writeFileSync("./data/rmp_dataset1.json", JSON.stringify(result), "utf-8");
    await browserInstance.close();
}

if (require.main === module) {
    main();
}