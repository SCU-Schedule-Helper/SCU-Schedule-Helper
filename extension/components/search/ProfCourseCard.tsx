import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import { CalendarMonth as CalendarMonthIcon } from "@mui/icons-material";
import FriendCoursesTooltip from "./FriendCoursesTooltip";
import EvalStats from "./EvalStats";
import StatsWithLessFormatting from "./StatsWithLessFormatting";
import RmpStats from "./RmpStats";
import RecentTermsToolTip from "./RecentTermsToolTip";
import ProfessorRecencyIndicator from "./ProfessorRecencyIndicator";
import SortingMetricPicker from "./SortingMetricPicker";
import {
  CourseData,
  EvalsData,
  Evaluation,
  ProfessorCourseEvaluation,
  ProfessorData,
} from "../../public/utils/types";
import { COURSE_TAKEN_PATTERN, INTERESTED_SECTION_PATTERN } from "../../public/utils/constants";

export const SortingMetrics = Object.freeze({
  overall: "Overall",
  quality: "Quality",
  difficulty: "Difficulty",
  workload: "Workload",
});

export type SelectedProfOrCourse = {
  id: string;
  label: string,
  groupLabel: string,
} & (ProfessorData | CourseData);

interface Props {
  selected: SelectedProfOrCourse | null;
  data: EvalsData | null;
  onPageNavigation: (selectedId: string) => void;
}

interface FriendData {
  friendTakenInfos: string[];
  friendInterestedInfos: string[];
}

