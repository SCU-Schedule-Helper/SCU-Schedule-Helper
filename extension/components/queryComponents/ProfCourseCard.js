import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import {
  CalendarMonth as CalendarMonthIcon,
} from "@mui/icons-material";
import FriendCoursesTooltip from "./FriendCoursesTooltip";
import EvalStats from "./EvalStats";
import StatsWithLessFormatting from "./StatsWithLessFormatting";
import RmpStats from "./RmpStats";
import RecentTermsToolTip from "./RecentTermsToolTip";
import ProfessorRecencyIndicator from "./ProfessorRecencyIndicator";
import SortingMetricPicker from "./SortingMetricPicker";
import RatingSortingPicker from "./RatingSortingPicker";
import OverallSortingPicker from "./OverallSortingPicker";
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
export const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
export const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}

export default function ProfCourseCard({ selected, data, onPageNavigation }) {
  if (!selected) return null;
  const [rmpData, setRmpData] = useState(null);
  const [isLoadingRmp, setIsLoadingRmp] = useState(true);
  const [friendData, setFriendData] = useState(null);
  const [profDepts, setProfDepts] = useState([]);
  const [sortingMetric, setSortingMetric] = useState(SortingMetrics.overall);
  const [sortDescending, setSortDescending] = useState(true);
  const [profDeptAvgs, setProfDeptAvgs] = useState({
    quality: [],
    difficulty: [],
    workload: [],
  });
  const [preferredPercentiles, setPreferredPercentiles] = useState({
    quality: 1,
    difficulty: 0,
    workload: 0,
  });
  const [sortedCourses, setSortedCourses] = useState([]);
  const [sortedProfs, setSortedProfs] = useState([]);

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
          profName: selected.id,
        });

        setRmpData(rmpRating);
      } catch (error) {
        setRmpData(null);
      }
      setIsLoadingRmp(false);
    }

    if (selected.type === "prof") {
      const profDepts = Object.keys(data[selected.id]).filter(
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
    let ratingsToSort;
    if (selected.type === "prof")
      ratingsToSort = Object.entries(data[selected.id]).filter(
        ([key,]) => key !== "overall" && key.length > 4
      );
    else
      ratingsToSort = selected.professors.map((item) => [item, data[item][selected.id]]);
    if (!ratingsToSort || ratingsToSort.length === 0) return;

    let sortedItems;
    if (sortingMetric === SortingMetrics.overall)
      sortedItems = sortByAllMetrics(ratingsToSort);
    else
      sortedItems = sortByIndividualMetric(ratingsToSort, sortingMetric.toLowerCase());

    if(selected.type === "prof")
      setSortedCourses(sortedItems);
    else
      setSortedProfs(sortedItems);
  }, [sortingMetric, sortDescending, selected, data]);

  function getDeptAvgs(profDepts, type) {
    const aggregatedAvgs = [];
    for (const dept of profDepts) {
      if (data.departmentStatistics[dept][`${type}Avgs`].length > 0) {
        aggregatedAvgs.push(...data.departmentStatistics[dept][`${type}Avgs`]);
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
    if (selected.type === "prof") {
      for (const friendId in friendData.friendCoursesTaken?.[selected.id] ||
        {}) {
        const friendName = friendData.friends[friendId].name;
        const courses = friendData.friendCoursesTaken[selected.id][friendId];
        const friendInfo = `${friendName} had for `;
        const courseCodes = [];
        for (const course of courses) {
          const match = course.match(courseTakenPattern);
          if (!match) continue;
          const courseCode = match[2]
            .substring(0, match[2].indexOf("-"))
            .replace(" ", "");
          courseCodes.push(courseCode);
        }
        if (courseCodes.length > 0)
          friendTakenInfos.push(`${friendInfo}${courseCodes.join(", ")}`);
      }
      for (const friendId in friendData.friendInterestedSections?.[
        selected.id
      ] || {}) {
        const friendName = friendData.friends[friendId].name;
        const sections =
          friendData.friendInterestedSections[selected.id][friendId];
        for (const section of sections) {
          const match = section.match(interestedSectionPattern);
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
      for (const friendId in friendData.friendCoursesTaken?.[selected.id] ||
        {}) {
        const friendName = friendData.friends[friendId].name;
        const course = friendData.friendCoursesTaken[selected.id][friendId];
        const match = course.match(courseTakenPattern);
        if (!match) continue;
        if (match[1] === "Not taken at SCU") {
          friendTakenInfos.push(`${friendName} took outside of SCU`);
          continue;
        }
        friendTakenInfos.push(
          `${friendName} took with ${match[1] || "unknown prof"}`
        );
      }
      for (const friendId in friendData.friendInterestedSections?.[
        selected.id
      ] || {}) {
        const friendName = friendData.friends[friendId].name;
        const course =
          friendData.friendInterestedSections[selected.id][friendId];
        const match = course.match(interestedSectionPattern);
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

  function getCourseName(courseCode) {
    return data[courseCode]?.courseName || "";
  }

  function getOverallRank(stats) {
    const qualityAvg = stats.qualityTotal / stats.qualityCount;
    const difficultyAvg = stats.difficultyTotal / stats.difficultyCount;
    const workloadAvg = stats.workloadTotal / stats.workloadCount;
    return Math.round(qualityAvg + (5 - difficultyAvg) + (15 - workloadAvg));
  }

  function extractTerms(recentTerms) {
    const termPattern = /(Spring|Summer|Fall|Winter)/gi;
    const simplifiedTerms = recentTerms
      .map((term) => term.match(termPattern))
      .flat()
      .filter(Boolean);
    const uniqueTerms = [...new Set(simplifiedTerms)];
    return uniqueTerms;
  }

  function sortByAllMetrics(ratingEntries) {
    // ratingEntries are arrays like [courseCode/professorName, courseStats/profStats].
    return ratingEntries.sort((entryA, entryB) => {
      const ratingA = entryA[1];
      const ratingB = entryB[1];
      ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
      ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
      ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
      ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
      ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
      ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
      const scoreA =
        ratingA.qualityAvg +
        (5 - ratingA.difficultyAvg) +
        (15 - ratingA.workloadAvg);
      const scoreB =
        ratingB.qualityAvg +
        (5 - ratingB.difficultyAvg) +
        (15 - ratingB.workloadAvg);
      if (sortDescending)
        return scoreB - scoreA;
      else
        return scoreA - scoreB;

    });
  }

  function sortByIndividualMetric(ratingEntries, metric) {
    // ratingEntries are arrays like [courseCode/professorName, courseStats/profStats]
    return ratingEntries.sort((entryA, entryB) => {
      const ratingA = entryA[1];
      const ratingB = entryB[1];
      const metricAvgA = ratingA[`${metric}Total`] / ratingA[`${metric}Count`];
      const metricAvgB = ratingB[`${metric}Total`] / ratingB[`${metric}Count`];
      return sortDescending ? metricAvgB - metricAvgA : metricAvgA - metricAvgB;
    });
  }

  function handleMetricChange(metric) {
    setSortingMetric((prev) => {
      setSortDescending(
        (currentlyDescending) => prev !== metric || !currentlyDescending
      );
      return metric;
    });
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
          
          {/* Fixed header with sorting buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              mt: 2,
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minWidth: "150px",
                ml: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Course
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: "1rem",
                minWidth: "4.5rem",
              }}
            >
              <OverallSortingPicker
                sortingMetric={sortingMetric}
                sortDescending={sortDescending}
                handleMetricChange={handleMetricChange}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: "1rem",
                flexGrow: 1,
              }}
            >
              <RatingSortingPicker
                sortingMetric={sortingMetric}
                sortDescending={sortDescending}
                handleMetricChange={handleMetricChange}
              />
            </Box>
          </Box>

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
                    minWidth="150px"
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
                    {courseStats.recentTerms && (
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
                          lastTaughtQuarter={courseStats.recentTerms[0]}
                        ></ProfessorRecencyIndicator>
                      </>
                    )}
                  </Box>
                  <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    marginLeft="1rem"
                    minWidth="4.5rem"
                  >
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {getOverallRank(courseStats)}
                      </Typography>
                    </Box>
                  </Box>
                   <Box
                     display="flex"
                     flexDirection="column"
                     justifyContent="center"
                     marginLeft="1rem"
                     flexGrow={1}
                     sx={{ marginRight: "50px" }} // Shift 50px to the left
                   >
                     <StatsWithLessFormatting
                       flexGap={"1.8rem"} // Reduced gap to make columns closer
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
          {Object.entries(selected)
            .filter(
              ([key, value]) =>
                typeof value === "object" &&
                value.qualityTotal !== undefined &&
                key !== "overall" &&
                key.length === 4
            )
            .map(([dept, stats], index) => (
              <Box key={dept} sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  {dept}
                </Typography>
                <EvalStats
                  stats={stats}
                  deptStats={data.departmentStatistics[dept]}
                  preferredPercentiles={preferredPercentiles}
                />
                {index <
                  Object.keys(selected).filter((key) => key.length === 4)
                    .length -
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
            deptStats={data.departmentStatistics[selected.id.substring(0, 4)]}
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
          
          {/* Fixed header with sorting buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              mt: 2,
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minWidth: "150px",
                ml: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Professor
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: "1rem",
                minWidth: "4.5rem",
              }}
            >
              <OverallSortingPicker
                sortingMetric={sortingMetric}
                sortDescending={sortDescending}
                handleMetricChange={handleMetricChange}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: "1rem",
                flexGrow: 1,
              }}
            >
              <RatingSortingPicker
                sortingMetric={sortingMetric}
                sortDescending={sortDescending}
                handleMetricChange={handleMetricChange}
              />
            </Box>
          </Box>

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
                      minWidth="150px"
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
                          <span marginBottom="2px">
                            {extractTerms(profCourseStats.recentTerms).join(
                              ", "
                            )}
                          </span>
                        </Typography>
                      </RecentTermsToolTip>
                      <ProfessorRecencyIndicator
                        lastTaughtQuarter={profCourseStats.recentTerms[0]}
                      ></ProfessorRecencyIndicator>
                    </Box>
                    <Box
                      display="flex"
                      flexDirection="column"
                      justifyContent="center"
                      marginLeft="1rem"
                      minWidth="4.5rem"
                    >
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {getOverallRank(profCourseStats)}
                        </Typography>
                      </Box>
                    </Box>
                     <Box
                       display="flex"
                       flexDirection="column"
                       justifyContent="center"
                       marginLeft="1rem"
                       flexGrow={1}
                       sx={{ marginRight: "50px" }} // Shift 50px to the left
                     >
                       <StatsWithLessFormatting
                         flexGap={"1.8rem"} // Reduced gap to make columns closer
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
