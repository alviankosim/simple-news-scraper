// 119203001 - Mochammad Alvian Kosim
const axios      = require("axios");
const cheerio    = require("cheerio");
const fs         = require('fs');
const { uagent } = require("./utils/ua");

// Topic List
const topicList = ['sejahtera','news','lists','quizzes','polls','videos','inbox','sent','drafts','junk','trash','advertisement','other','maju','berbudaya','pemerintahan','photo','pembangunan','ekonomi','kesra']
const selectedTopic = topicList[0];

const limitPage = 10;
const minDataFetched = 100; // making sure this minimum data length fetched

const newsIdentifierData = {
    list_class      : 'body > div.container > div > div.col-12.col-sm-8 > div[class="row"]',
    img_class       : 'img',
    title_class     : 'h5.fw-bold',
    detail_class    : 'p.text-secondary',
    url_class       : 'div.col-8 > a',
    publish_class   : 'h6.text-secondary',
    total_page_class: 'div.container > div > div.col-12.col-sm-8 > ul > li:nth-last-child(2)'
};

const scrapePage = async (url) => {
    const { data } = await axios.get(url, { headers: uagent[Math.floor(Math.random() * uagent.length)] });
    return data;
}

const extractNewsList = ($, arrNews) => {

    // Select all the list items
    const listItems = $(`${newsIdentifierData.list_class}`);

    listItems.each((idx, el) => {
        // console.log(idx);
        const title         = $(el).find(`${newsIdentifierData.title_class}`).text()?.trim().replace(/\s\s+/g, ' ');
        const imageUrl      = $(el).find(`${newsIdentifierData.img_class}`).attr('src')?.trim().replace(/\s\s+/g, ' ');
        const summary       = $(el).find(`${newsIdentifierData.detail_class}`).text()?.trim().replace(/\s\s+/g, ' ');
        const publishedDate = $(el).find(`${newsIdentifierData.publish_class}`).text()?.trim().replace(/\s\s+/g, ' ');
        const articleURL    = $(el).find(`${newsIdentifierData.url_class}`).attr('href')?.trim().replace(/\s\s+/g, ' ');

        arrNews.push({
            title,
            imageUrl,
            summary,
            publishedDate: new Date(`${publishedDate.split(',')[1].trim()} ${publishedDate.split(',')[2].replace('WIB', '').trim()}`),
            articleURL
        });
    });
}

const save2File = async (data) => {
    const currDatetime = (new Date(Date.now()-(new Date()).getTimezoneOffset() * 60000))
        .toISOString().slice(0, 19).replace(/[^0-9]/g, "");

    fs.writeFile(`fetched/news - ${currDatetime}.json`, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('%Error occured when writing to file', 'color: red', err);
            return;
        }
        console.log('%cSuccessfully written data to file', 'color: green');
    });
}

const init = async () => {
    try {
        let page = 1;
        let fetching = true;
        let totalPageToFetch = limitPage;

        const newsList = [];

        while (fetching) {
            const url = `https://berita.depok.go.id/kategori/daftar/${selectedTopic}?page=${page}`;

            // Scrape the page
            const scrapedData = await scrapePage(url);

            // Load HTML we fetched in the previous line
            const $ = cheerio.load(scrapedData);
            console.log('%cFetching page: ', 'color: yellow', page);
            if (page === 1) {
                const maxPage = parseInt($('body').find(`${newsIdentifierData.total_page_class}`).text());
                totalPageToFetch = limitPage <= maxPage ? limitPage : maxPage;
            }

            // Extract the news list
            extractNewsList($, newsList);

            if (page === totalPageToFetch) {
                fetching = false;
            }

            if (!fetching && newsList.length < minDataFetched) {
                fetching = true;
                totalPageToFetch++;
                console.log('%cPage extended to: ', 'color: orange', page + 1);
            }

            page++;
            await new Promise(r => setTimeout(r, Math.floor((Math.random() * 2000) + 1000))); // sleep randomly 1-2s
        }

        console.log('%cSuccessfully fetched data: ', 'color: green', newsList.length);

        // save to json file
        await save2File(newsList);

    } catch (error) {
        console.log('%cSomething is error', 'color: red', error);
    }
}

init();