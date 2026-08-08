let chartOffset = 1;
let username = 'happle5222'

async function getWeeklyCharts() {
  const apiKey = 'd84c9b2caa4ff06ef2c35d5ba07f7f02';

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user=${username}&api_key=${apiKey}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function getWeeklyAlbumChart(from,to) {
  const apiKey = 'd84c9b2caa4ff06ef2c35d5ba07f7f02';

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getWeeklyAlbumChart&user=${username}&api_key=${apiKey}&from=${from}&to=${to}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

async function getAllTimeTopAlbums() {
  const apiKey = 'd84c9b2caa4ff06ef2c35d5ba07f7f02';

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getTopAlbums&user=${username}&api_key=${apiKey}&limit=500&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}

const coverCache = JSON.parse(localStorage.getItem("coverCache") || "{}");

async function getWikipediaCover(artist, album) {
  const key = `${artist}::${album}`;

  if (key in coverCache) {
    return coverCache[key];
  }
  
  const search = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(
      `${artist} ${album} album`
    )}&format=json`
  ).then(r => r.json());

  const page = search.query.search[0];
  if (!page) return null;

  const wiki = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=parse&page=${encodeURIComponent(
      page.title
    )}&prop=wikitext&format=json`
  ).then(r => r.json());

  const text = wiki.parse?.wikitext?.["*"];
  if (!text) return null;

  const match = text.match(/^\|\s*cover\s*=\s*(.+)$/im);
  if (!match) return null;

  const filename = match[1]
    .split("|")[0]       // remove any formatting/template args
    .replace(/\[\[|\]\]/g, "")
    .trim();

  const image = await fetch(
    `https://en.wikipedia.org/w/api.php?origin=*&action=query&titles=${encodeURIComponent(
      `File:${filename.replace(/^File:/i, "")}`
    )}&prop=imageinfo&iiprop=url&format=json`
  ).then(r => r.json());

  const file = Object.values(image.query.pages)[0];
  const result = file.imageinfo?.[0]?.url ?? null;

  coverCache[key] = result;
  localStorage.setItem("coverCache", JSON.stringify(coverCache));

  return result;
}

async function main() {
  let weeklyCharts = await getWeeklyCharts();
  let mostRecentPeriod = weeklyCharts.weeklychartlist.chart[weeklyCharts.weeklychartlist.chart.length-chartOffset];
  let from = mostRecentPeriod.from;
  let to = mostRecentPeriod.to;
  let topAlbums = await getWeeklyAlbumChart(from,to);
  let priorWeek = weeklyCharts.weeklychartlist.chart[weeklyCharts.weeklychartlist.chart.length - chartOffset-1];
  let priorFrom = priorWeek.from;
  let priorTo = priorWeek.to;
  let priorTopAlbums = await getWeeklyAlbumChart(priorFrom,priorTo);
  let allTimeTopAlbums = await getAllTimeTopAlbums();

  const template = document.getElementById("chart-entry-template");
  document.getElementById("top-text").textContent = "Week of " + new Date(parseInt(to,10)*1000).toLocaleDateString('en-US');
  
  for (let i=1; i<21; i++) {

    const entry = template.content.cloneNode(true);
    const img = entry.querySelector(".albumImage");
    entry.querySelector(".rankText").textContent = i;

    // console.log(new Date(parseInt(from,10)*1000).toLocaleDateString('en-US'));
    // console.log(new Date(parseInt(to,10)*1000).toLocaleDateString('en-US'));

    let selectedAlbum = topAlbums.weeklyalbumchart.album[i-1].name;
    let selectedArtist = topAlbums.weeklyalbumchart.album[i-1].artist["#text"];
    let selectedPlays = topAlbums.weeklyalbumchart.album[i-1].playcount;
    entry.querySelector(".songInfoText").innerHTML = "<b>" + selectedAlbum + "</b>" + "<br>" + selectedArtist;
    getWikipediaCover(selectedArtist, selectedAlbum).then(cover => { img.src = cover; });

    let foundAlbum = priorTopAlbums.weeklyalbumchart.album.find(album =>
      album.name === selectedAlbum &&
      album.artist["#text"] === selectedArtist
    );
    if (foundAlbum) {
      let previousWeekRank = parseInt(foundAlbum["@attr"].rank,10);
      let upOrDown = i < previousWeekRank ? "▲ " : "▼ ";
      if (i-previousWeekRank == 0) {
        entry.querySelector(".containerDiv").innerHTML = '<div class="movementArrow">▶</div>';
        if (i==1) {
          let weeksAt1 = 2;
          // Count consecutive weeks at #1
          for (let j = chartOffset + 2; j <= weeklyCharts.weeklychartlist.chart.length; j++) {
            const olderWeek = weeklyCharts.weeklychartlist.chart[weeklyCharts.weeklychartlist.chart.length - j];
            if (!olderWeek) break;
          
            const olderChart = await getWeeklyAlbumChart(olderWeek.from, olderWeek.to);
          
            const numberOne = olderChart.weeklyalbumchart.album[0];
          
            if (
              numberOne.name === selectedAlbum &&
              numberOne.artist["#text"] === selectedArtist
            ) {
              weeksAt1++;
            } else {
              break;
            }
          }
          entry.querySelector(".songInfoText").insertAdjacentHTML('afterend','<div style="margin-left:auto;align-content:center;"><div style="background: #2e5ec7;color: white;border-radius: 3px;padding: 3px;font-size: 125%;"><b>' + weeksAt1 + ' WEEKS @ #1</b></div></div>');
        }
      } else {
        entry.querySelector(".containerDiv").innerHTML = '<div class="movementArrow">' + upOrDown + '</div><br><div class="numberChange"><b>' +String(Math.abs(i-previousWeekRank)) + '</b></div>';
      }
    } else {
      console.log("allTimeTopAlbums:", allTimeTopAlbums);
      console.log("albums:", allTimeTopAlbums?.topalbums?.album);
      console.log("selectedAlbum:", selectedAlbum);
      console.log("selectedArtist:", selectedArtist);
      let isReentry = allTimeTopAlbums.topalbums.album.some(album =>
        album.name === selectedAlbum &&
        album.artist["#text"] === selectedArtist
      );
      let newBoxHTML = isReentry ? '<div class="newBox" style="font-size:90%;">RE-ENTRY</div>' : '<div class="newBox">NEW</div>';
      entry.querySelector(".containerDiv").innerHTML = newBoxHTML;
    }

    entry.querySelector(".playCount").innerHTML = "<b>" + selectedPlays + " plays</b>"
    
    document.getElementById("chartEntries").appendChild(entry);
  }
}

main()
const lastWeekButton = document.getElementById("lastWeekButton");
const nextWeekButton = document.getElementById("nextWeekButton");

lastWeekButton.addEventListener('click', function() {
  chartOffset += 1;
  document.getElementById("chartEntries").replaceChildren();
  main()
});

nextWeekButton.addEventListener('click', function() {
  if (chartOffset > 1) {
    chartOffset -= 1;
    document.getElementById("chartEntries").replaceChildren();
    main()
  }
});

const input = document.getElementById("usernameInput");
input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); 
      username = input.value;
    }
});
