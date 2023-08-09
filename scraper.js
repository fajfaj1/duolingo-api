import puppeteer from 'puppeteer';
import { resolve } from 'path';
import chalk from 'chalk';

export default async function scraper() {

    // Launch the browser and open
    console.log('Launching a browser...')
    const browser = await puppeteer.launch({ headless: 'new' });

    // // Open a new page
    // console.log('Opening a new page...')
    // const page = await browser.newPage();

    // Function to fetch profile with provided username
    // Returns two methods: takeProfileScreenshot and getProfileData
    // fetchProfile('6hodii9').then((profile) => { profile.getProfileData().then((data) => console.log(data)) })
    // ['fafaj69'].forEach(async username => {
    //     await fetchProfile(username).then((profile) => { profile.takeProfileScreenshot(username) })
    // })
    
    async function fetchProfile(username, optimize) {

        // Open a new page
        console.log('Opening a new page...')
        const page = await browser.newPage();

        const startTime = Date.now();

        // Optimizations
        if(optimize !== false) {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                
                const blockedTypes = ['image', 'media']
                const isBlacklisted = blockedTypes.includes(req.resourceType());
                const isBlocked = req.url().includes('analytics');

                if (isBlacklisted || isBlocked) {
                    console.log(`${chalk.bgRed('  ✖  ')} ${req.resourceType()} — ${chalk.gray(req.url())} `)
                req.abort();
                } else {
                    console.log(`${chalk.bgGreen('  ✔  ')} ${req.resourceType()} — ${chalk.gray(req.url())}`)
                req.continue();
                }
            });
        }

        // Navigate the page to a URL
        const rawDuolingoProfileUrl = `https://www.duolingo.com/profile/${username}`;
        const duolingoProfileUrl = encodeURI(rawDuolingoProfileUrl);
        console.log(`Navigating to ${duolingoProfileUrl}...`)
        await page.goto(duolingoProfileUrl, { waitUntil: 'networkidle2' });

        // Set screen size
        console.log('Setting screen size...')
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(chalk.inverse(`Loading took ${Date.now() - startTime}ms!`))

        // async function takeProfileScreenshot(filename) {
        //     console.log('Taking a screenshot...')
        //     setTimeout(() => {page.screenshot({ path: `./profiles/${filename}.png`, type: "png" }); console.log('Took a screenshot...')})
        // }
        async function takeProfileScreenshot(filename) {
            // Close cookies popup
            console.log('Closing cookies popup...')
            const cookiesConfirmButton = await page.waitForSelector('#onetrust-accept-btn-handler', { visible: true });
            await cookiesConfirmButton.click();
            await cookiesConfirmButton.dispose();
            
            console.log('Taking a screenshot...')

            // Find the profile element
            const profileElement = await page.waitForSelector('._25dpq')

            // Give it some padding (can be done with css file too)
            await page.addStyleTag({ content: `._25dpq { padding: 20px; }` })

            // Craft a path
            const path = `./profiles/${filename}.png`

            // Take a screenshot
            await profileElement.screenshot({ path: path, type: "png" });

            console.log(`Screenshot saved to ${path}`)
            console.log(`${chalk.inverse(' 📸  ')} Screenshot has been taken`)
            return resolve(path);
        }

        async function getProfileData() {
            console.log('Getting profile data...')

            const dataSelectors = {
                username: '._15qam',
                displayname: '._1cHvI > span:first-child',
                joinDate: '._2Ce44',

                streak: ['._3gX7q', 0],
                totalXp: ['._3gX7q', 1],
                League: ['._3gX7q', 2],
                top3: ['._3gX7q', 3],
                LeagueWeek: '._1t0Cw'
            }

            const profileData = {}

            return new Promise((resolve, reject) => {
                // Get username, displayname, joindate, and go deeper for the stats
                const firstLevel = Object.keys(dataSelectors)
                firstLevel.forEach(async (key, index) => {
                    const value = dataSelectors[key]

                    // It fill the stats object with data
                    async function findElement(key, val) {
                        let foundElement

                        if (typeof val === 'string') {

                            // Find the element with simple selector
                            // console.log(`Key: ${key}, with value: ${val}, will be found with simple selector`)

                            // QuerySelector
                            foundElement = await page.$(val)

                        } else if (val instanceof Array) {

                            // Find the element with querySelectorAll, honouring the index
                            // console.log(`Key: ${key}, with value: ${val}, will be found with querySelectorAll`)

                            // Split the value to selector and index
                            const [selector, index] = val
                            // QuerySelectorAll
                            const foundElements = await page.$$(selector)
                            foundElement = foundElements[index]

                        }

                        try {
                            const finalValue = await foundElement.evaluate(el => el.textContent)
                            console.log(`${key}: ${finalValue}`)
                            return finalValue
                        } catch (error) {
                            console.log(`Error: ${error}`)
                            return 'undefined'
                        }
                        

                    }

                    profileData[key] = await findElement(key, value)

                    // Resolve if it was the last one
                    if(Object.keys(profileData).length === firstLevel.length) {
                        console.log(`Resolving`)
                        resolve(profileData)
                    }

                })

                
            }
            )


        }

        return {
            takeProfileScreenshot,
            getProfileData
        }

    }

    return {
        fetchProfile
    }
};