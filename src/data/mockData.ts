import type { Quote, Candidate, IssueData } from '../store/useReadRankStore';

// All available issues
export const allIssues: IssueData[] = [
  {
    id: "cannabis-legalization",
    title: "Cannabis Legalization",
    question: "Do you support Indiana legalizing marijuana use, either medicinal, recreational, or both?"
  },
  {
    id: "education-funding",
    title: "Education Funding",
    question: "How should Indiana approach public school funding and teacher compensation?"
  },
  {
    id: "abortion-rights",
    title: "Abortion Rights",
    question: "What is your position on abortion access in Indiana?"
  }
];

// Legacy single issue export for backwards compatibility
export const mockIssueData = allIssues[0];

// Each candidate has ONE quote per issue
export const mockQuotes: Quote[] = [
  // ========== CANNABIS LEGALIZATION ==========
  {
    id: "rainwater-cannabis",
    text: "We don't need to expand government. We don't need a new commission. We don't need new regulations. We can make cannabis in all forms — medicinal and recreational — legal right now. If legislators are not prepared, that is their fault, and we should probably replace them. We should make this legal now, and, as governor, I would make sure that all nonviolent criminal cannabis-related offenses are expunged.",
    candidateId: "donald-rainwater",
    issue: "cannabis-legalization",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "mccormick-cannabis",
    text: "I'm aware 80% of Hoosiers support legalization. My cannabis plan calls for a conversation on medical use before a conversation on adult use. On adult use, Indiana is losing out on $177 million in tax revenue and hundreds of thousands of jobs because surrounding states have legalized marijuana. Indiana needs a commission on cannabis use.",
    candidateId: "jennifer-mccormick",
    issue: "cannabis-legalization",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "braun-cannabis",
    text: "Marijuana use medicinally and recreationally is cascading across the county, and Indiana needs to address it seriously. I'd have to think about whether to allow adult use. On medicinal use, we're probably ready for it. On both counts, I'm going to listen to law enforcement because they will have to enforce it and put up with any issues.",
    candidateId: "mike-braun",
    issue: "cannabis-legalization",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "bauer-cannabis",
    text: "Now that the Drug Enforcement Administration plans to reclassify marijuana... I believe it is time for Indiana to follow suit with decriminalization and legalization for adult use.",
    candidateId: "maureen-bauer",
    issue: "cannabis-legalization",
    sourceUrl: "https://wsbt.com/news/local/indiana-leaders-reassess-marijuana-stance-as-dea-proposes-historic-reclassification",
    sourceName: "WSBT News"
  },

  // ========== EDUCATION FUNDING ==========
  {
    id: "rainwater-education",
    text: "I believe in universal school choice. Indiana's public school system is failing; only 63% of children passed statewide tests in math and English. The state constitution allows for the funding of public and private schools.",
    candidateId: "donald-rainwater",
    issue: "education-funding",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "mccormick-education",
    text: "Make no mistake, this isn't about parents choosing, this is about a school choosing. The admission policies need to be looked at. If I showed up with a child and the school doesn't like the academic performance, or the color of their skin, or how they identify LGBTQ, or their religious belief, they do not have to take them. Public dollars need to go to public schools.",
    candidateId: "jennifer-mccormick",
    issue: "education-funding",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "braun-education",
    text: "Indiana has a leading edge on school choice and competition, and also puts the parents as the main stakeholders in their children's education. When you have one size fits all, it's a monopoly. If you're not for choice, competition, and vouchers to make it doable, it's not a zero-sum game.",
    candidateId: "mike-braun",
    issue: "education-funding",
    sourceUrl: "https://www.wishtv.com/news/election/qa-from-all-indiana-politics-special-the-governors-debate/",
    sourceName: "WISH-TV Governor's Debate"
  },
  {
    id: "bauer-education",
    text: "To improve outcomes for Hoosier children, we need to make early childhood education available to all families, provide fair and adequate funding for K-12 public education and teacher salaries, and reduce food insecurities through expanded school breakfast and lunch programs.",
    candidateId: "maureen-bauer",
    issue: "education-funding",
    sourceUrl: "https://www.maureenbauer.com",
    sourceName: "Maureen Bauer Campaign Website"
  },

  // ========== ABORTION RIGHTS ==========
  {
    id: "rainwater-abortion",
    text: "I am pro-life. I believe that the American College of Pediatrics, I believe it was in 2017, issued their opinion, saying that at conception, new DNA is created. I believe that we in this country believe in the unalienable rights of life, liberty and the pursuit of happiness. Life, if it is new DNA, scientifically, would then start at conception. And if we are going to protect life, then we should protect it from its beginning.",
    candidateId: "donald-rainwater",
    issue: "abortion-rights",
    sourceUrl: "https://www.indystar.com/story/news/politics/elections/2024/01/10/2024-indiana-governor-race-qa-with-libertarian-donald-rainwater/71756787007/",
    sourceName: "IndyStar - 2024"
  },
  {
    id: "mccormick-abortion",
    text: "I trust women; I trust health care providers. I believe in the standards set by Roe. It’s time we return to that.",
    candidateId: "jennifer-mccormick",
    issue: "abortion-rights",
    sourceUrl: "https://abc7chicago.com/post/2024-election-indiana-governor-candidates-jennifer-mccormick-mike-braun-donald-rainwater-debate-abortion-ban-economics/15466415/",
    sourceName: "ABC7 Chicago - Governor's Debate"
  },
  {
    id: "braun-abortion",
    text: "We’re a right-to-life state, backing the sanctity of life. When our Legislature took it on they talked to their constituents, to Hoosiers. It has withstood the courts weighing in. The people have spoken. Legislators have listened, and we got a bill that seems to be working for Hoosiers.",
    candidateId: "mike-braun",
    issue: "abortion-rights",
    sourceUrl: "https://abc7chicago.com/post/2024-election-indiana-governor-candidates-jennifer-mccormick-mike-braun-donald-rainwater-debate-abortion-ban-economics/15466415/",
    sourceName: "ABC7 Chicago - Governor's Debate"
  },
  {
    id: "bauer-abortion",
    text: "Forced birth is not freedom. Forcing government to decide women's health care decisions but not a man's is not equal. Forcing a survivor of rape to give birth to her abuser's child is not dignity. Government's role is to ensure we are providing access to quality and essential health care services, especially to the vulnerable.",
    candidateId: "maureen-bauer",
    issue: "abortion-rights",
    sourceUrl: "https://iga.in.gov/session/2022ss1/video/house",
    sourceName: "Indiana House Debate - August 5, 2022"
  }
];