export default function ProfCourseCard({
  selected,
  data,
  onPageNavigation,
}: Props) {
  if (!selected || !data) return null;
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [friendData, setFriendData] = useState<FriendData | null>(null);
  const [profDepts, setProfDepts] = useState<string[]>([]);
  const [sortingMetric, setSortingMetric] = useState<string>(SortingMetrics.overall);
  const [sortDescending, setSortDescending] = useState(true);
  const [profDeptAvgs, setProfDeptAvgs] = useState<{
    qualityAvgs: number[];
    difficultyAvgs: number[];
    workloadAvgs: number[];
  }>({
    qualityAvgs: [],
    difficultyAvgs: [],
    workloadAvgs: [],
  });
  const [preferredPercentiles, setPreferredPercentiles] = useState({
    quality: 1,
    difficulty: 0,
    workload: 0,
  });
  const [sortedCourses, setSortedCourses] = useState<
    [string, Evaluation | ProfessorCourseEvaluation][]
  >([]);
  const [sortedProfs, setSortedProfs] = useState<
    [string, CourseData][]
  >([]);

  // Fetch friend data and preferred percentiles on component mount.
  useEffect(() => {
    async function getPrefferedPercentiles() {
      const userInfo = (await chrome.storage.local.get("userInfo")).userInfo;
      if (userInfo.preferences && userInfo.preferences.difficulty) {
        setPreferredPercentiles({
          quality: 1,
          difficulty: userInfo.preferences.difficulty / 4,
          workload: userInfo.preferences.difficulty / 4,
        });
      }
    }

    getPrefferedPercentiles();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.userInfo) {
        getPrefferedPercentiles();
      }
      if (
        namespace === "local" &&
        (changes.friendCoursesTaken ||
          changes.friendInterestedSections ||
          changes.friends)
      ) {
        fetchFriendData();
      }
    });
  }, []);

  // Fetch RMP data and department averages when new selection is made. Reset sorting metric to overall (descending).
  useEffect(() => {
    setSortingMetric(SortingMetrics.overall);
    setSortDescending(true);
    async function getRMPrating() {
      setIsLoadingRmp(true);
      try {
        const rmpRating = await chrome.runtime.sendMessage({
          type: "getRmpRatings",
          profName: selected!.id,
        });

        setRmpData(rmpRating);
      } catch (_ignore) {
        setRmpData(null);
      }
      setIsLoadingRmp(false);
    }

    if (selected.type === "prof") {
      const profDepts = Object.keys(data[selected.id]!).filter(
        (key) => key !== "type" && key.length === 4
      );
      setProfDepts(profDepts);
      setProfDeptAvgs({
        qualityAvgs: getDeptAvgs(profDepts, "quality"),
        difficultyAvgs: getDeptAvgs(profDepts, "difficulty"),
        workloadAvgs: getDeptAvgs(profDepts, "workload"),
      });
      getRMPrating();
    } else {
      setIsLoadingRmp(false);
    }

    fetchFriendData();
  }, [selected]);

  // Sort professors or courses based on selected metric and sort order.
  useEffect(() => {
    if (selected.type === "prof") {
      const ratingsToSort = Object.entries(
        data[selected.id]! as ProfessorData
      ).filter(([key]) => key !== "overall" && key.length > 4) as [
        string,
        Evaluation | ProfessorCourseEvaluation
      ][];
      setSortedCourses(sortItems(ratingsToSort));
    } else {
      const ratingsToSort = selected.professors.map((item: any) => [
        item,
        (data[item] as ProfessorData)[selected.id] as CourseData,
      ]) as [string, CourseData][];
      setSortedProfs(sortItems(ratingsToSort));
    }
  }, [sortingMetric, sortDescending, selected, data]);

  function sortItems<T extends Evaluation>(ratings: [string, T][]) {
    if (ratings.length === 0) return [] as [string, T][];
    if (sortingMetric === SortingMetrics.overall)
      return sortByAllMetrics(ratings);
    else
      return sortByIndividualMetric(
        ratings,
        sortingMetric.toLowerCase() as "quality" | "difficulty" | "workload"
      );
  }

  function getDeptAvgs(
    profDepts: string[],
    type: "quality" | "difficulty" | "workload"
  ) {
    const aggregatedAvgs = [];
    for (const dept of profDepts) {
      if (data!.departmentStatistics[dept]![`${type}Avgs`].length > 0) {
        aggregatedAvgs.push(...data!.departmentStatistics[dept]![`${type}Avgs`]);
      }
    }
    return aggregatedAvgs.sort();
  }

  async function fetchFriendData() {
    const friendData = await chrome.storage.local.get([
      "friendCoursesTaken",
      "friendInterestedSections",
      "friends",
    ]);
    const friendTakenInfos = [];
    const friendInterestedInfos = [];
    if (selected!.type === "prof") {
      for (const friendId in friendData.friendCoursesTaken?.[selected!.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const courses = friendData.friendCoursesTaken[selected!.id][friendId];
        const friendInfo = `${friendName} had for `;
        const courseCodes = [];
        for (const course of courses) {
          const match = course.match(COURSE_TAKEN_PATTERN);
          if (!match) continue;
          const courseCode = match[2]
            .substring(0, match[2].indexOf("-"))
            .replace(" ", "");
          courseCodes.push(courseCode);
        }
        if (courseCodes.length > 0)
          friendTakenInfos.push(`${friendInfo}${courseCodes.join(", ")}`);
      }
      for (const friendId in friendData.friendInterestedSections?.[selected!.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const sections =
          friendData.friendInterestedSections[selected!.id][friendId];
        for (const section of sections) {
          const match = section.match(INTERESTED_SECTION_PATTERN);
          if (!match) continue;
          const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
          const meetingPattern = `${meetingPatternMatch[1]
            } at ${meetingPatternMatch[2]
              .replaceAll(" ", "")
              .replaceAll(":00", "")
              .toLowerCase()}`;
          const courseCode = match[2]
            .substring(0, match[2].indexOf("-"))
            .replace(" ", "");
          friendInterestedInfos.push(
            `${friendName} wants to take for ${courseCode} on ${meetingPattern}`
          );
        }
      }
    } else {
      for (const friendId in friendData.friendCoursesTaken?.[selected!.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const course = friendData.friendCoursesTaken[selected!.id][friendId];
        const match = course.match(COURSE_TAKEN_PATTERN);
        if (!match) continue;
        if (match[1] === "Not taken at SCU") {
          friendTakenInfos.push(`${friendName} took outside of SCU`);
          continue;
        }
        friendTakenInfos.push(
          `${friendName} took with ${match[1] || "unknown prof"}`
        );
      }
      for (const friendId in friendData.friendInterestedSections?.[selected!.id] || {}) {
        const friendName = friendData.friends[friendId].name;
        const course =
          friendData.friendInterestedSections[selected!.id][friendId];
        const match = course.match(INTERESTED_SECTION_PATTERN);
        if (!match) continue;
        const meetingPatternMatch = match[3].match(/(.*) \| (.*) \| (.*)/);
        const meetingPattern = `${meetingPatternMatch[1]
          } at ${meetingPatternMatch[2]
            .replaceAll(" ", "")
            .replaceAll(":00", "")
            .toLowerCase()}`;
        friendInterestedInfos.push(
          `${friendName} wants to take with ${match[1]} on ${meetingPattern}`
        );
      }
    }
    setFriendData({ friendTakenInfos, friendInterestedInfos });
  }

  function getCourseName(courseCode: string) {
    return (data![courseCode] as CourseData | undefined)?.courseName || "";
  }

  function extractTerms(recentTerms: string[]) {
    const termPattern = /(Spring|Summer|Fall|Winter)/gi;
    const simplifiedTerms = recentTerms
      .map((term) => term.match(termPattern))
      .flat()
      .filter(Boolean);
    const uniqueTerms = [...new Set(simplifiedTerms)];
    return uniqueTerms;
  }

  function sortByAllMetrics<T extends Evaluation>(
    ratingEntries: [string, T][]
  ) {
    // ratingEntries are arrays like [courseCode/professorName, courseStats/profStats].
    return ratingEntries.sort((entryA, entryB) => {
      const ratingA = entryA[1];
      const ratingB = entryB[1];
      const qualityAvgA = ratingA.qualityTotal / ratingA.qualityCount;
      const difficultyAvgA = ratingA.difficultyTotal / ratingA.difficultyCount;
      const workloadAvgA = ratingA.workloadTotal / ratingA.workloadCount;
      const qualityAvgB = ratingB.qualityTotal / ratingB.qualityCount;
      const difficultyAvgB = ratingB.difficultyTotal / ratingB.difficultyCount;
      const workloadAvgB = ratingB.workloadTotal / ratingB.workloadCount;
      const scoreA = qualityAvgA + (5 - difficultyAvgA) + (15 - workloadAvgA);
      const scoreB = qualityAvgB + (5 - difficultyAvgB) + (15 - workloadAvgB);
      if (sortDescending) return scoreB - scoreA;
      else return scoreA - scoreB;
    });
  }

  function sortByIndividualMetric<T extends Evaluation>(
    ratingEntries: [string, T][],
    metric: "quality" | "difficulty" | "workload"
  ) {
    // ratingEntries are arrays like [courseCode/professorName, courseStats/profStats]
    return ratingEntries.sort((entryA, entryB) => {
      const ratingA = entryA[1];
      const ratingB = entryB[1];
      const metricAvgA = ratingA[`${metric}Total`] / ratingA[`${metric}Count`];
      const metricAvgB = ratingB[`${metric}Total`] / ratingB[`${metric}Count`];
      return sortDescending ? metricAvgB - metricAvgA : metricAvgA - metricAvgB;
    });
  }

  function handleMetricChange(metric: string) {
    setSortingMetric((prev) => {
      setSortDescending(
        (currentlyDescending) => prev !== metric || !currentlyDescending
      );
      return metric;
    });
  }

  function isProfessorCourseEvaluation(
    stats: Evaluation | ProfessorCourseEvaluation
  ): stats is ProfessorCourseEvaluation {
    return "recentTerms" in stats;
  }

  if (selected.type === "prof") {
    return (
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography fontWeight="bold" display="inline" variant="h6">
            {selected.id}
          </Typography>
          {profDepts.map((dept) => (
            <Typography
              key={dept}
              display={"inline-block"}
              component={"span"}
              variant="body2"
              fontWeight={"400"}
              position={"relative"}
              bottom={3}
              borderRadius={5}
              bgcolor={"#b3b9be"}
              paddingY={0.25}
              paddingX={1}
              marginLeft={1.25}
              sx={{ verticalAlign: "middle" }}
            >
              {dept}
            </Typography>
          ))}

          <FriendCoursesTooltip friendData={friendData} />
          {selected.overall && (
            <>
              <Typography
                variant="h6"
                fontSize={"1.15rem"}
                fontWeight={"500"}
                gutterBottom
              >
                Overall Course Evaluation Statistics
              </Typography>
              <EvalStats
                stats={selected.overall}
                deptStats={profDeptAvgs}
                preferredPercentiles={preferredPercentiles}
              />
            </>
          )}
          <RmpStats
            rmpData={rmpData}
            isLoadingRmp={isLoadingRmp}
            profName={selected.id}
            preferredPercentiles={preferredPercentiles}
          />
          <Divider sx={{ mt: 2 }} />
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            fontWeight={"500"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Course
          </Typography>
          <SortingMetricPicker
            sortingMetric={sortingMetric}
            sortDescending={sortDescending}
            handleMetricChange={handleMetricChange}
          />
          {sortedCourses.length > 0 &&
            sortedCourses.map(([courseCode, courseStats], index) => (
              <Box>
                <Box
                  key={courseCode}
                  sx={{ mt: 2 }}
                  display={"flex"}
                  flexDirection={"row"}
                >
                  <Box
                    display="flex"
                    alignItems="left"
                    flexDirection="column"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="body1"
                      gutterBottom
                      onClick={() => {
                        onPageNavigation(courseCode);
                      }}
                      sx={{
                        ml: 1,
                        color: "#802a25",
                        cursor: "pointer",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                        margin: "0px 0px 0px",
                      }}
                      title={getCourseName(courseCode)}
                    >
                      {`${courseCode.substring(0, 4)} ${courseCode.substring(
                        4
                      )}`}
                    </Typography>
                    {isProfessorCourseEvaluation(courseStats) && (
                      <>
                        <RecentTermsToolTip
                          recentTerms={courseStats.recentTerms}
                        >
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            width={"150px"}
                            sx={{
                              margin: "0px 0px 0px",
                            }}
                          >
                            <CalendarMonthIcon
                              fontSize="small"
                              sx={{
                                marginRight: "2px",
                                color: "black",
                                marginBottom: "-2px",
                                fontSize: "16px",
                              }}
                            />
                            {extractTerms(courseStats.recentTerms).join(", ")}
                          </Typography>
                        </RecentTermsToolTip>
                        <ProfessorRecencyIndicator
                          lastTaughtQuarter={courseStats.recentTerms[0]!}
                        ></ProfessorRecencyIndicator>
                      </>
                    )}
                  </Box>
                  <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    marginLeft="1rem"
                  >
                    <StatsWithLessFormatting
                      flexGap={"2.5rem"}
                      stats={courseStats}
                      deptStats={
                        data.departmentStatistics[courseCode.substring(0, 4)]!
                      }
                      preferredPercentiles={preferredPercentiles}
                    />
                  </Box>
                </Box>
                {index <
                  Object.keys(selected).filter((key) =>
                    key.match(/[A-Z]{4}\d+/)
                  ).length -
                    1 && <Divider sx={{ my: 2 }} />}
              </Box>
            ))}
          <Divider sx={{ mt: 2 }} />
          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Department
          </Typography>
          {(
            Object.entries(selected).filter(
              ([key, value]: [string, any]) =>
                typeof value === "object" &&
                value.qualityTotal !== undefined &&
                key !== "overall" &&
                key.length === 4
            ) as [string, Evaluation][]
          ).map(([dept, stats], index) => (
            <Box key={dept} sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                {dept}
              </Typography>
              <EvalStats
                stats={stats}
                deptStats={data.departmentStatistics[dept]!}
                preferredPercentiles={preferredPercentiles}
              />
              {index <
                Object.keys(selected).filter((key) => key.length === 4).length -
                2 && <Divider sx={{ my: 2 }} />}
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (selected.type === "course") {
    return (
      <Card sx={{ backgroundColor: "#f0f0f0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold">
            {selected.courseName} ({selected.id})
          </Typography>
          <RecentTermsToolTip recentTerms={selected.recentTerms}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <b>Previously Offered: </b>{" "}
              {extractTerms(selected.recentTerms).join(", ")}
            </Typography>
          </RecentTermsToolTip>

          <FriendCoursesTooltip friendData={friendData} />

          <Typography
            variant="h6"
            gutterBottom
            fontSize={"1.15rem"}
            marginTop={2}
          >
            Overall Statistics
          </Typography>
          <EvalStats
            stats={selected}
            deptStats={data.departmentStatistics[selected.id.substring(0, 4)]!}
            preferredPercentiles={preferredPercentiles}
          />
          <Divider sx={{ mt: 2 }} />

          <Typography
            variant="h6"
            fontSize={"1.15rem"}
            marginTop={2}
            gutterBottom
          >
            Statistics by Professor
          </Typography>
          <SortingMetricPicker
            sortingMetric={sortingMetric}
            sortDescending={sortDescending}
            handleMetricChange={handleMetricChange}
          />
          {sortedProfs.length > 0 &&
            sortedProfs.map(([profName, profCourseStats], index) => {
              return (
                <Box>
                  <Box
                    key={profName}
                    sx={{ mt: 2 }}
                    display={"flex"}
                    flexDirection={"row"}
                  >
                    <Box
                      display="flex"
                      alignItems="left"
                      flexDirection="column"
                      justifyContent="space-between"
                    >
                      <Typography
                        variant="body1"
                        gutterBottom
                        component={"span"}
                        onClick={() => {
                          onPageNavigation(profName);
                        }}
                        sx={{
                          ml: 1,
                          color: "#802a25",
                          margin: "0px 0px 0px",
                          cursor: "pointer",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        {profName}
                      </Typography>
                      <RecentTermsToolTip
                        recentTerms={profCourseStats.recentTerms}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          width={"150px"}
                          sx={{ margin: "0px 0px 0px" }}
                        >
                          <CalendarMonthIcon
                            fontSize="small"
                            sx={{
                              marginRight: "2px",
                              color: "black",
                              marginBottom: "-2px",
                              fontSize: "16px",
                            }}
                          />
                          <span>
                            {extractTerms(profCourseStats.recentTerms).join(
                              ", "
                            )}
                          </span>
                        </Typography>
                      </RecentTermsToolTip>
                      <ProfessorRecencyIndicator
                        lastTaughtQuarter={profCourseStats.recentTerms[0]!}
                      ></ProfessorRecencyIndicator>
                    </Box>
                    <Box
                      display="flex"
                      flexDirection="column"
                      justifyContent="center"
                      marginLeft="0.75rem"
                    >
                      <StatsWithLessFormatting
                        flexGap={"2.5rem"}
                        stats={profCourseStats}
                        deptStats={
                          data.departmentStatistics[selected.id.substring(0, 4)]!
                        }
                        preferredPercentiles={preferredPercentiles}
                      />
                    </Box>
                  </Box>

                  {index < selected.professors.length - 1 && (
                    <Divider sx={{ my: 2 }} />
                  )}
                </Box>
              );
            })}
        </CardContent>
      </Card>
    );
  }
  return null;
}
