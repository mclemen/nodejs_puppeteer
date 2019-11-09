const puppeteer = require('puppeteer');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;

let url = 'https://news.yahoo.co.jp/categories/sports'; // sample url

(async () => {
    

    const mongourl = 'mongodb://192.168.1.4/'; // sample mongodb server
    const dbName = 'japansports'; // sample dbname

    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: "networkidle2", timeout: 0});
    await page.waitFor(8000);
    await page.click('a.newsFeed_item_link');
    await page.waitFor(8000);

        //scrape all the details
        let result = await page.evaluate(() => {
            let title = document.querySelector('div[class=hd] > h1').innerText;
            let source = document.querySelector('.source').innerText;
            let article = document.querySelector('.paragraph').innerText;
            let excerpt = document.querySelector('.photoOffer').innerText;
            let img = document.querySelector('#ym_newsarticle > div.articleMain > div.paragraph > div > div > div > a > div > img').getAttribute('src');
            return {
                title,
                source,
                article,
                excerpt,
                img
            }
         });

        console.dir(result);

        //create unique key so data will not be duplicated
        const uniqueIndex = (collection, callback) => {
            collection.createIndex({title:1}, {unique:true}, (err, result) => {
                if(err) {console.error(`Failed to create index ${err}`); process.exit(1);}
                console.log(`Unique Index created successfully: ${result}`)
                callback(result)
            })
        }

        //insert data to mongodb
        const insertData= (collection, callback) => {
            collection.insertOne(result, (err, result) => {
                if (err) {
                    console.error(`Error in insertion: ${err}`)
                    process.exit(1)
                }
                console.log(`No of records (result.result.n): ${result.result.n}`)
                console.log(`No of records (result.ops.length): ${result.ops.length}`)
                callback(result)
            })
        }

        //mongodb connection 
        MongoClient.connect(mongourl, {  useUnifiedTopology: true }, (error, client) => {
            if(error) {
                return console.log('Unable to connect...')
            }

            const db = client.db(dbName)
            const collection = db.collection('articles') //mongodb collections
            insertData(collection, () => {
                uniqueIndex(collection, () => {
                    client.close()
                    console.log('Connection closed')
                })
            })        
            
        })

        await browser.close();
})();