export const mockCandidates: Candidate[] = [
  {
    id: "donald-rainwater",
    name: "Donald Rainwater",
    party: "Libertarian Party",
    office: "Indiana Governor",
    photo: "https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/DonaldRainwater2024.jpg",
    alignmentPercent: 0,
    issuesAligned: 0,
    totalIssues: 1
  },
  {
    id: "jennifer-mccormick",
    name: "Jennifer McCormick",
    party: "Democratic Party",
    office: "Indiana Governor",
    photo: "https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/Jennifer_McCormick.jpg",
    alignmentPercent: 0,
    issuesAligned: 0,
    totalIssues: 1
  },
  {
    id: "mike-braun",
    name: "Mike Braun",
    party: "Republican Party",
    office: "Indiana Governor",
    photo: "https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/100/100/Mike_Braun.png",
    alignmentPercent: 0,
    issuesAligned: 0,
    totalIssues: 1
  },
  {
    id: "maureen-bauer",
    name: "Maureen Bauer",
    party: "Democratic Party",
    office: "Indiana State Representative",
    photo: "https://s3.amazonaws.com/ballotpedia-api4/files/thumbs/200/300/Mar3020201125PM_80182230_1BA7F9ECD19D4A52829D0F47A0BE6754.jpeg",
    alignmentPercent: 0,
    issuesAligned: 0,
    totalIssues: 1
  }
];
