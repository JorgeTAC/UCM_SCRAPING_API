import * as functions from "firebase-functions";
const puppeteer = require("puppeteer");
const config = {
  rut: "20305293",
  password: "PanConQuesoS22",
};

const navigatePage = async (page: any, url: string) => {
  let results: any = [];
  const allResults = [];
  await page.goto(url);
  await page.waitForSelector("#region-main > div > div > div > div > div > ul");
  const {numberPages, resultName}: any = await page.evaluate(async () => {
    const numberPages: any = document.getElementsByClassName("nav nav-tabs")[0]
        .getElementsByTagName("li").length;
    let name: any = document.querySelector("div.d-flex.align-items-center > div.mr-auto > div > div > h1");
    name = name.innerText;
    const resultName = name.split(") ").length > 1 ? name.split(") ")[1].split("-")[0] : name;
    return {numberPages, resultName};
  });
  for (let i = 1; i <= numberPages; i++) {
    await page.goto(url + `&section=${i}#tabs-tree-start`);
    await page.waitForSelector("#region-main > div > div > div > div > div > ul");
    results = await page.evaluate(async () => {
      const ulElement: any = document.querySelector("[class='content-section'] > ul");
      return Array.from( ulElement.getElementsByTagName("a"),
          (x: any) => ({
            url: x.href,
            title: x.innerText.split("\n")[0],
            type: x.innerText.split("\n")[1] || "LMS Link",
          }));
    });
    if (results !== null) allResults.push(...results);
  }
  return {name: resultName, results: allResults};
};

export const getHomeWorksLMS = functions
    .https.onRequest( async ( req: any, res: any) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            error: "Not allowed",
          });
        }

        const rut = config.rut;
        const pass = config.password;
        const browser = await puppeteer.launch({headless: false,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ]});
        const page = await browser.newPage();
        await page.goto("https://lms.ucm.cl/login/index.php");
        await page.type("#username", rut);
        await page.type("#password", pass);
        await page.click("#loginbtn");
        console.log("Llego aquí 1");
        await page.waitForSelector("[data-region='paging-control-container']");
        console.log("Llego aquí 2");
        await page.evaluate(() => {
          const inProgress: any = document.querySelector("div.d-flex.align-items-center.flex-wrap > div.dropdown.mb-1.mr-auto > ul > li:nth-child(4) > a");
          const cardView: any = document.querySelector("div.d-flex.align-items-center.flex-wrap > div:nth-child(3) > ul > li:nth-child(1) > a");
          inProgress.click();
          cardView.click();
        });
        console.log("Llego aquí 3");
        const pagesURL = await page.evaluate(async () => {
          const delay = (timeout: any) => {
            return new Promise((resolve) => {
              setTimeout(resolve, timeout);
            });
          };
          await delay(1500);
          const cards = document.getElementsByClassName("card dashboard-card");
          return Array.from(cards, (x: any) => x.getElementsByTagName("a")[0].href);
        });
        const info: any[] = [];
        for (const pageURL of pagesURL) {
          const subPage = await browser.newPage();
          const data = await navigatePage(subPage, pageURL);
          info.push(data);
        }
        setTimeout(() => {
          res.json({
            links: info,
          });
        }, 2000);
      } catch (e: any) {
        console.log("error", e.message);
        res.send("false");
      }
    });

export const getCalificationsLMS = functions
    .https.onRequest( async ( req: any, res: any) => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({
            error: "Not allowed",
          });
        }
        const rut = config.rut;
        const pass = config.password;
        const browser = await puppeteer.launch({headless: false,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ]});
        const page = await browser.newPage();
        await page.goto("https://sapprd.ucm.cl/sap/bc/ui2/flp");
        await page.type("#USERNAME_FIELD-inner", rut);
        await page.type("#PASSWORD_FIELD-inner", pass);
        await page.click("#LOGIN_LINK");
        await page.waitForNavigation({
          waitUntil: "networkidle0",
        });
        await page.goto("https://sapprd.ucm.cl/sap/bc/ui2/flp?sap-client=300&sap-language=ES#CompetencyEvidence-display");
        await page.waitForSelector("#__xmlview2--myResProgType-text");
        const dataF = await page.evaluate( () => {
          const page0: any = document.getElementsByClassName("sapMLIB sapMLIB-CTX sapMLIBShowSeparator sapMLIBTypeNavigation sapMListTblRow");
          const ramos: any = Array.from(page0, (data: any) => Array.from(data.getElementsByTagName("td"), (pedrito: any) => pedrito.innerText));
          const datafinal: any = ramos.map((x: any) => ({
            ano: x[1],
            semestre: x[2],
            nombre: x[3],
            promedio: parseFloat(x[4].replace(",", ".")),
            creditos: Number(x[5]),
            estado: x[6],
          }));
          return datafinal;
        });
        /* https://sapprd.ucm.cl/sap/bc/ui2/flp?sap-client=300&sap-language=ES#CompetencyEvidence-display */


        setTimeout(() => {
          res.json({
            notas: dataF,
          });
        }, 2000);
      } catch (e: any) {
        console.log("error", e.message);
        res.send("false");
      }
    });


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
