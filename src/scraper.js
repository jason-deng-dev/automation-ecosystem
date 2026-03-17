
// to navigate pages simply add ?command=page&pageIndex={pageIndex} to URL
const URL = `https://runjapan.jp/entry/runtes/smp/racesearchdetail.do`

// scrape runjapan.jp until we populate with #count races
async function populateraces(limit){
    const races = []
    let pageIndex = 1;

    while (races.length < limit) {
        /*
        res = fetch URL + ?command=page&pageIndex={pageIndex}
        if res contains zero race cards => break

        for each race card on page:
            fetch detail page information
            extract info:
            push to races[]
            if race.length === limit => stop
        pageIndex++
        */
    }
}