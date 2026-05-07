#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Each line: "MM/YYYY | Outlet | Title | URL"  (date may be empty)
const RAW = `
03/2026 | TheWire.in | Tears, Queues and a Never-Ending Search for Kagaz: The Real Story of Aadhaar | https://thewire.in/special/tears-queues-and-a-never-ending-search-for-kagaz-the-real-story-of-aadhaar
03/2026 | IDR | India's Digital Welfare System is Quietly Eroding People's Basic Rights | https://idronline.org/article/rights/indias-digital-welfare-system-is-quietly-eroding-peoples-basic-rights/
03/2026 | The India Forum | Saheli Cards and Surveillance: Public Welfare | https://www.theindiaforum.in/forum/saheli-cards-and-surveillance-public-welfare
03/2026 | Indian Express | Aadhaar App's Pre-Installation: Industry Pushback, Technical Infeasibility | https://indianexpress.com/article/business/aadhaar-apps-pre-installation-industry-pushback-technical-infeasibility-10592951/
03/2026 | The News Minute | Karnataka's Draft Digital Use for Students Policy Calls for Aadhar-Enabled Sign-Up | https://www.thenewsminute.com/karnataka/karnatakas-draft-digital-use-for-students-policy-calls-for-aadhar-enabled-sign-up
03/2026 | Economic Times | Make Aadhaar-Based Payment System Optional Under MGNREGA: Parliamentary Panel | https://m.economictimes.com/news/india/make-aadhaar-based-payment-system-optional-under-mgnregs-parliamentary-panel/articleshow/129853760.cms
03/2026 | Moneycontrol | AI's Social Costs India Cannot Ignore | https://www.moneycontrol.com/news/opinion/ai-s-social-costs-india-cannot-ignore-13851146.html
02/2026 | TechCrunch | India Makes Aadhaar More Ubiquitous But Critics Say Privacy Concerns Remain | https://techcrunch.com/2026/02/09/india-makes-aadhaar-more-ubiquitous-but-critics-say-privacy-concerns-remain/
02/2026 | The India Forum | Can India Power AI Dream | https://www.theindiaforum.in/forum/can-india-power-ai-dream
02/2026 | NDTV | World's Data Centres Are Guzzling Power, Water: Does India Have Solutions? | https://www.ndtv.com/india-news/worlds-data-centres-are-guzzling-power-water-does-india-have-solutions-india-ai-impact-summit-11116709
01/2026 | Times of India | Long Queues, Delays in Aadhaar Updation Leaving People Frustrated | https://timesofindia.indiatimes.com/city/dehradun/long-queues-delays-in-aadhaar-updation-leaving-people-frustrated/articleshow/126587449.cms
01/2026 | Washington Post | India Surveillance State and Democracy | https://www.washingtonpost.com/opinions/2026/01/09/india-surveillance-state-democracy/
12/2025 | IDR | India's New Data Rules Put the State Above Citizens | https://idronline.org/article/rights/indias-new-data-rules-put-the-state-above-citizens/
12/2025 | TheWire.in | Restrict, Dismantle, Repeal: How Modi Government Killed MGNREGA | https://thewire.in/government/restrict-dismantle-repeal-how-modi-government-killed-mgnrega-before-vb-g-ram-g-was-tabled
10/2025 | The Guardian | Your Basis to Live is Checked at Each and Every Step | https://www.theguardian.com/world/2025/oct/14/india-id-system-divide-opinion
09/2025 | The News Minute | Telangana Govt Used Electoral Roll Photos for Facial Recognition | https://www.thenewsminute.com/telangana/telangana-govt-under-brs-used-electoral-roll-photos-for-facial-recognition-activist-lodges-complaint
09/2025 | Medianama | ECI Sharing Voter Data: Telangana Govt Facial Recognition | https://www.medianama.com/2025/09/223-eci-sharing-voter-data-telangana-govt-facial-recognition/
09/2025 | Hindustan Times | Activist: EPIC Data Used in Telangana for Facial Recognition | https://www.hindustantimes.com/india-news/activist-epic-data-used-in-telangana-for-facial-recognition-101757445127132.html
09/2025 | The Hindu | Revised SOO Pact with Kuki-Zo Groups Requires Them to Get Aadhaar Cards | https://www.thehindu.com/news/national/revised-soo-pact-with-kuki-zo-groups-requires-them-to-get-aadhaar-cards/article70013541.ece
09/2025 | TheWire.in | Rajasthan's Turn to Cradle-to-Grave Digital Governance | https://thewire.in/rights/companies-gain-elders-lose-in-rajasthans-turn-to-cradle-to-grave-digital-governance
09/2025 | Indian Express | Maharashtra Considering Proposal to Monetise Golden Data | https://indianexpress.com/article/cities/mumbai/maharashtra-considering-proposal-to-monetise-golden-data-of-beneficiaries-of-govt-schemes-10267510/
09/2025 | CNBC TV18 | Protean eGov Shares Surge 11% After ₹1,160 Crore Order Win from UIDAI | https://www.cnbctv18.com/market/protean-egov-shares-wins-rs-1160-crore-uidai-order-to-set-up-aadhaar-centres-ws-l-19659055.htm
2024 | Economic and Political Weekly | Aadhaar: Costs of Digital Red Tape | https://www.epw.in/journal/2024/19/insight/aadhaar-costs-digital-red-tape.html
01/2018 | New York Times | Aadhaar's Big Fix Turned Out to Be Big Flub | https://www.nytimes.com/2018/01/21/opinion/india-aadhaar-biometric-id.html
03/2018 | Washington Post | India's Vast Biometric Program: Costing People Privacy and Even Lives | https://www.washingtonpost.com/world/asia_pacific/indias-vast-biometric-program-was-supposed-to-end-corruption-but-the-neediest-may-be-hit-hardest/2018/03/24/bb212a86-289c-11e8-a227-fd2b009466bc_story.html
02/2025 | Scroll.in | Mandatory Aadhaar OTPs Are Depriving the Marginalised of Food Rations in Jharkhand | https://scroll.in/article/1078995/mandatory-aadhaar-otps-are-depriving-the-marginalised-of-food-rations-in-jharkhand
08/2025 | TheWire.in | Queues, Rejections, Ambiguity: Daily Trials of Wanting a Working Aadhaar | https://m.thewire.in/article/government/queues-rejections-ambiguity-the-daily-trials-of-wanting-a-working-aadhaar
08/2025 | Indian Express | Assam Will Stop Issuing Aadhaar to Adults | https://indianexpress.com/article/india/assam-will-stop-issuing-aadhaar-to-adults-himanta-biswa-sarma-bangladeshis-10201442/
08/2025 | Economic Times | DBT Recipients of Central Schemes to Face Fresh Audit | https://economictimes.indiatimes.com/news/economy/policy/dbt-recipients-of-central-schemes-to-face-fresh-audit/articleshow/123004196.cms
08/2025 | Economic Times | Aadhaar is New Weak Link in Insurance | https://economictimes.indiatimes.com/industry/banking/finance/insure/aadhaar-is-new-weak-link-in-insurance/articleshow/123103660.cms
08/2025 | Careers360 | 89 Lakh Drop: SC, ST, OBC Scholarship Students Affected by Aadhaar Link | https://news.careers360.com/89-lakh-drop-sc-st-obc-scholarship-students-aadhaar-card-link-pre-post-matric-pms-yasasvi-shreshta-nsp-ssp-portal-delays-nep
08/2025 | The Hindu | An Anonymous Life Without an Aadhaar Identity | https://www.thehindu.com/news/national/maharashtra/an-anonymous-life-without-an-aadhar-identity/article69939921.ece
08/2025 | Indian Express | Aadhaar Mandatory: Avail Benefits of Delhi Govt Schemes | https://indianexpress.com/article/cities/delhi/aadhaar-mandatory-avail-benefits-delhi-govt-schemes-10171754/
08/2025 | The Hindu | Excluded by Address: Migrant Women, Transgender Persons Decry DTC's Saheli Cards | https://www.thehindu.com/news/cities/Delhi/excluded-by-address-migrant-women-transgender-persons-decry-dtcs-saheli-cards/article69890935.ece
07/2025 | Mainstream Weekly | Family Members Without Aadhaar Being Turned Away From Prisons | https://mainstreamweekly.net/article16069.html
07/2025 | Scroll.in | As Mizoram Collects Biometric Data of Myanmar Refugees: Experts Flag Risks | https://scroll.in/article/1085733/as-mizoram-collects-biometric-data-of-myanmar-refugees-experts-flag-risks
08/2025 | Indian Express | Parents and Experts Urge Karnataka Govt to Scrap Facial Recognition Attendance | https://indianexpress.com/article/cities/bangalore/it-can-have-unimaginable-consequences-experts-urge-karnataka-govt-to-scrap-facial-recognition-attendance-in-schools-10200109/
07/2025 | Daily World | Manipur Adopts Highly Stringent Norms for Aadhaar Issuance | https://www.dailyworld.in/national/manipur-adopts-highly-stringent-norms-for-aadhaar-issuance-623926.html
07/2025 | The Hindu | Odisha to Suspend Ration Cards for Not Doing e-KYC Verification | https://www.thehindu.com/news/national/odisha/odisha-to-suspend-ration-cards-of-2058-lakh-people-for-not-doing-e-kyc-verification-minister/article69755600.ece
07/2025 | TheWire.in | Delhi Police AI: Marginalised Communities Suffer Consequences of FRT's Failures | https://thewire.in/rights/delhi-police-ai-facial-recognition
06/2025 | Common Edge Asia | Aadhaar as Cautionary Tale for Sri Lankan Digitisation Project | https://www.commonedge.asia/wp-content/uploads/2025/06/DPI-Backgrounder.pdf
06/2025 | Oxford Human Rights Law | Access Denied: Disability and Digital Identification in India | https://ohrh.law.ox.ac.uk/access-denied-disability-and-digital-identification-in-india-reflections-after-pragya-prasun-and-amar-jain/
06/2025 | The India Forum | Rights, Aadhaar Machine | https://www.theindiaforum.in/law/rights-aadhar-machine
06/2025 | The Hindu | Pregnant Women Put to Hardship by New Facial Recognition System | https://www.thehindu.com/sci-tech/health/pregnant-women-put-to-hardship-by-new-facial-recognition-system-to-get-nutritious-kit/article69299183.ece
06/2025 | The Hindu | Biometrics of Arrestees Being Collected in Rajasthan and Delhi | https://www.thehindu.com/news/national/rajasthan-delhi-police-start-recording-iris-retina-fingerprints-of-all-arrestees-under-2022-law-no-dna-collection-yet/article69669115.ece
06/2025 | TheWire.in | Andhra Pradesh's Rollback: Doorstep Ration Delivery Project | https://thewire.in/rights/andhra-pradeshs-rollback-doorstep-ration-delivery-project
06/2025 | New York Times | Trump, Palantir, and Data of Americans | https://www.nytimes.com/2025/05/30/technology/trump-palantir-data-americans.html
07/2019 | Indian Express | Aadhaar Amendments Bill: Reinstating Provisions of Section 57 | https://indianexpress.com/article/opinion/columns/aadhaar-amendment-bill-new-rules-uidai-5829226/
11/2018 | Indian Express | An Imaginary Friend: Aadhaar Linking to MGNREGA | https://indianexpress.com/article/opinion/columns/aadhaar-mgnrega-aadhaar-linking-rural-jobs-5428050/
09/2018 | Deccan Herald | At Least 56 Died Due to Hunger 2015 | https://www.deccanherald.com/national/least-56-died-due-hunger-2015-693791.html
09/2018 | TheWire.in | Of 42 Hunger-Related Deaths: 25 Linked to Aadhaar Issues | https://thewire.in/rights/of-42-hunger-related-deaths-since-2017-25-linked-to-aadhaar-issues
03/2017 | The Guardian | No ID, No Benefits: Thousands Could Lose Lifeline Under India's Biometric Scheme | https://www.theguardian.com/global-development/2017/mar/21/no-id-no-benefits-thousands-could-lose-lifeline-india-biometric-scheme-aadhaar-card
05/2017 | Electronic Frontier Foundation | Aadhaar: Ushering in a Commercialised Era of Surveillance in India | https://www.eff.org/deeplinks/2017/05/aadhaar-ushering-commercialized-era-surveillance-india
05/2017 | Global Voices | Online Trolls Attack Critics of India's Aadhaar State ID System | https://globalvoices.org/2017/05/31/online-trolls-attack-critics-of-indias-aadhaar-state-id-system/
05/2017 | TheWire.in | 130 Million Aadhaar Numbers Were Made Public, Says New Report | https://thewire.in/130948/aadhaar-card-details-leaked/
01/2017 | Wall Street Journal | Watch: India's Ambitious UID Programme Often Fails to Deliver | https://blogs.wsj.com/indiarealtime/2017/01/13/watch-how-indias-ambitious-aadhaar-identification-program-often-fails-to-deliver/
12/2016 | Scroll.in | Despite the Comparisons: India's Aadhaar Project is Nothing Like America's SSN | https://scroll.in/article/823570/despite-the-comparisons-indias-aadhaar-project-is-nothing-like-americas-social-security-number
11/2016 | Caravan Magazine | Aadhaar Regulations Grant UIDAI Unchecked Power | https://www.caravanmagazine.in/vantage/aadhaar-regulations-uidai-power
2016 | TheWire.in | The Last Chance for a Welfare State Does Not Rest in the Aadhaar System | https://thewire.in/30256/the-last-chance-for-a-welfare-state-doesnt-rest-in-the-aadhaar-system/
2016 | TheWire.in | Aadhaar Act is Not a Money Bill | https://thewire.in/31297/the-aadhaar-act-is-not-a-money-bill/
`.trim();

const OUT = path.resolve('src/content/press');
fs.mkdirSync(OUT, { recursive: true });

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

let n = 0;
for (const line of RAW.split('\n')
  .map((l) => l.trim())
  .filter(Boolean)) {
  const parts = line.split(' | ').map((s) => s.trim());
  if (parts.length < 4) continue;
  const [dateRaw, publication, title, href] = parts;
  let date;
  if (/^\d{2}\/\d{4}$/.test(dateRaw)) {
    const [m, y] = dateRaw.split('/');
    date = `${y}-${m}-01`;
  } else if (/^\d{4}$/.test(dateRaw)) {
    date = `${dateRaw}-01-01`;
  } else {
    date = '2016-01-01';
  }
  const fname = `${date}-${slugify(publication)}-${slugify(title)}.md`;
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `publication: ${JSON.stringify(publication)}`,
    `date: ${date}`,
    `href: ${JSON.stringify(href)}`,
    '---',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT, fname), fm);
  n++;
}
console.log(`Wrote ${n} press entries`);
